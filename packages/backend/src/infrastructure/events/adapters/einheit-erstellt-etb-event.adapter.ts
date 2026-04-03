/**
 * Infrastructure Event Adapter für EinheitErstellt Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * **Adapter Pattern:**
 * - Infrastructure Layer (dieser Adapter): @OnEvent Decorator, Framework-spezifisch
 * - Application Layer (EinheitErstelltEtbHandler): Pure TypeScript, Framework-agnostisch
 * - Delegation: Adapter delegiert Event Handling an Application Layer via IEventHandler
 *
 * @module infrastructure/events/adapters
 * @see IEventHandler - Domain Port Interface
 * @see EinheitErstelltEtbHandler - Application Layer Implementation
 * @see EVENT_HANDLER.EINHEIT_ERSTELLT_ETB - DI Token
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EinheitErstelltEvent } from '@domain/kraefte/events/einheit-erstellt.event';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';

/**
 * NestJS Event Adapter für EinheitErstellt ETB-Eintrag Creation.
 *
 * Empfängt EinheitErstelltEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler für framework-agnostische Verarbeitung.
 */
@Injectable()
export class EinheitErstelltEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.EINHEIT_ERSTELLT_ETB)
    private readonly handler: IEventHandler<EinheitErstelltEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Empfängt EinheitErstelltEvent und delegiert an Application Handler.
   *
   * **Event Flow:**
   * 1. OutboxEventPublisher emittiert 'einsatz_einheit.erstellt' Event
   * 2. NestJS EventEmitter ruft diese Methode auf (via @OnEvent)
   * 3. Methode delegiert an Application Handler via IEventHandler.handle()
   * 4. Application Handler erstellt ETB-Eintrag (Fire-and-Forget)
   *
   * @param event - EinheitErstelltEvent von OutboxEventPublisher
   * @returns Promise<void> - Keine Rückgabe (delegiert an Handler)
   */
  @OnEvent(EinheitErstelltEvent.eventName())
  async onEinheitErstellt(event: EinheitErstelltEvent): Promise<void> {
    this.logger.log(`Received EinheitErstelltEvent`, {
      eventId: event.eventId,
      einsatzId: event.einsatzId,
      einheitId: event.einheitId,
      name: event.name,
      typ: event.typ,
      eventName: EinheitErstelltEvent.eventName(),
    });

    try {
      await this.handler.handle(event);
    } catch (error) {
      // Fire-and-Forget: Fehler loggen, NICHT propagieren
      this.logger.error(`Unerwarteter Fehler im EinheitErstellt Handler`, {
        eventId: event.eventId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
