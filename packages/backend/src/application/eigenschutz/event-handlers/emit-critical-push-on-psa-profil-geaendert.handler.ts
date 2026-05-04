import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import type { IPushRecipientLookupPort } from '@domain/eigenschutz/repositories/i-push-recipient-lookup.port';
import type { IPushNotificationService } from '@domain/push-notifications/i-push-notification.service';
import type { PushPayload } from '@domain/push-notifications/push-payload';
import { LOGGER, PUSH_NOTIFICATION_SERVICE, PUSH_RECIPIENT_LOOKUP } from '@infrastructure/di-tokens';
import { redactId } from '@/shared/utils/pii-redact.util';
import { mapPsaProfilGeaendertToPushPayload } from './push-payload-mappers/psa-profil-geaendert.mapper';

/**
 * Bridge: PsaProfilGeaendertEvent → Plattform-Push-Service (Story 3.8, AR1, B7).
 *
 * Hängt sich via `@OnEvent` parallel zum WebSocket-Adapter ein. Server dedupt
 * NICHT (Architektur §B7) — Client-LRU (Story 1.2 `eventIdLru`) verhindert
 * Doppel-Banner. Bei Empfänger ohne Push-Subscription loggt der Push-Service
 * `debug` und sendet kein Frame; bei 410/404 wird die Subscription
 * automatisch aufgeräumt (Story 1.1 AC2).
 *
 * **Fehler-Resilienz:** Push-Versand ist Best-Effort. Lookup-, Mapping- oder
 * Sync-Throws werden geloggt; sie dürfen WEDER den WS-Broadcast blockieren
 * (läuft parallel im anderen `@OnEvent`-Handler) NOCH die Outbox-Row als
 * unverarbeitet markieren. Sowohl Lookup-Promise-Rejects als auch
 * Mapper-Throws werden im Handler abgefangen — keine Exception eskaliert
 * aus dem `@OnEvent`-Listener (sonst Outbox-Doppelversand-Risiko via
 * EventEmitter2 `unhandledRejection`). Das At-Least-Once-Versprechen für
 * die Push-Zustellung trägt die Outbox des aufrufenden Commands
 * (`ChangePsaProfil`): Bei Pod-Restart liest der Outbox-Dispatcher
 * `PsaProfilGeaendert` erneut und feuert beide `@OnEvent`-Handler (WS + Push)
 * erneut.
 *
 * **PII-Hygiene (Story 1.1 AC4 / Story 3.8 AC10):** Logs enthalten KEINE
 * Klar-User-IDs, KEINE Klar-`einsatzId`/`einheitId` — nur `redactId`-Hashes
 * und `recipientCount`-Aggregate. Einzel-Push-Logs (`subscriptionId`,
 * `endpointHost`) trägt der Push-Service selbst.
 */
@Injectable()
export class EmitCriticalPushOnPsaProfilGeaendertHandler {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(PUSH_RECIPIENT_LOOKUP) private readonly recipients: IPushRecipientLookupPort,
    @Inject(PUSH_NOTIFICATION_SERVICE) private readonly push: IPushNotificationService,
  ) {}

  @OnEvent(PsaProfilGeaendertEvent.eventName())
  async onPsaProfilGeaendert(event: PsaProfilGeaendertEvent): Promise<void> {
    const baseLogContext = {
      eventId: event.eventId,
      einsatzIdHash: redactId(event.einsatzId),
      einheitIdHash: redactId(event.einheitId),
    };

    let recipientUserIds: readonly string[];
    try {
      // PsaProfilGeaendertEvent-Constructor garantiert einheitId als Pflicht-Param;
      // Basisklasse `EigenschutzDomainEvent` typisiert es als `string | undefined`,
      // weshalb wir die Invariante hier explizit dokumentieren.
      const lookup = await this.recipients.listRecipientsForEinheit(event.einsatzId, event.einheitId!);
      if (lookup.isFailure) {
        this.logger.error('Push-Recipient-Lookup fehlgeschlagen — kein Fan-Out', {
          ...baseLogContext,
          zuweisungId: event.zuweisungId,
          propagationGroupId: event.propagationGroupId,
          error: typeof lookup.error === 'string' ? lookup.error : String(lookup.error),
        });
        return;
      }
      recipientUserIds = lookup.value ?? [];
    } catch (error) {
      this.logger.error('Push-Recipient-Lookup geworfen — kein Fan-Out', {
        ...baseLogContext,
        zuweisungId: event.zuweisungId,
        propagationGroupId: event.propagationGroupId,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    if (recipientUserIds.length === 0) {
      this.logger.debug('Keine Push-Empfänger für Einheit', baseLogContext);
      return;
    }

    let payload: PushPayload;
    try {
      payload = mapPsaProfilGeaendertToPushPayload(event);
    } catch (error) {
      this.logger.error('Push-Payload-Mapping fehlgeschlagen — kein Fan-Out', {
        ...baseLogContext,
        zuweisungId: event.zuweisungId,
        propagationGroupId: event.propagationGroupId,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    this.logger.log('Push-Fanout für PsaProfilGeaendertEvent gestartet', {
      eventId: event.eventId,
      recipientCount: recipientUserIds.length,
      aktion: event.aktion,
      profil: event.profil,
      propagationGroupId: event.propagationGroupId,
    });

    // Promise.allSettled: Fehler eines einzelnen Empfängers darf den Fan-Out
    // an die übrigen nicht abbrechen. Der Push-Service selbst loggt jeden
    // Fehler strukturiert (Story 1.1 AC4) — hier nur Aggregat-Log.
    // KEIN throw/reject zurück an den Outbox-Dispatcher: sonst würde die
    // Outbox-Row als unverarbeitet markiert und beide Subscriber (WS + Push)
    // erneut feuern (Doppel-Versand).
    const results = await Promise.allSettled(recipientUserIds.map((userId) => this.push.send(userId, payload)));

    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      this.logger.warn('Teilweise fehlgeschlagene Push-Zustellung', {
        eventId: event.eventId,
        recipientCount: recipientUserIds.length,
        failed,
      });
    }
  }
}
