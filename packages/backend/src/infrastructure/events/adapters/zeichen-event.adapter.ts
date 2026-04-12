/**
 * WebSocket Event Adapter für taktische Zeichen Domain Events.
 *
 * Issue #636: Bei Erstellen/Platzieren/Verschieben/Entfernen von taktischen Zeichen →
 * Broadcast an alle Clients im Einsatz-Room. Clients invalidieren ihren Query-Cache.
 *
 * **Fire-and-Forget Pattern:**
 * - Fehler werden geloggt, nicht propagiert
 * - WebSocket-Emission darf Domain-Flow nicht blockieren
 *
 * @module infrastructure/events/adapters
 */
import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ILogger } from '@domain/ports/i-logger.port';
import { ZeichenErstelltEvent } from '@domain/taktische-zeichen/events/zeichen-erstellt.event';
import { ZeichenPlatziertEvent } from '@domain/taktische-zeichen/events/zeichen-platziert.event';
import { ZeichenVerschobenEvent } from '@domain/taktische-zeichen/events/zeichen-verschoben.event';
import { ZeichenEntferntEvent } from '@domain/taktische-zeichen/events/zeichen-entfernt.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { LagekarteGateway } from '@/modules/lagekarte/gateways/lagekarte.gateway';

@Injectable()
export class ZeichenEventAdapter {
  constructor(
    private readonly gateway: LagekarteGateway,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Empfängt ZeichenErstelltEvent und benachrichtigt alle Clients im Einsatz-Room.
   */
  @OnEvent(ZeichenErstelltEvent.eventName())
  async onZeichenErstellt(event: ZeichenErstelltEvent): Promise<void> {
    this.logger.log(`Processing ZeichenErstellt for WebSocket: zeichenId=${event.zeichenId}, einsatzId=${event.einsatzId}`, 'ZeichenEventAdapter');

    // 50ms Delay für Race Condition Prevention (DB-Commit abwarten)
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      this.gateway.emitZeichenErstellt({
        zeichenId: event.zeichenId,
        einsatzId: event.einsatzId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit WebSocket event for ZeichenErstellt: zeichenId=${event.zeichenId}, error=${errorMessage}`, 'ZeichenEventAdapter');
    }
  }

  /**
   * Empfängt ZeichenPlatziertEvent und benachrichtigt alle Clients im Einsatz-Room.
   */
  @OnEvent(ZeichenPlatziertEvent.eventName())
  async onZeichenPlatziert(event: ZeichenPlatziertEvent): Promise<void> {
    this.logger.log(`Processing ZeichenPlatziert for WebSocket: zeichenId=${event.zeichenId}, lagekarteId=${event.lagekarteId}`, 'ZeichenEventAdapter');

    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      this.gateway.emitZeichenPlatziert({
        zeichenId: event.zeichenId,
        einsatzId: event.einsatzId,
        lagekarteId: event.lagekarteId,
        lat: event.lat,
        lng: event.lng,
        mgrs: event.mgrs,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit WebSocket event for ZeichenPlatziert: zeichenId=${event.zeichenId}, error=${errorMessage}`, 'ZeichenEventAdapter');
    }
  }

  /**
   * Empfängt ZeichenVerschobenEvent und benachrichtigt alle Clients im Einsatz-Room.
   */
  @OnEvent(ZeichenVerschobenEvent.eventName())
  async onZeichenVerschoben(event: ZeichenVerschobenEvent): Promise<void> {
    this.logger.log(`Processing ZeichenVerschoben for WebSocket: zeichenId=${event.zeichenId}, einsatzId=${event.einsatzId}`, 'ZeichenEventAdapter');

    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      this.gateway.emitZeichenVerschoben({
        zeichenId: event.zeichenId,
        einsatzId: event.einsatzId,
        lat: event.lat,
        lng: event.lng,
        mgrs: event.mgrs,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit WebSocket event for ZeichenVerschoben: zeichenId=${event.zeichenId}, error=${errorMessage}`, 'ZeichenEventAdapter');
    }
  }

  /**
   * Empfängt ZeichenEntferntEvent und benachrichtigt alle Clients im Einsatz-Room.
   */
  @OnEvent(ZeichenEntferntEvent.eventName())
  async onZeichenEntfernt(event: ZeichenEntferntEvent): Promise<void> {
    this.logger.log(`Processing ZeichenEntfernt for WebSocket: zeichenId=${event.zeichenId}, einsatzId=${event.einsatzId}`, 'ZeichenEventAdapter');

    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      this.gateway.emitZeichenEntfernt({
        zeichenId: event.zeichenId,
        einsatzId: event.einsatzId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit WebSocket event for ZeichenEntfernt: zeichenId=${event.zeichenId}, error=${errorMessage}`, 'ZeichenEventAdapter');
    }
  }
}
