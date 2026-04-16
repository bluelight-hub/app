/**
 * Infrastructure Adapter: empfängt `AlarmierungErstelltEvent` via NestJS
 * EventEmitter und delegiert an den framework-agnostischen
 * {@link AlarmierungErstelltZuEtbHandler}.
 *
 * @module infrastructure/events/adapters
 * @see EVENT_HANDLER.ALARMIERUNG_ERSTELLT_ZU_ETB — DI-Token
 */
import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { AlarmierungErstelltEvent } from '@domain/events/alarmierung-erstellt.event';
import { EVENT_NAMES } from '@domain/events/event-names';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { EVENT_HANDLER } from '@infrastructure/di-tokens';

@Injectable()
export class AlarmierungErstelltEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.ALARMIERUNG_ERSTELLT_ZU_ETB)
    private readonly handler: IEventHandler<AlarmierungErstelltEvent>,
  ) {}

  @OnEvent(EVENT_NAMES.ALARMIERUNG.ERSTELLT)
  async onAlarmierungErstellt(event: AlarmierungErstelltEvent): Promise<void> {
    await this.handler.handle(event);
  }
}
