import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LueckeGemeldetEvent } from '@domain/eigenschutz/events/luecke-gemeldet.event';
import { EINSATZ_EVENT_PUBLISHER, LOGGER } from '@infrastructure/di-tokens';
import type { IEinsatzEventPublisher } from '@infrastructure/websocket/events/einsatz-event.types';
import { redactId } from '@/shared/utils/pii-redact.util';

/**
 * Infrastructure-Adapter für `eigenschutz.luecke_gemeldet` (Story 3.6 AC7).
 *
 * **Verhalten:**
 * 1. Strukturierter Log mit PII-Redaction (`redactId` für einsatzId/einheitId/userId)
 *    + `meldungLength` statt Klartext (Datenminimierung).
 * 2. WebSocket-Broadcast an Room `einsatz:{einsatzId}` über Channel
 *    `eigenschutz:luecke-gemeldet`. Empfänger:
 *    - Sender-Page (`useEigenschutzLueckeGemeldetLive`) invalidiert die
 *      `psaQuittungen`- und `offenePsaBekanntgaben`-Caches → der
 *      `lueckenCount`-Badge auf der `OffenePsaBekanntgabenSection` aktualisiert
 *      sich live; REST-Refetch lädt den Klartext der Meldung nach (PII-Diät).
 *
 * **Resilienz:** Broadcast-Fehler werden geloggt, nicht durchgereicht — das
 * Outbox-Event ist die Wahrheit, der Broadcast ist Best-Effort-Live-Push.
 *
 * **Payload-Diät / PII (Architektur §B5 Bandbreiten-Hygiene):** `userId`
 * wird ausschließlich als `userIdHash` (über `redactId`) übertragen. Die
 * `meldung` selbst wird **nicht** im Frame transportiert —
 * `meldungLength` reicht als Live-Indikator („eine Lücke wurde gemeldet");
 * den Volltext lädt der Sender per REST-Refetch.
 */
@Injectable()
export class EigenschutzLueckeGemeldetEventAdapter {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(EINSATZ_EVENT_PUBLISHER) private readonly publisher: IEinsatzEventPublisher,
  ) {}

  @OnEvent(LueckeGemeldetEvent.eventName())
  async onLueckeGemeldet(event: LueckeGemeldetEvent): Promise<void> {
    this.logger.log('Received LueckeGemeldetEvent', {
      eventId: event.eventId,
      einsatzIdHash: redactId(event.einsatzId),
      einheitIdHash: redactId(event.einheitId),
      userIdHash: redactId(event.userId),
      propagationGroupId: event.propagationGroupId,
      meldungLength: event.meldung.length,
      gemeldetAm: event.gemeldetAm.toISOString(),
      eventName: LueckeGemeldetEvent.eventName(),
    });

    try {
      await this.publisher.broadcast(event.einsatzId, 'eigenschutz:luecke-gemeldet', {
        eventId: event.eventId,
        einsatzId: event.einsatzId,
        einheitId: event.einheitId,
        propagationGroupId: event.propagationGroupId,
        userIdHash: redactId(event.userId),
        meldungLength: event.meldung.length,
        gemeldetAm: event.gemeldetAm.toISOString(),
        occurredAt: event.occurredAt.toISOString(),
      });
    } catch (error) {
      this.logger.warn('LueckeGemeldet-Broadcast fehlgeschlagen — Outbox-Event bleibt unangetastet', {
        eventId: event.eventId,
        propagationGroupId: event.propagationGroupId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
