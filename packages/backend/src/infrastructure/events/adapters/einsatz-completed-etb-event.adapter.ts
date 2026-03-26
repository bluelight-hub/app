/**
 * Infrastructure Event Adapter für automatische ETB-Sperrung bei Einsatz-Abschluss.
 *
 * Empfängt EinsatzCompletedEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler für framework-agnostische Verarbeitung.
 *
 * @module infrastructure/events/adapters
 * @see IEventHandler - Domain Port Interface
 * @see EtbEinsatzCompletedHandler - Application Layer Implementation
 * @see EVENT_HANDLER.ETB_EINSATZ_COMPLETED - DI Token
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EinsatzCompletedEvent } from '@domain/events/einsatz-completed.event';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';

@Injectable()
export class EinsatzCompletedEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.ETB_EINSATZ_COMPLETED)
    private readonly handler: IEventHandler<EinsatzCompletedEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  @OnEvent(EinsatzCompletedEvent.eventName())
  async onEinsatzCompleted(event: EinsatzCompletedEvent): Promise<void> {
    this.logger.log(`Received EinsatzCompletedEvent für ETB-Sperrung`, {
      eventId: event.eventId,
      einsatzId: event.einsatzId.value,
      occurredAt: event.occurredAt,
      eventName: EinsatzCompletedEvent.eventName(),
    });
    await this.handler.handle(event);
  }
}
