import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { QuittungAbgegebenEvent } from '@domain/eigenschutz/events/quittung-abgegeben.event';
import { EINSATZ_EVENT_PUBLISHER, LOGGER } from '@infrastructure/di-tokens';
import type { IEinsatzEventPublisher } from '@infrastructure/websocket/events/einsatz-event.types';
import { redactId } from '@/shared/utils/pii-redact.util';

/**
 * Infrastructure-Adapter für `eigenschutz.quittung_abgegeben` (Story 3.4 AC5).
 *
 * **Verhalten:**
 * 1. Strukturierter Log mit PII-Redaction (`redactId` für einsatzId/einheitId/userId).
 * 2. WebSocket-Broadcast an Room `einsatz:{einsatzId}` über Channel
 *    `eigenschutz:psa-quittung-abgegeben`. Empfänger:
 *    - Sender-View invalidiert die `psaQuittungen`- und
 *      `offenePsaBekanntgaben`-Query-Caches → Counter aktualisiert sich
 *      live (REST-Refetch ist authoritative).
 *
 * **Resilienz:** Broadcast-Fehler werden geloggt, nicht durchgereicht — das
 * Outbox-Event ist die Wahrheit, der Broadcast ist Best-Effort-Live-Push.
 *
 * **Payload-Diät / PII (Architektur §B5 Bandbreiten-Hygiene):** `userId`
 * wird ausschließlich als `userIdHash` (über `redactId`) übertragen.
 * Klartext-`quittiertVonUserName` lädt der Sender-View per REST-Refetch
 * (`useEigenschutzPsaQuittungen`).
 */
@Injectable()
export class EigenschutzQuittungAbgegebenEventAdapter {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(EINSATZ_EVENT_PUBLISHER) private readonly publisher: IEinsatzEventPublisher,
  ) {}

  @OnEvent(QuittungAbgegebenEvent.eventName())
  async onQuittungAbgegeben(event: QuittungAbgegebenEvent): Promise<void> {
    this.logger.log('Received QuittungAbgegebenEvent', {
      eventId: event.eventId,
      einsatzIdHash: redactId(event.einsatzId),
      einheitIdHash: redactId(event.einheitId),
      userIdHash: redactId(event.userId),
      propagationGroupId: event.propagationGroupId,
      quittiertAm: event.quittiertAm.toISOString(),
      eventName: QuittungAbgegebenEvent.eventName(),
    });

    try {
      await this.publisher.broadcast(event.einsatzId, 'eigenschutz:psa-quittung-abgegeben', {
        eventId: event.eventId,
        einsatzId: event.einsatzId,
        einheitId: event.einheitId,
        propagationGroupId: event.propagationGroupId,
        userIdHash: redactId(event.userId),
        quittiertAm: event.quittiertAm.toISOString(),
        occurredAt: event.occurredAt.toISOString(),
      });
    } catch (error) {
      this.logger.warn('PsaQuittungAbgegeben-Broadcast fehlgeschlagen — Outbox-Event bleibt unangetastet', {
        eventId: event.eventId,
        propagationGroupId: event.propagationGroupId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
