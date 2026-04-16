/**
 * Infrastructure Adapter: empfängt `AlarmierungAbgeschlossenEvent` via
 * NestJS EventEmitter und delegiert an den framework-agnostischen
 * {@link AlarmierungAbgeschlossenZuEtbHandler}.
 *
 * @module infrastructure/events/adapters
 * @see EVENT_HANDLER.ALARMIERUNG_ABGESCHLOSSEN_ZU_ETB — DI-Token
 */
import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { AlarmierungAbgeschlossenEvent } from '@domain/events/alarmierung-abgeschlossen.event';
import { EVENT_NAMES } from '@domain/events/event-names';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { EVENT_HANDLER } from '@infrastructure/di-tokens';

@Injectable()
export class AlarmierungAbgeschlossenEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.ALARMIERUNG_ABGESCHLOSSEN_ZU_ETB)
    private readonly handler: IEventHandler<AlarmierungAbgeschlossenEvent>,
  ) {}

  @OnEvent(EVENT_NAMES.ALARMIERUNG.ABGESCHLOSSEN)
  async onAbgeschlossen(event: AlarmierungAbgeschlossenEvent): Promise<void> {
    await this.handler.handle(event);
  }
}
