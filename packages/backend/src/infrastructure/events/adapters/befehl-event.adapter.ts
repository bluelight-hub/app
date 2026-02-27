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
import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ILogger } from '@domain/ports/i-logger.port';
import { BefehlErstelltEvent } from '@domain/events/befehl-erstellt.event';
import { BefehlZugestelltEvent } from '@domain/events/befehl-zugestellt.event';
import { BefehlStatusGeaendertEvent } from '@domain/events/befehl-status-geaendert.event';
import { BefehlKommentarHinzugefuegtEvent } from '@domain/events/befehl-kommentar-hinzugefuegt.event';
import { BefehlQuittiertEvent } from '@domain/events/befehl-quittiert.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { BefehlGateway } from '@/modules/befehl/gateways/befehl.gateway';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class BefehlEventAdapter {
  constructor(
    private readonly gateway: BefehlGateway,
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

    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const befehl = await this.prisma.befehl.findUnique({
        where: { id: event.befehlId.value },
        select: { befehlsgeberName: true, befehlsgeberId: true, erstellerId: true, status: true, erteiltAm: true, befehlsgeber: { select: { username: true } } },
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
        befehlsgeberName: befehl.befehlsgeberName ?? befehl.befehlsgeber?.username ?? '',
        erstellerId: befehl.erstellerId ?? '',
        empfaenger: event.empfaenger,
        empfaengerIds: event.empfaengerIds ?? [],
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
   * Rich Data aus Event (kein DB-Lookup noetig dank Event-Carried State Transfer).
   *
   * @param event - Das empfangene Domain Event
   */
  @OnEvent(BefehlZugestelltEvent.eventName())
  async onBefehlZugestellt(event: BefehlZugestelltEvent): Promise<void> {
    this.logger.log(`Processing BefehlZugestellt for WebSocket: befehlId=${event.befehlId.value}, empfaengerId=${event.empfaengerId}`, 'BefehlEventAdapter');

    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      this.gateway.emitBefehlZugestellt({
        befehlId: event.befehlId.value,
        einsatzId: event.einsatzId.value,
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
   * Rich Data aus Event (kein DB-Lookup noetig dank Event-Carried State Transfer).
   *
   * @param event - Das empfangene Domain Event
   */
  @OnEvent(BefehlStatusGeaendertEvent.eventName())
  async onBefehlStatusGeaendert(event: BefehlStatusGeaendertEvent): Promise<void> {
    this.logger.log(`Processing BefehlStatusGeaendert for WebSocket: befehlId=${event.befehlId.value}, ${event.oldStatus.value} -> ${event.newStatus.value}`, 'BefehlEventAdapter');

    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      this.gateway.emitBefehlStatusGeaendert({
        befehlId: event.befehlId.value,
        einsatzId: event.einsatzId.value,
        oldStatus: event.oldStatus.value,
        newStatus: event.newStatus.value,
        timestamp: new Date().toISOString(),
        nummer: event.nummer,
        erstellerId: event.erstellerId?.value,
        befehlsgeberId: event.befehlsgeberId?.value,
        empfaengerIds: event.empfaengerIds,
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

  /**
   * Empfaengt BefehlQuittiertEvent und emittiert WebSocket Event.
   *
   * Story 2.1 AC6: BefehlQuittiertEvent wird via WebSocket an verbundene Clients emittiert.
   * Rich Data aus Event (kein DB-Lookup noetig dank Event-Carried State Transfer).
   *
   * @param event - Das empfangene Domain Event
   */
  @OnEvent(BefehlQuittiertEvent.eventName())
  async onBefehlQuittiert(event: BefehlQuittiertEvent): Promise<void> {
    this.logger.log(
      `Processing BefehlQuittiert for WebSocket: befehlId=${event.befehlId.value}, empfaengerId=${event.empfaengerId.value}, quittierungArt=${event.quittierungArt}`,
      'BefehlEventAdapter',
    );

    // KRITISCH: 50ms Delay fuer Race Condition Prevention
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      this.gateway.emitBefehlQuittiert({
        befehlId: event.befehlId.value,
        einsatzId: event.einsatzId.value,
        empfaengerId: event.empfaengerId.value,
        quittierungArt: event.quittierungArt,
        nummer: event.nummer,
        quittiertAm: event.quittiertAm.toISOString(),
        quittierungKommentar: event.quittierungKommentar,
        erstellerId: event.erstellerId?.value,
        befehlsgeberId: event.befehlsgeberId?.value,
      });

      this.logger.log(`WebSocket event emitted for BefehlQuittiert: befehlId=${event.befehlId.value}`, 'BefehlEventAdapter');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit WebSocket event for BefehlQuittiert: befehlId=${event.befehlId.value}, error=${errorMessage}`, 'BefehlEventAdapter');
    }
  }
}
