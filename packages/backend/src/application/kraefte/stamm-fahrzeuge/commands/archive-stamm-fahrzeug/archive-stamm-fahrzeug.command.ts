import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Props für ArchiveStammFahrzeugCommand.create().
 */
export interface ArchiveStammFahrzeugProps {
  id: string;
  archivedBy: string;
}

/**
 * Command zum Archivieren eines Stamm-Fahrzeugs.
 *
 * **Story Context:**
 * Story 2-1 (Stamm-Fahrzeuge verwalten) - Application Layer Command
 */
export class ArchiveStammFahrzeugCommand {
  private constructor(
    public readonly id: string,
    public readonly archivedBy: string,
  ) {}

  /**
   * Factory Method mit Validation.
   */
  static create(props: ArchiveStammFahrzeugProps): Result<ArchiveStammFahrzeugCommand> {
    // Validation: id (CUID2 Format)
    const trimmedId = props.id?.trim() ?? '';
    if (trimmedId.length === 0) {
      return Result.fail<ArchiveStammFahrzeugCommand>('ID ist erforderlich');
    }
    if (!isCuid(trimmedId)) {
      return Result.fail<ArchiveStammFahrzeugCommand>('ID muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: archivedBy (CUID2 Format)
    const trimmedArchivedBy = props.archivedBy?.trim() ?? '';
    if (trimmedArchivedBy.length === 0) {
      return Result.fail<ArchiveStammFahrzeugCommand>('archivedBy ist erforderlich für Audit-Trail');
    }
    if (!isCuid(trimmedArchivedBy)) {
      return Result.fail<ArchiveStammFahrzeugCommand>('archivedBy muss ein gültiger CUID2-Identifier sein');
    }

    return Result.ok(new ArchiveStammFahrzeugCommand(trimmedId, trimmedArchivedBy));
  }
}
