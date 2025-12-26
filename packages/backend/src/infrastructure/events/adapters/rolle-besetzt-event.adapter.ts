/**
 * Infrastructure Event Adapter für RolleBesetzt Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * **Adapter Pattern:**
 * - Infrastructure Layer (dieser Adapter): @OnEvent Decorator, Framework-spezifisch
 * - Application Layer (RolleBesetztHandler): Pure TypeScript, Framework-agnostisch
 * - Delegation: Adapter delegiert Event Handling an Application Layer via IEventHandler
 *
 * @module infrastructure/events/adapters
 * @see IEventHandler - Domain Port Interface
 * @see RolleBesetztHandler - Application Layer Implementation
 * @see EVENT_HANDLER.ROLLE_BESETZT_ETB - DI Token
 */
import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { RolleBesetzt } from '@domain/kraefte/events/rolle-besetzt.event';
import { EVENT_HANDLER } from '@infrastructure/di-tokens';

/**
 * NestJS Event Adapter für RolleBesetzt ETB-Eintrag Creation.
 *
 * Empfängt RolleBesetztEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler für framework-agnostische Verarbeitung.
 */
@Injectable()
export class RolleBesetztEventAdapter {
  private readonly logger = new Logger(RolleBesetztEventAdapter.name);

  constructor(
    @Inject(EVENT_HANDLER.ROLLE_BESETZT_ETB)
    private readonly handler: IEventHandler<RolleBesetzt>,
  ) {}

  /**
   * Empfängt RolleBesetztEvent und delegiert an Application Handler.
   *
   * **Event Flow:**
   * 1. OutboxEventPublisher emittiert 'rollen_besetzung.rolle_besetzt' Event
   * 2. NestJS EventEmitter ruft diese Methode auf (via @OnEvent)
   * 3. Methode delegiert an Application Handler via IEventHandler.handle()
   * 4. Application Handler erstellt ETB-Eintrag (Fire-and-Forget)
   *
   * @param event - RolleBesetztEvent von OutboxEventPublisher
   * @returns Promise<void> - Keine Rückgabe (delegiert an Handler)
   */
  @OnEvent(RolleBesetzt.eventName())
  async onRolleBesetzt(event: RolleBesetzt): Promise<void> {
    this.logger.log(`Received RolleBesetztEvent`, {
      eventId: event.eventId,
      einsatzId: event.einsatzId,
      einsatzPersonId: event.einsatzPersonId,
      rollenDefinitionId: event.rollenDefinitionId,
      rollenName: event.rollenName,
      eventName: RolleBesetzt.eventName(),
    });

    try {
      await this.handler.handle(event);
    } catch (error) {
      // Fire-and-Forget: Fehler loggen, NICHT propagieren
      this.logger.error(`Unerwarteter Fehler im RolleBesetzt Handler`, {
        eventId: event.eventId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
