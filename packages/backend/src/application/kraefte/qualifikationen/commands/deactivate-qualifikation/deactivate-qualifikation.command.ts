import { Result } from '@domain/common/result';

/**
 * Command zum Deaktivieren einer Qualifikation (Soft-Delete).
 */
export class DeactivateQualifikationCommand {
  private constructor(
    public readonly id: string,
    public readonly updatedBy: string,
  ) {}

  /**
   * Factory-Methode mit Validierung.
   */
  static create(props: { id: string; updatedBy: string }): Result<DeactivateQualifikationCommand> {
    if (!props.id || props.id.trim().length === 0) {
      return Result.fail<DeactivateQualifikationCommand>('ID ist erforderlich');
    }

    if (!props.updatedBy || props.updatedBy.trim().length === 0) {
      return Result.fail<DeactivateQualifikationCommand>('updatedBy ist erforderlich');
    }

    return Result.ok<DeactivateQualifikationCommand>(new DeactivateQualifikationCommand(props.id.trim(), props.updatedBy.trim()));
  }
}
