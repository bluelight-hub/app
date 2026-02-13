/**
 * Infrastructure Event Adapter fuer NotizErstellt Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * **Adapter Pattern:**
 * - Infrastructure Layer (dieser Adapter): @OnEvent Decorator, Framework-spezifisch
 * - Application Layer (NotizErstelltEtbHandler): Pure TypeScript, Framework-agnostisch
 * - Delegation: Adapter delegiert Event Handling an Application Layer via IEventHandler
 *
 * @module infrastructure/events/adapters
 * @see IEventHandler - Domain Port Interface
 * @see NotizErstelltEtbHandler - Application Layer Implementation
 * @see EVENT_HANDLER.NOTIZ_ERSTELLT_ETB - DI Token
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { NotizErstelltEvent } from '@domain/notiz/events/notiz-erstellt.event';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';

/**
 * NestJS Event Adapter fuer NotizErstellt ETB-Eintrag Creation.
 *
 * Empfaengt NotizErstelltEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler fuer framework-agnostische Verarbeitung.
 *
 * **Story 7.1:** Automatischer ETB-Eintrag bei Notiz-Erstellung.
 */
@Injectable()
export class NotizErstelltEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.NOTIZ_ERSTELLT_ETB)
    private readonly handler: IEventHandler<NotizErstelltEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Empfaengt NotizErstelltEvent und delegiert an Application Handler.
   *
   * **Event Flow:**
   * 1. OutboxEventPublisher emittiert 'notiz.erstellt' Event
   * 2. NestJS EventEmitter ruft diese Methode auf (via @OnEvent)
   * 3. Methode delegiert an Application Handler via IEventHandler.handle()
   * 4. Application Handler erstellt ETB-Eintrag (Fire-and-Forget)
   *
   * @param event - NotizErstelltEvent von OutboxEventPublisher
   * @returns Promise<void> - Keine Rueckgabe (delegiert an Handler)
   */
  @OnEvent(NotizErstelltEvent.eventName())
  async onNotizErstellt(event: NotizErstelltEvent): Promise<void> {
    this.logger.log(`Received NotizErstelltEvent`, {
      eventId: event.eventId,
      einsatzId: event.einsatzId,
      notizId: event.notizId.toString(),
      titel: event.titel,
      eventName: NotizErstelltEvent.eventName(),
    });

    // Delegiert an Application Handler (Fire-and-Forget Error Handling im Handler)
    await this.handler.handle(event);
  }
}
