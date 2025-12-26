/**
 * Infrastructure Event Adapter für RolleFreigegeben Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * **Adapter Pattern:**
 * - Infrastructure Layer (dieser Adapter): @OnEvent Decorator, Framework-spezifisch
 * - Application Layer (RolleFreigegebenHandler): Pure TypeScript, Framework-agnostisch
 * - Delegation: Adapter delegiert Event Handling an Application Layer via IEventHandler
 *
 * @module infrastructure/events/adapters
 * @see IEventHandler - Domain Port Interface
 * @see RolleFreigegebenHandler - Application Layer Implementation
 * @see EVENT_HANDLER.ROLLE_FREIGEGEBEN_ETB - DI Token
 */
import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { RolleFreigegeben } from '@domain/kraefte/events/rolle-freigegeben.event';
import { EVENT_HANDLER } from '@infrastructure/di-tokens';

/**
 * NestJS Event Adapter für RolleFreigegeben ETB-Eintrag Creation.
 *
 * Empfängt RolleFreigegebenEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler für framework-agnostische Verarbeitung.
 */
@Injectable()
export class RolleFreigegebenEventAdapter {
  private readonly logger = new Logger(RolleFreigegebenEventAdapter.name);

  constructor(
    @Inject(EVENT_HANDLER.ROLLE_FREIGEGEBEN_ETB)
    private readonly handler: IEventHandler<RolleFreigegeben>,
  ) {}

  /**
   * Empfängt RolleFreigegebenEvent und delegiert an Application Handler.
   *
   * **Event Flow:**
   * 1. OutboxEventPublisher emittiert 'rollen_besetzung.rolle_freigegeben' Event
   * 2. NestJS EventEmitter ruft diese Methode auf (via @OnEvent)
   * 3. Methode delegiert an Application Handler via IEventHandler.handle()
   * 4. Application Handler erstellt ETB-Eintrag (Fire-and-Forget)
   *
   * @param event - RolleFreigegebenEvent von OutboxEventPublisher
   * @returns Promise<void> - Keine Rückgabe (delegiert an Handler)
   */
  @OnEvent(RolleFreigegeben.eventName())
  async onRolleFreigegeben(event: RolleFreigegeben): Promise<void> {
    this.logger.log(`Received RolleFreigegebenEvent`, {
      eventId: event.eventId,
      einsatzId: event.einsatzId,
      einsatzPersonId: event.einsatzPersonId,
      rollenDefinitionId: event.rollenDefinitionId,
      rollenName: event.rollenName,
      eventName: RolleFreigegeben.eventName(),
    });

    try {
      await this.handler.handle(event);
    } catch (error) {
      // Fire-and-Forget: Fehler loggen, NICHT propagieren
      this.logger.error(`Unerwarteter Fehler im RolleFreigegeben Handler`, {
        eventId: event.eventId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
