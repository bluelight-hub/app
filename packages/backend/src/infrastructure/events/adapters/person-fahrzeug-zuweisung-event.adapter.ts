/**
 * Infrastructure Event Adapter für Person-Fahrzeug-Zuweisung Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * **Adapter Pattern:**
 * - Infrastructure Layer (dieser Adapter): @OnEvent Decorator, Framework-spezifisch
 * - Application Layer (PersonFahrzeugZuweisungHandler): Pure TypeScript, Framework-agnostisch
 * - Delegation: Adapter delegiert Event Handling an Application Layer via IEventHandler
 *
 * **Handled Events:**
 * - PersonZuFahrzeugZugewiesenEvent: Person wurde einem Fahrzeug zugewiesen
 * - PersonVonFahrzeugEntferntEvent: Person wurde von einem Fahrzeug entfernt
 *
 * @module infrastructure/events/adapters
 * @see IEventHandler - Domain Port Interface
 * @see PersonFahrzeugZuweisungHandler - Application Layer Implementation
 * @see EVENT_HANDLER.PERSON_ZU_FAHRZEUG_ZUGEWIESEN_ETB - DI Token für Zuweisung
 * @see EVENT_HANDLER.PERSON_VON_FAHRZEUG_ENTFERNT_ETB - DI Token für Entfernung
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PersonZuFahrzeugZugewiesenEvent } from '@domain/kraefte/events/person-zu-fahrzeug-zugewiesen.event';
import { PersonVonFahrzeugEntferntEvent } from '@domain/kraefte/events/person-von-fahrzeug-entfernt.event';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';

/**
 * NestJS Event Adapter für Person-Fahrzeug-Zuweisung ETB-Eintrag Creation.
 *
 * Empfängt PersonZuFahrzeugZugewiesenEvent und PersonVonFahrzeugEntferntEvent
 * via @OnEvent Decorator und delegiert an den Application Layer Handler für
 * framework-agnostische Verarbeitung.
 *
 * **Warum ein Adapter für beide Events?**
 * Der PersonFahrzeugZuweisungHandler verarbeitet beide Events (Zuweisung + Entfernung),
 * daher delegieren beide @OnEvent Methoden an denselben Handler, aber mit unterschiedlichen
 * DI Tokens für klare Separation of Concerns.
 */
@Injectable()
export class PersonFahrzeugZuweisungEventAdapter {
  /**
   * Konstruktor injiziert Application Layer Event Handler via DI Token.
   *
   * **Warum DI Token statt direkter Import?**
   * - Entkoppelt Infrastructure Layer von Application Layer Implementierung
   * - Ermöglicht einfaches Testen durch Mock-Injection
   * - Vermeidet zirkuläre Dependencies zwischen Layern
   *
   * **Warum zwei Handler-Tokens?**
   * Clean Architecture: Jeder Event-Typ bekommt einen eigenen DI Token,
   * auch wenn beide an denselben Handler delegieren. Dies ermöglicht
   * spätere Entkopplung falls separate Handlers benötigt werden.
   *
   * @param zuweisungHandler - Application Layer Handler für ETB-Eintrag Creation nach Fahrzeug-Zuweisung.
   *                           Wird via DI Token `EVENT_HANDLER.PERSON_ZU_FAHRZEUG_ZUGEWIESEN_ETB` injiziert
   *                           (definiert in `infrastructure/di-tokens.ts`, gebunden in `event-adapters.module.ts`).
   *                           Handler implementiert `IEventHandler<PersonZuFahrzeugZugewiesenEvent>` Port (Domain Layer)
   *                           und ist vollständig framework-agnostisch (keine NestJS Dependencies).
   * @param entfernungHandler - Application Layer Handler für ETB-Eintrag Creation nach Fahrzeug-Entfernung.
   *                            Wird via DI Token `EVENT_HANDLER.PERSON_VON_FAHRZEUG_ENTFERNT_ETB` injiziert
   *                            (definiert in `infrastructure/di-tokens.ts`, gebunden in `event-adapters.module.ts`).
   *                            Handler implementiert `IEventHandler<PersonVonFahrzeugEntferntEvent>` Port (Domain Layer)
   *                            und ist vollständig framework-agnostisch (keine NestJS Dependencies).
   * @param logger - Logger Port für Infrastructure Layer Logging.
   *                 Wird via DI Token `LOGGER` injiziert (ILogger Port Implementation).
   */
  constructor(
    @Inject(EVENT_HANDLER.PERSON_ZU_FAHRZEUG_ZUGEWIESEN_ETB)
    private readonly zuweisungHandler: IEventHandler<PersonZuFahrzeugZugewiesenEvent>,
    @Inject(EVENT_HANDLER.PERSON_VON_FAHRZEUG_ENTFERNT_ETB)
    private readonly entfernungHandler: IEventHandler<PersonVonFahrzeugEntferntEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Empfängt PersonZuFahrzeugZugewiesenEvent und delegiert an Application Handler.
   *
   * **Event Flow:**
   * 1. OutboxEventPublisher emittiert 'einsatz_person.zu_fahrzeug_zugewiesen' Event
   * 2. NestJS EventEmitter ruft diese Methode auf (via @OnEvent)
   * 3. Methode delegiert an Application Handler via IEventHandler.handle()
   * 4. Application Handler erstellt ETB-Eintrag (Fire-and-Forget)
   *
   * @param event - PersonZuFahrzeugZugewiesenEvent von OutboxEventPublisher
   * @returns Promise<void> - Keine Rückgabe (delegiert an Handler)
   */
  @OnEvent(PersonZuFahrzeugZugewiesenEvent.eventName())
  async onPersonZuFahrzeugZugewiesen(event: PersonZuFahrzeugZugewiesenEvent): Promise<void> {
    this.logger.log(
      `Received PersonZuFahrzeugZugewiesenEvent: eventId=${event.eventId}, einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}`,
      PersonFahrzeugZuweisungEventAdapter.name,
    );

    try {
      await this.zuweisungHandler.handle(event);
    } catch (error) {
      // Fire-and-Forget: Fehler loggen, NICHT propagieren
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Unerwarteter Fehler im PersonZuFahrzeugZugewiesen Handler: eventId=${event.eventId}, einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, error=${errorMessage}, stack=${stack ?? 'undefined'}`,
        PersonFahrzeugZuweisungEventAdapter.name,
      );
    }
  }

  /**
   * Empfängt PersonVonFahrzeugEntferntEvent und delegiert an Application Handler.
   *
   * **Event Flow:**
   * 1. OutboxEventPublisher emittiert 'einsatz_person.von_fahrzeug_entfernt' Event
   * 2. NestJS EventEmitter ruft diese Methode auf (via @OnEvent)
   * 3. Methode delegiert an Application Handler via IEventHandler.handle()
   * 4. Application Handler erstellt ETB-Eintrag (Fire-and-Forget)
   *
   * @param event - PersonVonFahrzeugEntferntEvent von OutboxEventPublisher
   * @returns Promise<void> - Keine Rückgabe (delegiert an Handler)
   */
  @OnEvent(PersonVonFahrzeugEntferntEvent.eventName())
  async onPersonVonFahrzeugEntfernt(event: PersonVonFahrzeugEntferntEvent): Promise<void> {
    this.logger.log(
      `Received PersonVonFahrzeugEntferntEvent: eventId=${event.eventId}, einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}`,
      PersonFahrzeugZuweisungEventAdapter.name,
    );

    try {
      await this.entfernungHandler.handle(event);
    } catch (error) {
      // Fire-and-Forget: Fehler loggen, NICHT propagieren
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Unerwarteter Fehler im PersonVonFahrzeugEntfernt Handler: eventId=${event.eventId}, einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, error=${errorMessage}, stack=${stack ?? 'undefined'}`,
        PersonFahrzeugZuweisungEventAdapter.name,
      );
    }
  }
}
