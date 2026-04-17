/**
 * Infrastructure Adapter: broadcastet `GefahrenmatrixAktualisiertEvent` via
 * `IEinsatzEventPublisher` in den Einsatz-Room (`einsatz:{id}`).
 *
 * Dieser Adapter ist der **zweite Consumer** für das Matrix-Event — der
 * `GefahrenmatrixAktualisiertEtbEventAdapter` schreibt den ETB-Eintrag,
 * dieser hier triggert den WebSocket-Broadcast, der Frontend-Clients den
 * AKUT-Toast/Dialog (Split-View, G4) und die Matrix-Cache-Invalidierung
 * auslöst. Pattern übernommen von `GefahrenzoneEventAdapter` (Issue #627 G2).
 *
 * Fehlt der Publisher (Startup-Reihenfolge, Tests), loggt der Adapter nur.
 *
 * @module infrastructure/events/adapters
 */
import { Inject, Injectable, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EINSATZ_EVENT_PUBLISHER, LOGGER } from '@infrastructure/di-tokens';
import { EVENT_NAMES } from '@domain/events/event-names';
import type { GefahrenmatrixAktualisiertEvent } from '@domain/gefahr/events/gefahrenmatrix-aktualisiert.event';
import type { EinsatzEventName, IEinsatzEventPublisher } from '@infrastructure/websocket/events/einsatz-event.types';

@Injectable()
export class GefahrenmatrixAktualisiertBroadcastAdapter {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Optional() @Inject(EINSATZ_EVENT_PUBLISHER) private readonly publisher?: IEinsatzEventPublisher,
  ) {}

  @OnEvent(EVENT_NAMES.GEFAHRENMATRIX.AKTUALISIERT)
  async onAktualisiert(event: GefahrenmatrixAktualisiertEvent): Promise<void> {
    await this.emit(event.einsatzId, 'gefahrenmatrix:aktualisiert', {
      einsatzId: event.einsatzId,
      gefahrentyp: event.gefahrentyp,
      schutzobjekt: event.schutzobjekt,
      warnstufe: event.warnstufe,
      aktualisiertVon: event.aktualisiertVon,
    });
  }

  private async emit(einsatzId: string, channel: EinsatzEventName, payload: Record<string, unknown>): Promise<void> {
    if (!this.publisher) {
      this.logger.log(
        `GefahrenmatrixAktualisiertBroadcastAdapter: kein Publisher verfügbar — Event "${channel}" (Einsatz ${einsatzId}) wird nur geloggt.`,
        'GefahrenmatrixAktualisiertBroadcastAdapter',
      );
      return;
    }
    try {
      await this.publisher.broadcast(einsatzId, channel, payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`GefahrenmatrixAktualisiertBroadcastAdapter.broadcast(${channel}) fehlgeschlagen: ${msg}`, 'GefahrenmatrixAktualisiertBroadcastAdapter');
    }
  }
}
