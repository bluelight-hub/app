/**
 * Infrastructure Event Adapter für PersonVonEinheitEntfernt Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * **Adapter Pattern:**
 * - Infrastructure Layer (dieser Adapter): @OnEvent Decorator, Framework-spezifisch
 * - Application Layer (PersonVonEinheitEntferntEtbHandler): Pure TypeScript, Framework-agnostisch
 * - Delegation: Adapter delegiert Event Handling an Application Layer via IEventHandler
 *
 * @module infrastructure/events/adapters
 * @see IEventHandler - Domain Port Interface
 * @see PersonVonEinheitEntferntEtbHandler - Application Layer Implementation
 * @see EVENT_HANDLER.PERSON_VON_EINHEIT_ENTFERNT_ETB - DI Token
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PersonVonEinheitEntferntEvent } from '@domain/kraefte/events/person-von-einheit-entfernt.event';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';

/**
 * NestJS Event Adapter für PersonVonEinheitEntfernt ETB-Eintrag Creation.
 *
 * Empfängt PersonVonEinheitEntferntEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler für framework-agnostische Verarbeitung.
 */
@Injectable()
export class PersonVonEinheitEntferntEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.PERSON_VON_EINHEIT_ENTFERNT_ETB)
    private readonly handler: IEventHandler<PersonVonEinheitEntferntEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Empfängt PersonVonEinheitEntferntEvent und delegiert an Application Handler.
   *
   * **Event Flow:**
   * 1. OutboxEventPublisher emittiert 'einsatz_einheit.person_entfernt' Event
   * 2. NestJS EventEmitter ruft diese Methode auf (via @OnEvent)
   * 3. Methode delegiert an Application Handler via IEventHandler.handle()
   * 4. Application Handler erstellt ETB-Eintrag (Fire-and-Forget)
   *
   * @param event - PersonVonEinheitEntferntEvent von OutboxEventPublisher
   * @returns Promise<void> - Keine Rückgabe (delegiert an Handler)
   */
  @OnEvent(PersonVonEinheitEntferntEvent.eventName())
  async onPersonVonEinheitEntfernt(event: PersonVonEinheitEntferntEvent): Promise<void> {
    this.logger.log(`Received PersonVonEinheitEntferntEvent`, {
      eventId: event.eventId,
      einsatzId: event.einsatzId,
      einheitId: event.einheitId,
      personId: event.personId,
      personName: `${event.personVorname} ${event.personNachname}`,
      einheitName: event.einheitName,
      eventName: PersonVonEinheitEntferntEvent.eventName(),
    });

    try {
      await this.handler.handle(event);
    } catch (error) {
      // Fire-and-Forget: Fehler loggen, NICHT propagieren
      this.logger.error(`Unerwarteter Fehler im PersonVonEinheitEntfernt Handler`, {
        eventId: event.eventId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
