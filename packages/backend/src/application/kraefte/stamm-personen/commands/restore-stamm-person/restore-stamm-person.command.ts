import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Props für RestoreStammPersonCommand.create().
 */
export interface RestoreStammPersonProps {
  id: string;
  restoredBy: string;
}

/**
 * Command zum Reaktivieren einer archivierten Stamm-Person.
 *
 * **Story Context:**
 * Story 2-2 (Stamm-Personen verwalten) - Application Layer Command
 *
 * **AC8: Reaktivierung archivierter Personen:**
 * - Entfernt archivedAt/archivedBy Felder
 * - Macht Person wieder in Dropdowns verfügbar
 * - Prüft ob Person archiviert ist (Result.fail wenn nicht archiviert)
 */
export class RestoreStammPersonCommand {
  private constructor(
    public readonly id: string,
    public readonly restoredBy: string,
  ) {}

  /**
   * Factory Method mit Validation.
   */
  static create(props: RestoreStammPersonProps): Result<RestoreStammPersonCommand> {
    // Validation: id (CUID2 Format)
    const trimmedId = props.id?.trim() ?? '';
    if (trimmedId.length === 0) {
      return Result.fail<RestoreStammPersonCommand>('ID ist erforderlich');
    }
    if (!isCuid(trimmedId)) {
      return Result.fail<RestoreStammPersonCommand>('ID muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: restoredBy (CUID2 Format)
    const trimmedRestoredBy = props.restoredBy?.trim() ?? '';
    if (trimmedRestoredBy.length === 0) {
      return Result.fail<RestoreStammPersonCommand>('restoredBy ist erforderlich für Audit-Trail');
    }
    if (!isCuid(trimmedRestoredBy)) {
      return Result.fail<RestoreStammPersonCommand>('restoredBy muss ein gültiger CUID2-Identifier sein');
    }

    return Result.ok(new RestoreStammPersonCommand(trimmedId, trimmedRestoredBy));
  }
}
