/**
 * Infrastructure Adapter: empfängt Gefahrenzone Domain Events und leitet sie
 * an den `IEinsatzEventPublisher` weiter (WebSocket-Broadcast an den
 * Einsatz-Room `einsatz:{id}`).
 *
 * Vorbild: `FunkkanalEventAdapter` (Issue #407). Pattern: Domain-Event-Name
 * aus `EVENT_NAMES.GEFAHRENZONE.*` → WebSocket-Channel `gefahrenzone:<aktion>`.
 *
 * Solange der `EinsatzEventPublisher` noch nicht registriert ist, ist die
 * Injection optional — der Adapter loggt nur.
 *
 * @module infrastructure/events/adapters
 */
import { Inject, Injectable, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EINSATZ_EVENT_PUBLISHER, LOGGER } from '@infrastructure/di-tokens';
import { EVENT_NAMES } from '@domain/events/event-names';
import type { GefahrenzoneErstelltEvent } from '@domain/gefahr/events/gefahrenzone-erstellt.event';
import type { GefahrenzoneGeometryGeaendertEvent } from '@domain/gefahr/events/gefahrenzone-geometry-geaendert.event';
import type { GefahrenzoneGeloeschtEvent } from '@domain/gefahr/events/gefahrenzone-geloescht.event';
import type { EinsatzEventName, IEinsatzEventPublisher } from '@infrastructure/websocket/events/einsatz-event.types';

@Injectable()
export class GefahrenzoneEventAdapter {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Optional() @Inject(EINSATZ_EVENT_PUBLISHER) private readonly publisher?: IEinsatzEventPublisher,
  ) {}

  @OnEvent(EVENT_NAMES.GEFAHRENZONE.ERSTELLT)
  async onErstellt(event: GefahrenzoneErstelltEvent): Promise<void> {
    await this.emit(event.einsatzId, 'gefahrenzone:erstellt', {
      zoneId: event.zoneId,
      einsatzId: event.einsatzId,
      gefahrentyp: event.gefahrentyp,
      schutzobjekt: event.schutzobjekt,
      geometryType: event.geometryType,
      geometry: event.geometry,
      bezeichnung: event.bezeichnung,
      erstelltVon: event.erstelltVon,
    });
  }

  @OnEvent(EVENT_NAMES.GEFAHRENZONE.GEOMETRY_GEAENDERT)
  async onGeometryGeaendert(event: GefahrenzoneGeometryGeaendertEvent): Promise<void> {
    await this.emit(event.einsatzId, 'gefahrenzone:geometry-geaendert', {
      zoneId: event.zoneId,
      einsatzId: event.einsatzId,
      geometryType: event.geometryType,
      geometry: event.geometry,
      aktualisiertVon: event.aktualisiertVon,
    });
  }

  @OnEvent(EVENT_NAMES.GEFAHRENZONE.GELOESCHT)
  async onGeloescht(event: GefahrenzoneGeloeschtEvent): Promise<void> {
    await this.emit(event.einsatzId, 'gefahrenzone:geloescht', {
      zoneId: event.zoneId,
      einsatzId: event.einsatzId,
      geloeschtVon: event.geloeschtVon,
    });
  }

  private async emit(einsatzId: string, channel: EinsatzEventName, payload: Record<string, unknown>): Promise<void> {
    if (!this.publisher) {
      this.logger.log(`GefahrenzoneEventAdapter: kein Publisher verfügbar — Event "${channel}" (Einsatz ${einsatzId}) wird nur geloggt.`, 'GefahrenzoneEventAdapter');
      return;
    }
    try {
      await this.publisher.broadcast(einsatzId, channel, payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`GefahrenzoneEventAdapter.broadcast(${channel}) fehlgeschlagen: ${msg}`, 'GefahrenzoneEventAdapter');
    }
  }
}
