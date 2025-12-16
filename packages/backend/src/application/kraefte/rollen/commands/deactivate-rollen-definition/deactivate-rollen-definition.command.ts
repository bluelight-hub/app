import { Result } from '@domain/common/result';

/**
 * Command zum Deaktivieren einer RollenDefinition (Soft-Delete).
 */
export class DeactivateRollenDefinitionCommand {
  private constructor(
    public readonly id: string,
    public readonly deactivatedBy: string,
  ) {}

  /**
   * Factory-Methode mit Validierung.
   */
  static create(props: { id: string; deactivatedBy: string }): Result<DeactivateRollenDefinitionCommand> {
    if (!props.id || props.id.trim().length === 0) {
      return Result.fail<DeactivateRollenDefinitionCommand>('ID ist erforderlich');
    }

    if (!props.deactivatedBy || props.deactivatedBy.trim().length === 0) {
      return Result.fail<DeactivateRollenDefinitionCommand>('deactivatedBy ist erforderlich');
    }

    return Result.ok<DeactivateRollenDefinitionCommand>(new DeactivateRollenDefinitionCommand(props.id.trim(), props.deactivatedBy.trim()));
  }
}
