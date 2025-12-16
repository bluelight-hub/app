import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Props für ArchiveStammPersonCommand.create().
 */
export interface ArchiveStammPersonProps {
  id: string;
  archivedBy: string;
}

/**
 * Command zum Archivieren einer Stamm-Person.
 *
 * **Story Context:**
 * Story 2-2 (Stamm-Personen verwalten) - Application Layer Command
 */
export class ArchiveStammPersonCommand {
  private constructor(
    public readonly id: string,
    public readonly archivedBy: string,
  ) {}

  /**
   * Factory Method mit Validation.
   */
  static create(props: ArchiveStammPersonProps): Result<ArchiveStammPersonCommand> {
    // Validation: id (CUID2 Format)
    const trimmedId = props.id?.trim() ?? '';
    if (trimmedId.length === 0) {
      return Result.fail<ArchiveStammPersonCommand>('ID ist erforderlich');
    }
    if (!isCuid(trimmedId)) {
      return Result.fail<ArchiveStammPersonCommand>('ID muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: archivedBy (CUID2 Format)
    const trimmedArchivedBy = props.archivedBy?.trim() ?? '';
    if (trimmedArchivedBy.length === 0) {
      return Result.fail<ArchiveStammPersonCommand>('archivedBy ist erforderlich für Audit-Trail');
    }
    if (!isCuid(trimmedArchivedBy)) {
      return Result.fail<ArchiveStammPersonCommand>('archivedBy muss ein gültiger CUID2-Identifier sein');
    }

    return Result.ok(new ArchiveStammPersonCommand(trimmedId, trimmedArchivedBy));
  }
}
