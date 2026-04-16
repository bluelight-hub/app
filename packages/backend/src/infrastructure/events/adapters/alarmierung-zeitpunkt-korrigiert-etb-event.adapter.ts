/**
 * Infrastructure Adapter: empfängt `AlarmierungZeitpunktKorrigiertEvent`
 * via NestJS EventEmitter und delegiert an den framework-agnostischen
 * {@link AlarmierungZeitpunktKorrigiertZuEtbHandler}.
 *
 * @module infrastructure/events/adapters
 * @see EVENT_HANDLER.ALARMIERUNG_ZEITPUNKT_KORRIGIERT_ZU_ETB — DI-Token
 */
import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { AlarmierungZeitpunktKorrigiertEvent } from '@domain/events/alarmierung-zeitpunkt-korrigiert.event';
import { EVENT_NAMES } from '@domain/events/event-names';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { EVENT_HANDLER } from '@infrastructure/di-tokens';

@Injectable()
export class AlarmierungZeitpunktKorrigiertEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.ALARMIERUNG_ZEITPUNKT_KORRIGIERT_ZU_ETB)
    private readonly handler: IEventHandler<AlarmierungZeitpunktKorrigiertEvent>,
  ) {}

  @OnEvent(EVENT_NAMES.ALARMIERUNG.ZEITPUNKT_KORRIGIERT)
  async onZeitpunktKorrigiert(event: AlarmierungZeitpunktKorrigiertEvent): Promise<void> {
    await this.handler.handle(event);
  }
}
