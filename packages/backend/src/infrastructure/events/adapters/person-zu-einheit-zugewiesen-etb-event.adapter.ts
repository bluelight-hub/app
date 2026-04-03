/**
 * Infrastructure Event Adapter für PersonZuEinheitZugewiesen Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * **Adapter Pattern:**
 * - Infrastructure Layer (dieser Adapter): @OnEvent Decorator, Framework-spezifisch
 * - Application Layer (PersonZuEinheitZugewiesenEtbHandler): Pure TypeScript, Framework-agnostisch
 * - Delegation: Adapter delegiert Event Handling an Application Layer via IEventHandler
 *
 * @module infrastructure/events/adapters
 * @see IEventHandler - Domain Port Interface
 * @see PersonZuEinheitZugewiesenEtbHandler - Application Layer Implementation
 * @see EVENT_HANDLER.PERSON_ZU_EINHEIT_ZUGEWIESEN_ETB - DI Token
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PersonZuEinheitZugewiesenEvent } from '@domain/kraefte/events/person-zu-einheit-zugewiesen.event';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';

/**
 * NestJS Event Adapter für PersonZuEinheitZugewiesen ETB-Eintrag Creation.
 *
 * Empfängt PersonZuEinheitZugewiesenEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler für framework-agnostische Verarbeitung.
 */
@Injectable()
export class PersonZuEinheitZugewiesenEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.PERSON_ZU_EINHEIT_ZUGEWIESEN_ETB)
    private readonly handler: IEventHandler<PersonZuEinheitZugewiesenEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Empfängt PersonZuEinheitZugewiesenEvent und delegiert an Application Handler.
   *
   * **Event Flow:**
   * 1. OutboxEventPublisher emittiert 'einsatz_einheit.person_zugewiesen' Event
   * 2. NestJS EventEmitter ruft diese Methode auf (via @OnEvent)
   * 3. Methode delegiert an Application Handler via IEventHandler.handle()
   * 4. Application Handler erstellt ETB-Eintrag (Fire-and-Forget)
   *
   * @param event - PersonZuEinheitZugewiesenEvent von OutboxEventPublisher
   * @returns Promise<void> - Keine Rückgabe (delegiert an Handler)
   */
  @OnEvent(PersonZuEinheitZugewiesenEvent.eventName())
  async onPersonZuEinheitZugewiesen(event: PersonZuEinheitZugewiesenEvent): Promise<void> {
    this.logger.log(`Received PersonZuEinheitZugewiesenEvent`, {
      eventId: event.eventId,
      einsatzId: event.einsatzId,
      einheitId: event.einheitId,
      personId: event.personId,
      personName: `${event.personVorname} ${event.personNachname}`,
      einheitName: event.einheitName,
      eventName: PersonZuEinheitZugewiesenEvent.eventName(),
    });

    try {
      await this.handler.handle(event);
    } catch (error) {
      // Fire-and-Forget: Fehler loggen, NICHT propagieren
      this.logger.error(`Unerwarteter Fehler im PersonZuEinheitZugewiesen Handler`, {
        eventId: event.eventId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
