/**
 * Infrastructure Event Adapter für EinsatzPersonHinzugefuegt Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * **Adapter Pattern:**
 * - Infrastructure Layer (dieser Adapter): @OnEvent Decorator, Framework-spezifisch
 * - Application Layer (EinsatzPersonHinzugefuegtEventHandler): Pure TypeScript, Framework-agnostisch
 * - Delegation: Adapter delegiert Event Handling an Application Layer via IEventHandler
 *
 * @module infrastructure/events/adapters
 * @see IEventHandler - Domain Port Interface
 * @see EinsatzPersonHinzugefuegtEventHandler - Application Layer Implementation
 * @see EVENT_HANDLER.EINSATZ_PERSON_HINZUGEFUEGT_ETB - DI Token
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EinsatzPersonHinzugefuegtEvent } from '@domain/kraefte/events/einsatz-person-hinzugefuegt.event';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';

/**
 * NestJS Event Adapter für EinsatzPersonHinzugefuegt ETB-Eintrag Creation.
 *
 * Empfängt EinsatzPersonHinzugefuegtEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler für framework-agnostische Verarbeitung.
 */
@Injectable()
export class EinsatzPersonHinzugefuegtEventAdapter {
  /**
   * Konstruktor injiziert Application Layer Event Handler via DI Token.
   *
   * **Warum DI Token statt direkter Import?**
   * - Entkoppelt Infrastructure Layer von Application Layer Implementierung
   * - Ermöglicht einfaches Testen durch Mock-Injection
   * - Vermeidet zirkuläre Dependencies zwischen Layern
   *
   * @param handler - Application Layer Handler für ETB-Eintrag Creation nach Personen-Registrierung.
   *                  Wird via DI Token `EVENT_HANDLER.EINSATZ_PERSON_HINZUGEFUEGT_ETB` injiziert
   *                  (definiert in `infrastructure/di-tokens.ts`, gebunden in `event-adapters.module.ts`).
   *                  Handler implementiert `IEventHandler<EinsatzPersonHinzugefuegtEvent>` Port (Domain Layer)
   *                  und ist vollständig framework-agnostisch (keine NestJS Dependencies).
   * @param logger - Logger Port für Infrastructure Layer Logging.
   *                 Wird via DI Token `LOGGER` injiziert (ILogger Port Implementation).
   */
  constructor(
    @Inject(EVENT_HANDLER.EINSATZ_PERSON_HINZUGEFUEGT_ETB)
    private readonly handler: IEventHandler<EinsatzPersonHinzugefuegtEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Empfängt EinsatzPersonHinzugefuegtEvent und delegiert an Application Handler.
   *
   * **Event Flow:**
   * 1. OutboxEventPublisher emittiert 'einsatz_person.hinzugefuegt' Event
   * 2. NestJS EventEmitter ruft diese Methode auf (via @OnEvent)
   * 3. Methode delegiert an Application Handler via IEventHandler.handle()
   * 4. Application Handler erstellt ETB-Eintrag (Fire-and-Forget)
   *
   * @param event - EinsatzPersonHinzugefuegtEvent von OutboxEventPublisher
   * @returns Promise<void> - Keine Rückgabe (delegiert an Handler)
   */
  @OnEvent(EinsatzPersonHinzugefuegtEvent.eventName())
  async onEinsatzPersonHinzugefuegt(event: EinsatzPersonHinzugefuegtEvent): Promise<void> {
    this.logger.log(
      `Received EinsatzPersonHinzugefuegtEvent: eventId=${event.eventId}, einsatzId=${event.einsatzId}, einsatzPersonId=${event.einsatzPersonId}, name=${event.vorname} ${event.nachname}, funktion=${event.funktion}`,
      EinsatzPersonHinzugefuegtEventAdapter.name,
    );

    try {
      await this.handler.handle(event);
    } catch (error) {
      // Fire-and-Forget: Fehler loggen, NICHT propagieren
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Unerwarteter Fehler im EinsatzPersonHinzugefuegt Handler: eventId=${event.eventId}, einsatzId=${event.einsatzId}, einsatzPersonId=${event.einsatzPersonId}, error=${errorMessage}, stack=${stack ?? 'undefined'}`,
        EinsatzPersonHinzugefuegtEventAdapter.name,
      );
    }
  }
}
