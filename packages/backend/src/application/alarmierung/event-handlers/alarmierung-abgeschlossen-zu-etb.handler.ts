import { Inject, Injectable } from '@nestjs/common';
import type { AlarmierungAbgeschlossenEvent } from '@domain/events/alarmierung-abgeschlossen.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragCommand, AddEintragHandler } from '@application/etb/commands';

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
 */
@Injectable()
export class AlarmierungAbgeschlossenZuEtbHandler implements IEventHandler<AlarmierungAbgeschlossenEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: AlarmierungAbgeschlossenEvent): Promise<void> {
    try {
      const text = `Alarmierung abgeschlossen (durch ${event.abgeschlossenVon})`;
      const commandResult = AddEintragCommand.create(
        event.einsatzId.value,
        text,
        'system',
        'ALARMIERUNG',
        event.einsatzId.value,
        undefined,
        undefined,
        {
          eventType: 'AlarmierungAbgeschlossen',
          alarmierungId: event.alarmierungId.value,
          abgeschlossenVon: event.abgeschlossenVon,
        },
        event.occurredAt,
      );
      if (commandResult.isFailure || !commandResult.value) {
        this.logger.error('AlarmierungAbgeschlossenZuEtbHandler: Command-Erstellung fehlgeschlagen', {
          alarmierungId: event.alarmierungId.value,
          error: commandResult.error,
        });
        return;
      }
      const result = await this.addEintragHandler.execute(commandResult.value);
      if (result.isFailure) {
        this.logger.error('AlarmierungAbgeschlossenZuEtbHandler: ETB-Eintrag fehlgeschlagen', {
          alarmierungId: event.alarmierungId.value,
          error: result.error,
        });
      }
    } catch (error) {
      this.logger.error('AlarmierungAbgeschlossenZuEtbHandler: unerwarteter Fehler', {
        alarmierungId: event.alarmierungId.value,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
