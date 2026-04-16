/**
 * Infrastructure Adapter: empfängt `AlarmierungEmpfaengerHinzugefuegtEvent`
 * via NestJS EventEmitter und delegiert an den framework-agnostischen
 * {@link AlarmierungEmpfaengerHinzugefuegtZuEtbHandler}.
 *
 * @module infrastructure/events/adapters
 * @see EVENT_HANDLER.ALARMIERUNG_EMPFAENGER_HINZUGEFUEGT_ZU_ETB — DI-Token
 */
import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { AlarmierungEmpfaengerHinzugefuegtEvent } from '@domain/events/alarmierung-empfaenger-hinzugefuegt.event';
import { EVENT_NAMES } from '@domain/events/event-names';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { EVENT_HANDLER } from '@infrastructure/di-tokens';

@Injectable()
export class AlarmierungEmpfaengerHinzugefuegtEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.ALARMIERUNG_EMPFAENGER_HINZUGEFUEGT_ZU_ETB)
    private readonly handler: IEventHandler<AlarmierungEmpfaengerHinzugefuegtEvent>,
  ) {}

  @OnEvent(EVENT_NAMES.ALARMIERUNG.EMPFAENGER_HINZUGEFUEGT)
  async onEmpfaengerHinzugefuegt(event: AlarmierungEmpfaengerHinzugefuegtEvent): Promise<void> {
    await this.handler.handle(event);
  }
}
