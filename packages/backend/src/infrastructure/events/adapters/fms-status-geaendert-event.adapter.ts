/**
 * Infrastructure Event Adapter für FmsStatusGeaendert Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * **Adapter Pattern:**
 * - Infrastructure Layer (dieser Adapter): @OnEvent Decorator, Framework-spezifisch
 * - Application Layer (FmsStatusGeaendertEventHandler): Pure TypeScript, Framework-agnostisch
 * - Delegation: Adapter delegiert Event Handling an Application Layer via IEventHandler
 *
 * @module infrastructure/events/adapters
 * @see IEventHandler - Domain Port Interface
 * @see FmsStatusGeaendertEventHandler - Application Layer Implementation
 * @see EVENT_HANDLER.FMS_STATUS_GEAENDERT_ETB - DI Token
 */
import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { FmsStatusGeaendertEvent } from '@domain/kraefte/events/fms-status-geaendert.event';
import { EVENT_HANDLER } from '@infrastructure/di-tokens';

/**
 * NestJS Event Adapter für FmsStatusGeaendert ETB-Eintrag Creation.
 *
 * Empfängt FmsStatusGeaendertEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler für framework-agnostische Verarbeitung.
 */
@Injectable()
export class FmsStatusGeaendertEventAdapter {
  private readonly logger = new Logger(FmsStatusGeaendertEventAdapter.name);

  /**
   * @param handler - Application Layer Handler für ETB-Eintrag Creation
   */
  constructor(
    @Inject(EVENT_HANDLER.FMS_STATUS_GEAENDERT_ETB)
    private readonly handler: IEventHandler<FmsStatusGeaendertEvent>,
  ) {}

  /**
   * Empfängt FmsStatusGeaendertEvent und delegiert an Application Handler.
   *
   * **Event Flow:**
   * 1. OutboxEventPublisher emittiert 'einsatz_fahrzeug.fms_status_geaendert' Event
   * 2. NestJS EventEmitter ruft diese Methode auf (via @OnEvent)
   * 3. Methode delegiert an Application Handler via IEventHandler.handle()
   * 4. Application Handler erstellt ETB-Eintrag (Fire-and-Forget)
   *
   * @param event - FmsStatusGeaendertEvent von OutboxEventPublisher
   * @returns Promise<void> - Keine Rückgabe (delegiert an Handler)
   */
  @OnEvent(FmsStatusGeaendertEvent.eventName())
  async onFmsStatusGeaendert(event: FmsStatusGeaendertEvent): Promise<void> {
    this.logger.debug(`Received FmsStatusGeaendertEvent`, {
      eventId: event.eventId,
      einsatzId: event.einsatzId,
      einsatzFahrzeugId: event.einsatzFahrzeugId,
      funkrufname: event.funkrufname,
      alterStatus: event.alterStatus,
      neuerStatus: event.neuerStatus,
      eventName: FmsStatusGeaendertEvent.eventName(),
    });

    await this.handler.handle(event);
    // Handler implementiert bereits Fire-and-Forget mit try/catch
  }
}
