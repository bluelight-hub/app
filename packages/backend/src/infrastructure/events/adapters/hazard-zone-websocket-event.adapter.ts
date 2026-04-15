/**
 * WebSocket Event Adapter für HazardZone Domain Events (Issue #627).
 *
 * Broadcastet `hazardzone:erstellt`, `hazardzone:aktualisiert`,
 * `hazardzone:geloescht` an alle Clients im Einsatz-Lagekarte-Room.
 *
 * Zusätzlich reagiert der Adapter auf `gefahrenmatrix.aktualisiert` und
 * feuert `hazardzone:warnstufe-aktualisiert`, damit Clients die
 * Farbcodierung ihrer Zonen live anpassen (AC5 — bidirektionale Sync).
 *
 * @module infrastructure/events/adapters
 */
import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { HazardZoneCreatedEvent } from '@domain/hazard-zone/events/hazard-zone-created.event';
import { HazardZoneUpdatedEvent } from '@domain/hazard-zone/events/hazard-zone-updated.event';
import { HazardZoneDeletedEvent } from '@domain/hazard-zone/events/hazard-zone-deleted.event';
import { GefahrenmatrixAktualisiertEvent } from '@domain/gefahr/events/gefahrenmatrix-aktualisiert.event';
import { LagekarteGateway } from '@/modules/lagekarte/gateways/lagekarte.gateway';

@Injectable()
export class HazardZoneWebsocketEventAdapter {
  constructor(
    private readonly gateway: LagekarteGateway,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  @OnEvent(HazardZoneCreatedEvent.eventName())
  async onCreated(event: HazardZoneCreatedEvent): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      this.gateway.emitHazardZoneCreated({
        hazardZoneId: event.hazardZoneId,
        einsatzId: event.einsatzId,
        gefahrentyp: event.gefahrentyp,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`HazardZoneWebsocketEventAdapter.onCreated fehlgeschlagen (zone=${event.hazardZoneId}): ${msg}`, 'HazardZoneWebsocketEventAdapter');
    }
  }

  @OnEvent(HazardZoneUpdatedEvent.eventName())
  async onUpdated(event: HazardZoneUpdatedEvent): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      this.gateway.emitHazardZoneUpdated({
        hazardZoneId: event.hazardZoneId,
        einsatzId: event.einsatzId,
        gefahrentyp: event.gefahrentyp,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`HazardZoneWebsocketEventAdapter.onUpdated fehlgeschlagen (zone=${event.hazardZoneId}): ${msg}`, 'HazardZoneWebsocketEventAdapter');
    }
  }

  @OnEvent(HazardZoneDeletedEvent.eventName())
  async onDeleted(event: HazardZoneDeletedEvent): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      this.gateway.emitHazardZoneDeleted({
        hazardZoneId: event.hazardZoneId,
        einsatzId: event.einsatzId,
        gefahrentyp: event.gefahrentyp,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`HazardZoneWebsocketEventAdapter.onDeleted fehlgeschlagen (zone=${event.hazardZoneId}): ${msg}`, 'HazardZoneWebsocketEventAdapter');
    }
  }

  /**
   * Änderungen in der Gefahrenmatrix beeinflussen die max. Warnstufe aller
   * Zonen desselben Gefahrentyps — feuere ein Event an die Clients (AC5).
   */
  @OnEvent(GefahrenmatrixAktualisiertEvent.eventName())
  async onGefahrenmatrixAktualisiert(event: GefahrenmatrixAktualisiertEvent): Promise<void> {
    try {
      this.gateway.emitHazardZoneWarnstufeChanged({
        einsatzId: event.einsatzId,
        gefahrentyp: event.gefahrentyp,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`HazardZoneWebsocketEventAdapter.onGefahrenmatrixAktualisiert fehlgeschlagen: ${msg}`, 'HazardZoneWebsocketEventAdapter');
    }
  }
}
