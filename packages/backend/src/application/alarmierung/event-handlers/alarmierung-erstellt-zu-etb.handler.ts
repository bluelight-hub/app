import { Inject, Injectable } from '@nestjs/common';
import type { AlarmierungErstelltEvent } from '@domain/events/alarmierung-erstellt.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragCommand, AddEintragHandler } from '@application/etb/commands';

/**
 * Application-Handler: Schreibt für jede neu ausgelöste Alarmierung einen
 * ETB-Eintrag (Kategorie `ALARMIERUNG`).
 *
 * Text: "Alarmierung ausgelöst: {bezeichnung} ({empfaengerCount} Empfänger)"
 *
 * **Fire-and-Forget:** Fehler werden geloggt, nicht propagiert.
 */
@Injectable()
export class AlarmierungErstelltZuEtbHandler implements IEventHandler<AlarmierungErstelltEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: AlarmierungErstelltEvent): Promise<void> {
    try {
      const empfaengerCount = event.data.empfaengerCount;
      const text = `Alarmierung ausgelöst: ${event.data.bezeichnung} (${empfaengerCount} Empfänger)`;

      const commandResult = AddEintragCommand.create(
        event.einsatzId.value,
        text,
        'system',
        'ALARMIERUNG',
        event.einsatzId.value,
        undefined,
        undefined,
        {
          eventType: 'AlarmierungErstellt',
          alarmierungId: event.alarmierungId.value,
          ursprungAlarmierungId: event.data.ursprungAlarmierungId,
        },
        event.occurredAt,
      );
      if (commandResult.isFailure || !commandResult.value) {
        this.logger.error('AlarmierungErstelltZuEtbHandler: Command-Erstellung fehlgeschlagen', {
          alarmierungId: event.alarmierungId.value,
          error: commandResult.error,
        });
        return;
      }

      const result = await this.addEintragHandler.execute(commandResult.value);
      if (result.isFailure) {
        this.logger.error('AlarmierungErstelltZuEtbHandler: ETB-Eintrag fehlgeschlagen', {
          alarmierungId: event.alarmierungId.value,
          error: result.error,
        });
      }
    } catch (error) {
      this.logger.error('AlarmierungErstelltZuEtbHandler: unerwarteter Fehler', {
        alarmierungId: event.alarmierungId.value,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
