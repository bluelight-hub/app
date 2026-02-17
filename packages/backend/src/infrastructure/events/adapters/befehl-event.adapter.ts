/**
 * WebSocket Event Adapter fuer Befehl Domain Events.
 *
 * **Story 1.3 AC3:** Erweitert den Placeholder Adapter mit WebSocket-Integration.
 * - Empfaengt Befehl Domain Events via @OnEvent
 * - Konvertiert Domain Events in WebSocket Events
 * - Emittiert Events via BefehlGateway an verbundene Clients
 *
 * **Fire-and-Forget Pattern:**
 * - Fehler werden geloggt, nicht propagiert
 * - WebSocket-Emission darf Domain-Flow nicht blockieren
 *
 * **50ms Delay (Race Condition Prevention):**
 * - OutboxEventPublisher emittiert Events innerhalb der Transaction
 * - WebSocket-Clients koennten DB vor Commit abfragen
 * - 50ms Delay stellt sicher dass DB-Commit abgeschlossen ist
 *
 * @module infrastructure/events/adapters
 */
import { Inject, Injectable, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ILogger } from '@domain/ports/i-logger.port';
import { BefehlErstelltEvent } from '@domain/events/befehl-erstellt.event';
import { BefehlZugestelltEvent } from '@domain/events/befehl-zugestellt.event';
import { BefehlStatusGeaendertEvent } from '@domain/events/befehl-status-geaendert.event';
import { BefehlKommentarHinzugefuegtEvent } from '@domain/events/befehl-kommentar-hinzugefuegt.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { BefehlGateway } from '@/modules/befehl/gateways/befehl.gateway';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class BefehlEventAdapter {
  constructor(
    @Optional() private readonly gateway: BefehlGateway | undefined,
    @Inject(LOGGER) private readonly logger: ILogger,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Empfaengt BefehlErstelltEvent und emittiert WebSocket Event.
   *
   * **Event Flow:**
   * 1. OutboxEventPublisher emittiert 'befehl.erstellt' Event
   * 2. NestJS EventEmitter ruft diese Methode auf (via @OnEvent)
   * 3. Diese Methode laedt zusaetzliche Daten aus DB und emittiert WebSocket Event
   *
   * @param event - Das empfangene Domain Event
   */
  @OnEvent(BefehlErstelltEvent.eventName())
  async onBefehlErstellt(event: BefehlErstelltEvent): Promise<void> {
    this.logger.log(`Processing BefehlErstellt for WebSocket: befehlId=${event.befehlId.value}, einsatzId=${event.einsatzId.value}, nummer=${event.nummer}`, 'BefehlEventAdapter');

    if (!this.gateway) {
      this.logger.error('BefehlGateway not available - WebSocket event will not be emitted. Check module configuration and ensure BefehlGateway is properly registered.', 'BefehlEventAdapter');
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const befehl = await this.prisma.befehl.findUnique({
        where: { id: event.befehlId.value },
        select: { befehlsgeberId: true, erstellerId: true, status: true, erteiltAm: true },
      });

      if (!befehl) {
        this.logger.error(`Befehl not found for WebSocket event: befehlId=${event.befehlId.value}`, 'BefehlEventAdapter');
        return;
      }

      this.gateway.emitBefehlErstellt({
        befehlId: event.befehlId.value,
        einsatzId: event.einsatzId.value,
        nummer: event.nummer,
        auftrag: event.auftrag,
        befehlsgeberId: befehl.befehlsgeberId,
        erstellerId: befehl.erstellerId,
        empfaengerIds: event.empfaengerIds,
        status: befehl.status,
        erteiltAm: befehl.erteiltAm.toISOString(),
      });

      this.logger.log(`WebSocket event emitted for BefehlErstellt: befehlId=${event.befehlId.value}`, 'BefehlEventAdapter');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit WebSocket event for BefehlErstellt: befehlId=${event.befehlId.value}, error=${errorMessage}`, 'BefehlEventAdapter');
    }
  }

  /**
   * Empfaengt BefehlZugestelltEvent und emittiert WebSocket Event.
   *
   * DB-Lookup fuer einsatzId, da das Domain Event diese nicht enthaelt.
   *
   * @param event - Das empfangene Domain Event
   */
  @OnEvent(BefehlZugestelltEvent.eventName())
  async onBefehlZugestellt(event: BefehlZugestelltEvent): Promise<void> {
    this.logger.log(`Processing BefehlZugestellt for WebSocket: befehlId=${event.befehlId.value}, empfaengerId=${event.empfaengerId}`, 'BefehlEventAdapter');

    if (!this.gateway) {
      this.logger.error('BefehlGateway not available - WebSocket event will not be emitted. Check module configuration and ensure BefehlGateway is properly registered.', 'BefehlEventAdapter');
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const befehl = await this.prisma.befehl.findUnique({
        where: { id: event.befehlId.value },
        select: { einsatzId: true },
      });

      if (!befehl) {
        this.logger.error(`Befehl not found for WebSocket event: befehlId=${event.befehlId.value}`, 'BefehlEventAdapter');
        return;
      }

      this.gateway.emitBefehlZugestellt({
        befehlId: event.befehlId.value,
        einsatzId: befehl.einsatzId,
        empfaengerId: event.empfaengerId,
        zugestelltAm: event.zugestelltAm.toISOString(),
      });

      this.logger.log(`WebSocket event emitted for BefehlZugestellt: befehlId=${event.befehlId.value}`, 'BefehlEventAdapter');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit WebSocket event for BefehlZugestellt: befehlId=${event.befehlId.value}, error=${errorMessage}`, 'BefehlEventAdapter');
    }
  }

  /**
   * Empfaengt BefehlStatusGeaendertEvent und emittiert WebSocket Event.
   *
   * DB-Lookup fuer einsatzId, da das Domain Event diese nicht enthaelt.
   *
   * @param event - Das empfangene Domain Event
   */
  @OnEvent(BefehlStatusGeaendertEvent.eventName())
  async onBefehlStatusGeaendert(event: BefehlStatusGeaendertEvent): Promise<void> {
    this.logger.log(`Processing BefehlStatusGeaendert for WebSocket: befehlId=${event.befehlId.value}, ${event.oldStatus.value} -> ${event.newStatus.value}`, 'BefehlEventAdapter');

    if (!this.gateway) {
      this.logger.error('BefehlGateway not available - WebSocket event will not be emitted. Check module configuration and ensure BefehlGateway is properly registered.', 'BefehlEventAdapter');
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const befehl = await this.prisma.befehl.findUnique({
        where: { id: event.befehlId.value },
        select: { einsatzId: true },
      });

      if (!befehl) {
        this.logger.error(`Befehl not found for WebSocket event: befehlId=${event.befehlId.value}`, 'BefehlEventAdapter');
        return;
      }

      this.gateway.emitBefehlStatusGeaendert({
        befehlId: event.befehlId.value,
        einsatzId: befehl.einsatzId,
        oldStatus: event.oldStatus.value,
        newStatus: event.newStatus.value,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`WebSocket event emitted for BefehlStatusGeaendert: befehlId=${event.befehlId.value}`, 'BefehlEventAdapter');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit WebSocket event for BefehlStatusGeaendert: befehlId=${event.befehlId.value}, error=${errorMessage}`, 'BefehlEventAdapter');
    }
  }

  /**
   * Empfaengt BefehlKommentarHinzugefuegtEvent und emittiert WebSocket Event.
   *
   * DB-Lookup fuer einsatzId. kommentarId und parentId kommen direkt aus dem Domain Event.
   *
   * @param event - Das empfangene Domain Event
   */
  @OnEvent(BefehlKommentarHinzugefuegtEvent.eventName())
  async onBefehlKommentarHinzugefuegt(event: BefehlKommentarHinzugefuegtEvent): Promise<void> {
    this.logger.log(
      `Processing BefehlKommentarHinzugefuegt for WebSocket: befehlId=${event.befehlId.value}, authorId=${event.authorId.value}, isRueckfrage=${event.isRueckfrage}`,
      'BefehlEventAdapter',
    );

    if (!this.gateway) {
      this.logger.error('BefehlGateway not available - WebSocket event will not be emitted. Check module configuration and ensure BefehlGateway is properly registered.', 'BefehlEventAdapter');
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const befehl = await this.prisma.befehl.findUnique({
        where: { id: event.befehlId.value },
        select: { einsatzId: true },
      });

      if (!befehl) {
        this.logger.error(`Befehl not found for WebSocket event: befehlId=${event.befehlId.value}`, 'BefehlEventAdapter');
        return;
      }

      this.gateway.emitBefehlKommentarHinzugefuegt({
        befehlId: event.befehlId.value,
        einsatzId: befehl.einsatzId,
        kommentarId: event.kommentarId,
        authorId: event.authorId.value,
        text: event.text,
        isRueckfrage: event.isRueckfrage,
        parentId: event.parentId,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`WebSocket event emitted for BefehlKommentarHinzugefuegt: befehlId=${event.befehlId.value}`, 'BefehlEventAdapter');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit WebSocket event for BefehlKommentarHinzugefuegt: befehlId=${event.befehlId.value}, error=${errorMessage}`, 'BefehlEventAdapter');
    }
  }
}
