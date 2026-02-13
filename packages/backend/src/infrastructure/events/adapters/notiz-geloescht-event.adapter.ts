/**
 * Infrastructure Event Adapter fuer NotizGeloescht Event Handling (Story 7.4).
 *
 * @module infrastructure/events/adapters
 * @see NotizGeloeschtEtbHandler - Application Layer Implementation
 * @see EVENT_HANDLER.NOTIZ_GELOESCHT_ETB - DI Token
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { NotizGeloeschtEvent } from '@domain/notiz/events/notiz-geloescht.event';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';

/**
 * NestJS Event Adapter fuer NotizGeloescht ETB-Eintrag Creation (Story 7.4).
 */
@Injectable()
export class NotizGeloeschtEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.NOTIZ_GELOESCHT_ETB)
    private readonly handler: IEventHandler<NotizGeloeschtEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  @OnEvent(NotizGeloeschtEvent.eventName())
  async onNotizGeloescht(event: NotizGeloeschtEvent): Promise<void> {
    this.logger.log(`Received NotizGeloeschtEvent`, {
      eventId: event.eventId,
      einsatzId: event.einsatzId,
      notizId: event.notizId.toString(),
      titel: event.titel,
      eventName: NotizGeloeschtEvent.eventName(),
    });

    await this.handler.handle(event);
  }
}
