import { Inject, Injectable } from '@nestjs/common';
import webpush, { type WebPushError } from 'web-push';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IPushSubscriptionRepository } from '@domain/push-notifications/i-push-subscription.repository';
import type { PushPayload } from '@domain/push-notifications/push-payload';
import { LOGGER, PUSH_SUBSCRIPTION_REPOSITORY } from '@infrastructure/di-tokens';

const GONE_STATUS_CODES = new Set([404, 410]);

/**
 * VAPID aes128gcm erlaubt maximal ~4096 Byte Payload. Wir cappen etwas darunter,
 * um Headroom für Encoding-Overhead zu behalten.
 */
const MAX_PAYLOAD_BYTES = 4000;

/**
 * Default-Timeout für `webpush.sendNotification`. Schützt den Fan-Out vor
 * hängenden Push-Services, die ohne expliziten Timeout unbegrenzt blockieren.
 */
const PUSH_SEND_TIMEOUT_MS = 10_000;

/**
 * Fehler-Muster, die auf unbrauchbare VAPID-Keys in einer gespeicherten
 * Subscription hinweisen. Solche Subscriptions werden wie 410/404 aufgeräumt,
 * damit sie nicht dauerhaft jeden Send scheitern lassen.
 */
const INVALID_KEY_PATTERNS = [/invalid.*key/i, /invalid.*base64/i, /invalid.*p256/i, /decryption.*failed/i];

function isInvalidKeyError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (!message) return false;
  return INVALID_KEY_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Plattform-Push-Service (Story 1.1, ADR-011).
 *
 * Sendet Web-Push-Notifications an alle registrierten Geräte eines Users via
 * `web-push@^3`. VAPID-Konfiguration erfolgt in {@link PushNotificationsModule}
 * beim Boot (Fail-Fast, AC3). Dieser Service ist bewusst dünn: kein CQRS, kein
 * Outbox-Event. Spätere Eigenschutz-Stories (Epic 3) kapseln diesen Service in
 * einen Application-Port (`IPushNotificationService`) — in 1.1 reicht der
 * direkte Provider-Export aus dem Modul.
 *
 * Fehlerpfade (AC2):
 * - HTTP 410 Gone / 404 Not Found → Subscription ist abgelaufen und wird
 *   entfernt.
 * - WebPushError mit unbrauchbaren Keys ("invalid key", "invalid base64",
 *   "decryption failed") → Subscription wird entfernt, damit sie keine
 *   Dauerfehler produziert.
 * - Alle anderen Fehler (Timeout, 5xx) → Warn-Log, Subscription bleibt erhalten.
 *
 * **Fire-and-Forget-Semantik:** Der Rückgabetyp `Promise<void>` ist bewusst
 * gewählt. At-Least-Once-Zustellung (NFR-R3) wird über die Outbox des
 * aufrufenden `emit-critical-push.handler.ts` (Epic 3) sichergestellt; Client-
 * Dedup läuft per `eventId`-LRU. Der Service selbst entscheidet nicht über
 * Retry oder Caller-Feedback — er loggt strukturiert, und Prometheus-Metriken
 * (Story 7-9) hängen an den Log-Events.
 *
 * Logging (AC4):
 * - Es werden ausschließlich `userId`, `endpointHost` und `eventId`/`subscriptionId`
 *   geloggt. VAPID-Keys, `p256dh`, `auth` und der vollständige `endpoint`-Token
 *   werden nie an den Logger übergeben.
 */
@Injectable()
export class PushNotificationsService {
  constructor(
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: IPushSubscriptionRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Sendet `payload` an alle Subscriptions des Users. Fehlerhafte Endpoints
   * (410/404, unbrauchbare Keys) werden automatisch aus der Datenbank entfernt.
   *
   * Kein `Result`-Rückgabetyp — siehe Klassen-Doc ("Fire-and-Forget-Semantik").
   */
  async send(userId: string, payload: PushPayload): Promise<void> {
    let serialized: string;
    try {
      serialized = JSON.stringify(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Push-Payload konnte nicht serialisiert werden', {
        userId,
        eventId: payload.eventId,
        error: message,
      });
      return;
    }

    const payloadBytes = Buffer.byteLength(serialized, 'utf8');
    if (payloadBytes > MAX_PAYLOAD_BYTES) {
      this.logger.error('Push-Payload überschreitet die erlaubte Größe und wird nicht versendet', {
        userId,
        eventId: payload.eventId,
        payloadBytes,
        maxBytes: MAX_PAYLOAD_BYTES,
      });
      return;
    }

    const lookup = await this.subscriptions.findByUserId(userId);
    if (lookup.isFailure || !lookup.value) {
      this.logger.error('Push-Notification konnte Subscriptions nicht laden', {
        userId,
        eventId: payload.eventId,
        error: lookup.error,
      });
      return;
    }

    if (lookup.value.length === 0) {
      this.logger.debug('Keine Push-Subscriptions für User registriert', {
        userId,
        eventId: payload.eventId,
      });
      return;
    }

    await Promise.all(
      lookup.value.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            serialized,
            { timeout: PUSH_SEND_TIMEOUT_MS },
          );

          this.logger.log('Push-Notification versendet', {
            userId,
            subscriptionId: subscription.id,
            endpointHost: subscription.getEndpointHost(),
            eventId: payload.eventId,
          });
        } catch (error) {
          const statusCode = (error as WebPushError | undefined)?.statusCode;
          const isGone = statusCode !== undefined && GONE_STATUS_CODES.has(statusCode);
          const isPoisonKey = !isGone && isInvalidKeyError(error);

          if (isGone || isPoisonKey) {
            this.logger.warn('Push-Subscription wird aufgeräumt', {
              userId,
              subscriptionId: subscription.id,
              endpointHost: subscription.getEndpointHost(),
              statusCode,
              reason: isGone ? 'gone' : 'invalid-key',
              eventId: payload.eventId,
            });
            const deletion = await this.subscriptions.deleteById(subscription.id);
            if (deletion.isFailure) {
              this.logger.error('Aufräumen einer abgelaufenen Subscription fehlgeschlagen', {
                userId,
                subscriptionId: subscription.id,
                error: deletion.error,
              });
            }
            return;
          }

          const message = error instanceof Error ? error.message : String(error);
          this.logger.error('Push-Notification-Versand fehlgeschlagen', {
            userId,
            subscriptionId: subscription.id,
            endpointHost: subscription.getEndpointHost(),
            statusCode,
            eventId: payload.eventId,
            error: message,
          });
        }
      }),
    );
  }
}
