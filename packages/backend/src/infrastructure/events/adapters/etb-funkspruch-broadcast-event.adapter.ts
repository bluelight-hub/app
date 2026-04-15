/**
 * Infrastructure Adapter: broadcastet ETB-Einträge mit Funkspruch-Kontext an den
 * Einsatz-Room. Hört auf `EintragAddedEvent` + `EintragKorrigiertEvent`.
 *
 * **Einschränkung (Task 12):** Da die aktuellen ETB-Events nur `etbId`, aber
 * keine `einsatzId` tragen, muss der Broadcast einen Repository-Lookup machen.
 * Der konkrete `IEinsatzEventPublisher` kommt in Task 18 (WebSocket-Gateway)
 * zusammen mit dem Einsatz-Resolver. Solange `@Optional()` injiziert nichts,
 * loggt der Adapter nur.
 *
 * @module infrastructure/events/adapters
 */
import { Inject, Injectable, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { EINSATZ_EVENT_PUBLISHER } from '@infrastructure/di-tokens';
import { EVENT_NAMES } from '@domain/events/event-names';
import type { EintragAddedEvent } from '@domain/events/eintrag-added.event';
import type { EintragKorrigiertEvent } from '@domain/events/eintrag-korrigiert.event';
import type { IEinsatzEventPublisher } from './funkkanal-event.adapter';

@Injectable()
export class EtbFunkspruchBroadcastAdapter {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Optional() @Inject(EINSATZ_EVENT_PUBLISHER) private readonly publisher?: IEinsatzEventPublisher,
  ) {}

  @OnEvent(EVENT_NAMES.ETB.EINTRAG_ADDED)
  async onEintragAdded(event: EintragAddedEvent): Promise<void> {
    // Nur Funksprüche werden broadcastet — Standard-Einträge gehen über den separaten ETB-Broadcast.
    if (event.kontext?.type !== 'funkspruch') {
      return;
    }
    await this.emit(event.etbId.value, 'etb:eintrag-erstellt', {
      etbId: event.etbId.value,
      eintragId: event.eintragId.value,
      sequenceNumber: event.sequenceNumber,
      text: event.text,
      kontext: event.kontext,
      ereignisZeitpunkt: event.ereignisZeitpunkt?.toISOString(),
      absender: event.absender ?? null,
      empfaenger: event.empfaenger ?? null,
      createdBy: event.createdBy.value,
    });
  }

  @OnEvent(EVENT_NAMES.ETB.EINTRAG_KORRIGIERT)
  async onEintragKorrigiert(event: EintragKorrigiertEvent): Promise<void> {
    await this.emit(event.etbId.value, 'etb:eintrag-korrigiert', {
      etbId: event.etbId.value,
      korrekturEintragId: event.korrekturEintragId.value,
      originalEintragId: event.originalEintragId.value,
      sequenceNumber: event.sequenceNumber,
      text: event.text,
      createdBy: event.createdBy.value,
    });
  }

  private async emit(etbId: string, channel: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.publisher) {
      this.logger.log(`EtbFunkspruchBroadcastAdapter: kein Publisher verfügbar — Event "${channel}" (ETB ${etbId}) wird nur geloggt.`, 'EtbFunkspruchBroadcastAdapter');
      return;
    }
    // HINWEIS: Der Publisher broadcastet pro Einsatz-Room; die Resolution
    // etbId → einsatzId erfolgt im Einsatz-Event-Gateway (Task 18). Hier
    // übergeben wir die etbId als Room-Schlüssel und verlassen uns darauf,
    // dass der Publisher das richtig routet (alternativ mapped das Gateway
    // etb:* → einsatz:* intern auf Basis seines Einsatz-Index).
    try {
      await this.publisher.broadcast(etbId, channel, payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`EtbFunkspruchBroadcastAdapter.broadcast(${channel}) fehlgeschlagen: ${msg}`, 'EtbFunkspruchBroadcastAdapter');
    }
  }
}
