/**
 * Infrastructure Event Adapter: delegiert `EintragAddedEvent` an den
 * `NotfallFunkspruchAlertHandler` (Application Layer), der bei Notfall-
 * Funksprüchen den {@link NotfallAlertRequestedEvent} publiziert.
 *
 * **Adapter Pattern:**
 * - Infrastructure (dieser Adapter): @OnEvent Decorator, framework-spezifisch
 * - Application (NotfallFunkspruchAlertHandler): framework-agnostisch
 *
 * @module infrastructure/events/adapters
 */
import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EintragAddedEvent } from '@domain/events/eintrag-added.event';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';

@Injectable()
export class NotfallFunkspruchAlertEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.NOTFALL_FUNKSPRUCH_ALERT) private readonly handler: IEventHandler<EintragAddedEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  @OnEvent(EintragAddedEvent.eventName())
  async onEintragAdded(event: EintragAddedEvent): Promise<void> {
    if (event.kontext?.type !== 'funkspruch') {
      return;
    }
    this.logger.debug('NotfallFunkspruchAlertEventAdapter: delegating EintragAddedEvent', {
      eventId: event.eventId,
      eintragId: event.eintragId.value,
      funkPrioritaet: event.kontext.funkPrioritaet,
    });
    await this.handler.handle(event);
  }
}
