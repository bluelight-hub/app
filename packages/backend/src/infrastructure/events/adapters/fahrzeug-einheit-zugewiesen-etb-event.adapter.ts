/**
 * Infrastructure Event Adapter für FahrzeugEinheitZugewiesen Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * **Adapter Pattern:**
 * - Infrastructure Layer (dieser Adapter): @OnEvent Decorator, Framework-spezifisch
 * - Application Layer (FahrzeugEinheitZugewiesenEtbHandler): Pure TypeScript, Framework-agnostisch
 * - Delegation: Adapter delegiert Event Handling an Application Layer via IEventHandler
 *
 * @module infrastructure/events/adapters
 * @see IEventHandler - Domain Port Interface
 * @see FahrzeugEinheitZugewiesenEtbHandler - Application Layer Implementation
 * @see EVENT_HANDLER.FAHRZEUG_EINHEIT_ZUGEWIESEN_ETB - DI Token
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { FahrzeugEinheitZugewiesenEvent } from '@domain/kraefte/events/fahrzeug-einheit-zugewiesen.event';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';

/**
 * NestJS Event Adapter für FahrzeugEinheitZugewiesen ETB-Eintrag Creation.
 *
 * Empfängt FahrzeugEinheitZugewiesenEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler für framework-agnostische Verarbeitung.
 */
@Injectable()
export class FahrzeugEinheitZugewiesenEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.FAHRZEUG_EINHEIT_ZUGEWIESEN_ETB)
    private readonly handler: IEventHandler<FahrzeugEinheitZugewiesenEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Empfängt FahrzeugEinheitZugewiesenEvent und delegiert an Application Handler.
   *
   * @param event - FahrzeugEinheitZugewiesenEvent von OutboxEventPublisher
   * @returns Promise<void> - Keine Rückgabe (delegiert an Handler)
   */
  @OnEvent(FahrzeugEinheitZugewiesenEvent.eventName())
  async onFahrzeugEinheitZugewiesen(event: FahrzeugEinheitZugewiesenEvent): Promise<void> {
    this.logger.log(`Received FahrzeugEinheitZugewiesenEvent`, {
      eventId: event.eventId,
      einsatzId: event.einsatzId,
      fahrzeugId: event.fahrzeugId,
      funkrufname: event.funkrufname,
      einheitId: event.einheitId,
      einheitName: event.einheitName,
      eventName: FahrzeugEinheitZugewiesenEvent.eventName(),
    });

    try {
      await this.handler.handle(event);
    } catch (error) {
      // Fire-and-Forget: Fehler loggen, NICHT propagieren
      this.logger.error(`Unerwarteter Fehler im FahrzeugEinheitZugewiesen Handler`, {
        eventId: event.eventId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
