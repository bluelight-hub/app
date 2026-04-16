import type { ILogger } from '@domain/ports/i-logger.port';
import { AddEintragCommand, type AddEintragHandler } from '@application/etb/commands';

/**
 * Gemeinsames Skelett für Alarmierungs-ETB-Handler.
 *
 * Alle vier Handler (`AlarmierungErstelltZuEtb`, `AlarmierungEmpfaengerHinzugefuegtZuEtb`,
 * `AlarmierungZeitpunktKorrigiertZuEtb`, `AlarmierungAbgeschlossenZuEtb`) folgen
 * demselben Ablauf: `AddEintragCommand.create` → isFailure-Check → `addEintragHandler.execute`
 * → Error-Log. Die Funktion hebt diese Struktur raus, damit die Handler selbst nur
 * noch die semantischen Unterschiede enthalten (Text-Build + metadata-Payload).
 *
 * **Fehler-Semantik:** Fire-and-Forget — alle Fehler werden geloggt, nie geworfen.
 * Der Alarmierungs-Flow darf nicht abbrechen, wenn die ETB-Spiegelung scheitert.
 */
export interface AlarmierungEtbCommandParams {
  readonly handlerName: string;
  readonly einsatzId: string;
  readonly alarmierungId: string;
  readonly text: string;
  readonly metadata: Record<string, unknown>;
  readonly occurredAt: Date;
  /** Zusätzliche Log-Kontextfelder, die bei Fehlerlogs mitgeschrieben werden. */
  readonly extraLogContext?: Record<string, unknown>;
}

export async function executeAlarmierungEtbCommand(addEintragHandler: AddEintragHandler, logger: ILogger, params: AlarmierungEtbCommandParams): Promise<void> {
  const { handlerName, einsatzId, alarmierungId, text, metadata, occurredAt, extraLogContext = {} } = params;
  const baseLog = { alarmierungId, ...extraLogContext };

  try {
    const commandResult = AddEintragCommand.create(
      einsatzId, // etbId — ETB ist 1:1 an Einsatz gebunden, deshalb einsatzId auch hier
      text,
      'system',
      'ALARMIERUNG',
      einsatzId,
      undefined,
      undefined,
      metadata,
      occurredAt,
    );
    if (commandResult.isFailure || !commandResult.value) {
      logger.error(`${handlerName}: Command-Erstellung fehlgeschlagen`, {
        ...baseLog,
        error: commandResult.error,
      });
      return;
    }

    const result = await addEintragHandler.execute(commandResult.value);
    if (result.isFailure) {
      logger.error(`${handlerName}: ETB-Eintrag fehlgeschlagen`, {
        ...baseLog,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error(`${handlerName}: unerwarteter Fehler`, {
      ...baseLog,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
