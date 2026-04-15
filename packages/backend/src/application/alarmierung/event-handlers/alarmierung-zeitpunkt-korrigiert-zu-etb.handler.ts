import { Inject, Injectable } from '@nestjs/common';
import type { AlarmierungZeitpunktKorrigiertEvent } from '@domain/events/alarmierung-zeitpunkt-korrigiert.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragCommand, AddEintragHandler } from '@application/etb/commands';

/**
 * Application-Handler: Schreibt für jede manuelle Zeitpunkt-Korrektur einen
 * ETB-Eintrag (Kategorie `ALARMIERUNG`) mit altem → neuem Wert.
 *
 * Text: "Zeitpunkt korrigiert ({feld}): {nameSnapshot} – {alterWert} → {neuerWert} (durch {korrigiertVon})"
 */
@Injectable()
export class AlarmierungZeitpunktKorrigiertZuEtbHandler implements IEventHandler<AlarmierungZeitpunktKorrigiertEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: AlarmierungZeitpunktKorrigiertEvent): Promise<void> {
    try {
      const alt = formatTimestamp(event.data.alterWert);
      const neu = formatTimestamp(event.data.neuerWert);
      const text = `Zeitpunkt korrigiert (${event.data.feld}): ${event.data.nameSnapshot} – ${alt} → ${neu} (durch ${event.data.korrigiertVon})`;
      const commandResult = AddEintragCommand.create(
        event.einsatzId.value,
        text,
        'system',
        'ALARMIERUNG',
        event.einsatzId.value,
        undefined,
        undefined,
        {
          eventType: 'AlarmierungZeitpunktKorrigiert',
          alarmierungId: event.alarmierungId.value,
          empfaengerId: event.data.empfaengerId.value,
          feld: event.data.feld,
          alterWert: event.data.alterWert?.toISOString() ?? null,
          neuerWert: event.data.neuerWert?.toISOString() ?? null,
          korrigiertVon: event.data.korrigiertVon,
        },
        event.occurredAt,
      );
      if (commandResult.isFailure || !commandResult.value) {
        this.logger.error('AlarmierungZeitpunktKorrigiertZuEtbHandler: Command-Erstellung fehlgeschlagen', {
          alarmierungId: event.alarmierungId.value,
          error: commandResult.error,
        });
        return;
      }
      const result = await this.addEintragHandler.execute(commandResult.value);
      if (result.isFailure) {
        this.logger.error('AlarmierungZeitpunktKorrigiertZuEtbHandler: ETB-Eintrag fehlgeschlagen', {
          alarmierungId: event.alarmierungId.value,
          error: result.error,
        });
      }
    } catch (error) {
      this.logger.error('AlarmierungZeitpunktKorrigiertZuEtbHandler: unerwarteter Fehler', {
        alarmierungId: event.alarmierungId.value,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function formatTimestamp(value: Date | null): string {
  return value ? value.toISOString() : '∅';
}
