import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { QuittungUeberfaelligEvent } from '@domain/eigenschutz/events/quittung-ueberfaellig.event';
import { EINSATZ_EVENT_PUBLISHER, LOGGER } from '@infrastructure/di-tokens';
import type { IEinsatzEventPublisher } from '@infrastructure/websocket/events/einsatz-event.types';
import { redactId } from '@/shared/utils/pii-redact.util';

/**
 * Infrastructure-Adapter für `eigenschutz.quittung_ueberfaellig` (Story 3.7).
 *
 * **Verhalten:**
 * 1. Strukturierter Log mit PII-Redaction für einsatzId/einheitId; Klartext
 *    für `propagationGroupId` (Cuid2, kein PII), `ueberfaelligSeitMin` numerisch.
 * 2. WebSocket-Broadcast an Room `einsatz:{einsatzId}` über Channel
 *    `eigenschutz:quittung-ueberfaellig`. Empfänger:
 *    - Empfänger-Hook (`useEigenschutzQuittungUeberfaelligLive`) ergänzt
 *      ein `Erneut`-Tag im `PsaProfilEmpfangBanner` bzw. revitalisiert einen
 *      dismissed Banner als synthetischen Reprompt (Story 3.7 AC7).
 *    - Einsatzleiter-Hook erzeugt einen `polite`-Mikro-Banner-Eintrag
 *      (`EinsatzleiterReprompEskalationBanner`, AC8).
 *
 * **Resilienz:** Broadcast-Fehler werden geloggt, nicht durchgereicht —
 * das Outbox-Event ist die Wahrheit, der Broadcast ist Best-Effort-Live-Push.
 *
 * **Payload-Diät (Architektur §B5):** Kein `userId`/`userIdHash` —
 * Auslöser ist `SYSTEM`. Ausschließlich IDs + Numerik im Frame.
 *
 * **Forward-Compat (Story 3.8):** Push-Notifications werden NICHT von diesem
 * Adapter ausgelöst. Story 3.8 registriert einen separaten `@OnEvent`-Handler
 * im Push-Service.
 */
@Injectable()
export class EigenschutzQuittungUeberfaelligEventAdapter {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(EINSATZ_EVENT_PUBLISHER) private readonly publisher: IEinsatzEventPublisher,
  ) {}

  @OnEvent(QuittungUeberfaelligEvent.eventName())
  async onQuittungUeberfaellig(event: QuittungUeberfaelligEvent): Promise<void> {
    this.logger.log('Received QuittungUeberfaelligEvent', {
      eventId: event.eventId,
      einsatzIdHash: redactId(event.einsatzId),
      einheitIdHash: redactId(event.einheitId ?? ''),
      propagationGroupId: event.propagationGroupId,
      originalEventId: event.originalEventId,
      ueberfaelligSeitMin: event.ueberfaelligSeitMin,
      occurredAt: event.occurredAt.toISOString(),
      eventName: QuittungUeberfaelligEvent.eventName(),
    });

    try {
      await this.publisher.broadcast(event.einsatzId, 'eigenschutz:quittung-ueberfaellig', {
        eventId: event.eventId,
        einsatzId: event.einsatzId,
        einheitId: event.einheitId,
        propagationGroupId: event.propagationGroupId,
        originalEventId: event.originalEventId,
        ueberfaelligSeitMin: event.ueberfaelligSeitMin,
        zuweisungId: event.zuweisungId,
        occurredAt: event.occurredAt.toISOString(),
      });
    } catch (error) {
      this.logger.warn('QuittungUeberfaellig-Broadcast fehlgeschlagen — Outbox-Event bleibt unangetastet', {
        eventId: event.eventId,
        propagationGroupId: event.propagationGroupId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
