import { Result } from '@domain/common/result';

/**
 * Command zum Deaktivieren eines Fahrzeugtyps (Soft-Delete).
 */
export class DeactivateFahrzeugtypCommand {
  private constructor(
    public readonly id: string,
    public readonly updatedBy: string,
  ) {}

  /**
   * Factory-Methode mit Validierung.
   */
  static create(props: { id: string; updatedBy: string }): Result<DeactivateFahrzeugtypCommand> {
    if (!props.id || props.id.trim().length === 0) {
      return Result.fail<DeactivateFahrzeugtypCommand>('ID ist erforderlich');
    }

    if (!props.updatedBy || props.updatedBy.trim().length === 0) {
      return Result.fail<DeactivateFahrzeugtypCommand>('updatedBy ist erforderlich');
    }

    return Result.ok<DeactivateFahrzeugtypCommand>(new DeactivateFahrzeugtypCommand(props.id.trim(), props.updatedBy.trim()));
  }
}
