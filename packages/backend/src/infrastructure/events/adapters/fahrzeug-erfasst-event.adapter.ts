/**
 * Infrastructure Event Adapter für FahrzeugErfasst Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * **Adapter Pattern:**
 * - Infrastructure Layer (dieser Adapter): @OnEvent Decorator, Framework-spezifisch
 * - Application Layer (FahrzeugErfasstEventHandler): Pure TypeScript, Framework-agnostisch
 * - Delegation: Adapter delegiert Event Handling an Application Layer via IEventHandler
 *
 * @module infrastructure/events/adapters
 * @see IEventHandler - Domain Port Interface
 * @see FahrzeugErfasstEventHandler - Application Layer Implementation
 * @see EVENT_HANDLER.FAHRZEUG_ERFASST_ETB - DI Token
 */
import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { FahrzeugErfasstEvent } from '@domain/kraefte/events/fahrzeug-erfasst.event';
import { EVENT_HANDLER } from '@infrastructure/di-tokens';

/**
 * NestJS Event Adapter für FahrzeugErfasst ETB-Eintrag Creation.
 *
 * Empfängt FahrzeugErfasstEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler für framework-agnostische Verarbeitung.
 */
@Injectable()
export class FahrzeugErfasstEventAdapter {
  private readonly logger = new Logger(FahrzeugErfasstEventAdapter.name);

  constructor(
    @Inject(EVENT_HANDLER.FAHRZEUG_ERFASST_ETB)
    private readonly handler: IEventHandler<FahrzeugErfasstEvent>,
  ) {}

  /**
   * Empfängt FahrzeugErfasstEvent und delegiert an Application Handler.
   *
   * **Event Flow:**
   * 1. OutboxEventPublisher emittiert 'einsatz_fahrzeug.erfasst' Event
   * 2. NestJS EventEmitter ruft diese Methode auf (via @OnEvent)
   * 3. Methode delegiert an Application Handler via IEventHandler.handle()
   * 4. Application Handler erstellt ETB-Eintrag (Fire-and-Forget)
   *
   * @param event - FahrzeugErfasstEvent von OutboxEventPublisher
   * @returns Promise<void> - Keine Rückgabe (delegiert an Handler)
   */
  @OnEvent(FahrzeugErfasstEvent.eventName())
  async onFahrzeugErfasst(event: FahrzeugErfasstEvent): Promise<void> {
    this.logger.log(`Received FahrzeugErfasstEvent`, {
      eventId: event.eventId,
      einsatzId: event.einsatzId,
      einsatzFahrzeugId: event.einsatzFahrzeugId,
      funkrufname: event.funkrufname,
      eventName: FahrzeugErfasstEvent.eventName(),
    });
    await this.handler.handle(event);
  }
}
