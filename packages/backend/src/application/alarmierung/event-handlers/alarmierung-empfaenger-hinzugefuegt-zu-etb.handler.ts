import { Inject, Injectable } from '@nestjs/common';
import type { AlarmierungEmpfaengerHinzugefuegtEvent } from '@domain/events/alarmierung-empfaenger-hinzugefuegt.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragCommand, AddEintragHandler } from '@application/etb/commands';

/**
 * Application-Handler: Schreibt pro hinzugefügtem Alarmierungs-Empfänger
 * einen ETB-Eintrag (Kategorie `ALARMIERUNG`).
 *
 * Text: "Alarmiert: {nameSnapshot}"
 */
@Injectable()
export class AlarmierungEmpfaengerHinzugefuegtZuEtbHandler implements IEventHandler<AlarmierungEmpfaengerHinzugefuegtEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: AlarmierungEmpfaengerHinzugefuegtEvent): Promise<void> {
    try {
      const text = `Alarmiert: ${event.data.nameSnapshot}`;
      const commandResult = AddEintragCommand.create(
        event.einsatzId.value,
        text,
        'system',
        'ALARMIERUNG',
        event.einsatzId.value,
        undefined,
        undefined,
        {
          eventType: 'AlarmierungEmpfaengerHinzugefuegt',
          alarmierungId: event.alarmierungId.value,
          empfaengerId: event.data.empfaengerId.value,
          ref: event.data.ref,
        },
        event.occurredAt,
      );
      if (commandResult.isFailure || !commandResult.value) {
        this.logger.error('AlarmierungEmpfaengerHinzugefuegtZuEtbHandler: Command-Erstellung fehlgeschlagen', {
          alarmierungId: event.alarmierungId.value,
          empfaengerId: event.data.empfaengerId.value,
          error: commandResult.error,
        });
        return;
      }
      const result = await this.addEintragHandler.execute(commandResult.value);
      if (result.isFailure) {
        this.logger.error('AlarmierungEmpfaengerHinzugefuegtZuEtbHandler: ETB-Eintrag fehlgeschlagen', {
          alarmierungId: event.alarmierungId.value,
          empfaengerId: event.data.empfaengerId.value,
          error: result.error,
        });
      }
    } catch (error) {
      this.logger.error('AlarmierungEmpfaengerHinzugefuegtZuEtbHandler: unerwarteter Fehler', {
        alarmierungId: event.alarmierungId.value,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
