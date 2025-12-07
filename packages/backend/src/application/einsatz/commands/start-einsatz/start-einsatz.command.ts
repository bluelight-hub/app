import { validateRequiredStringResult } from '@application/common/validators/string-validator';
import { Result } from '@domain/common/result';

/**
 * Command zum Starten eines Einsatzes (Transition zu IN_BEARBEITUNG).
 *
 * Kapselt alle erforderlichen Daten für die start()-Operation:
 * - einsatzId: ID des zu startenden Einsatzes
 * - startedBy: User-ID des startenden Users (für Audit-Trail)
 *
 * Diese Operation setzt den Einsatz-Status auf IN_BEARBEITUNG wenn er aktuell ANGELEGT ist.
 * Dies ist semantisch wichtig, da ein Einsatz erst "gestartet" wird wenn er vollständig
 * geöffnet wird (nicht nur in der Liste angezeigt wird).
 */
export class StartEinsatzCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly startedBy: string,
  ) {}

  /**
   * Factory-Methode mit Validierung.
   * Verwendet Result<T> Pattern für explizite Fehlerbehandlung.
   */
  public static create(einsatzId: string, startedBy: string): Result<StartEinsatzCommand> {
    // einsatzId ist Pflichtfeld
    const einsatzIdError = validateRequiredStringResult(einsatzId, 'einsatzId');
    if (einsatzIdError) return Result.fail(einsatzIdError);

    // startedBy ist required für Audit Trail
    const startedByError = validateRequiredStringResult(startedBy, 'startedBy');
    if (startedByError) return Result.fail(startedByError);

    return Result.ok(new StartEinsatzCommand(einsatzId.trim(), startedBy.trim()));
  }
}
