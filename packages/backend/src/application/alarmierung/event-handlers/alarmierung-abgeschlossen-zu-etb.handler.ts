import { Inject, Injectable } from '@nestjs/common';
import type { AlarmierungAbgeschlossenEvent } from '@domain/events/alarmierung-abgeschlossen.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragHandler } from '@application/etb/commands';
import { executeAlarmierungEtbCommand } from './etb-eintrag.helper';

/**
 * Application-Handler: Schreibt einen ETB-Eintrag, wenn eine Alarmierung
 * abgeschlossen wurde.
 *
 * Text: "Alarmierung abgeschlossen (durch {abgeschlossenVon})"
 *
 * **Hinweis Event-Form:** {@link AlarmierungAbgeschlossenEvent} legt
 * `abgeschlossenVon` direkt als Constructor-Property auf der Event-Wurzel ab
 * (kein `data`-Wrapper) — abweichend von den anderen Alarmierungs-Events,
 * die einen `data`-Block tragen. Bei Anpassung der Event-Serialisierung in
 * T4 (Outbox-Adapter) muss das berücksichtigt werden.
 *
 * **Fire-and-Forget:** siehe {@link executeAlarmierungEtbCommand}.
 */
@Injectable()
export class AlarmierungAbgeschlossenZuEtbHandler implements IEventHandler<AlarmierungAbgeschlossenEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: AlarmierungAbgeschlossenEvent): Promise<void> {
    const text = `Alarmierung abgeschlossen (durch ${event.abgeschlossenVon})`;
    const metadata = {
      eventType: 'AlarmierungAbgeschlossen',
      alarmierungId: event.alarmierungId.value,
      abgeschlossenVon: event.abgeschlossenVon,
    };

    await executeAlarmierungEtbCommand(this.addEintragHandler, this.logger, {
      handlerName: 'AlarmierungAbgeschlossenZuEtbHandler',
      einsatzId: event.einsatzId.value,
      alarmierungId: event.alarmierungId.value,
      text,
      metadata,
      occurredAt: event.occurredAt,
    });
  }
}
