import { Inject, Injectable } from '@nestjs/common';
import type { AlarmierungEmpfaengerHinzugefuegtEvent } from '@domain/events/alarmierung-empfaenger-hinzugefuegt.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragHandler } from '@application/etb/commands';
import { executeAlarmierungEtbCommand } from './etb-eintrag.helper';

/**
 * Application-Handler: Schreibt pro hinzugefügtem Alarmierungs-Empfänger
 * einen ETB-Eintrag (Kategorie `ALARMIERUNG`).
 *
 * Text: "Alarmiert: {nameSnapshot}"
 *
 * **Fire-and-Forget:** siehe {@link executeAlarmierungEtbCommand}.
 */
@Injectable()
export class AlarmierungEmpfaengerHinzugefuegtZuEtbHandler implements IEventHandler<AlarmierungEmpfaengerHinzugefuegtEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: AlarmierungEmpfaengerHinzugefuegtEvent): Promise<void> {
    const text = `Alarmiert: ${event.data.nameSnapshot}`;
    const metadata = {
      eventType: 'AlarmierungEmpfaengerHinzugefuegt',
      alarmierungId: event.alarmierungId.value,
      empfaengerId: event.data.empfaengerId.value,
      ref: event.data.ref,
    };

    await executeAlarmierungEtbCommand(this.addEintragHandler, this.logger, {
      handlerName: 'AlarmierungEmpfaengerHinzugefuegtZuEtbHandler',
      einsatzId: event.einsatzId.value,
      alarmierungId: event.alarmierungId.value,
      text,
      metadata,
      occurredAt: event.occurredAt,
      extraLogContext: { empfaengerId: event.data.empfaengerId.value },
    });
  }
}
