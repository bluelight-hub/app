import { Inject, Injectable } from '@nestjs/common';
import type { AlarmierungErstelltEvent } from '@domain/events/alarmierung-erstellt.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragHandler } from '@application/etb/commands';
import { executeAlarmierungEtbCommand } from './etb-eintrag.helper';

/**
 * Application-Handler: Schreibt für jede neu ausgelöste Alarmierung einen
 * ETB-Eintrag (Kategorie `ALARMIERUNG`).
 *
 * Text: "Alarmierung ausgelöst: {bezeichnung} ({empfaengerCount} Empfänger)"
 *
 * **Fire-and-Forget:** Fehler werden geloggt, nicht propagiert
 * (Delegation an {@link executeAlarmierungEtbCommand}).
 */
@Injectable()
export class AlarmierungErstelltZuEtbHandler implements IEventHandler<AlarmierungErstelltEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: AlarmierungErstelltEvent): Promise<void> {
    const empfaengerCount = event.data.empfaengerCount;
    const text = `Alarmierung ausgelöst: ${event.data.bezeichnung} (${empfaengerCount} Empfänger)`;
    const metadata = {
      eventType: 'AlarmierungErstellt',
      alarmierungId: event.alarmierungId.value,
      ursprungAlarmierungId: event.data.ursprungAlarmierungId,
    };

    await executeAlarmierungEtbCommand(this.addEintragHandler, this.logger, {
      handlerName: 'AlarmierungErstelltZuEtbHandler',
      einsatzId: event.einsatzId.value,
      alarmierungId: event.alarmierungId.value,
      text,
      metadata,
      occurredAt: event.occurredAt,
    });
  }
}
