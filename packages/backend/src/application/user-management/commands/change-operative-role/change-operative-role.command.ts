import { Result } from '@domain/common/result';
import { OperativeRole } from '@domain/value-objects/operative-role';

/**
 * Command zum Ändern der operativen Rolle eines Users.
 *
 * Wird vom Admin über den AdminOperativeRoleController ausgelöst.
 * Validiert die neue Rolle gegen das OperativeRole Value Object.
 *
 * @example
 * ```typescript
 * const result = ChangeOperativeRoleCommand.create({
 *   userId: 'clx_user_abc123',
 *   newRole: 'FUEHRUNGSKRAFT',
 *   changedBy: 'clx_admin_xyz789',
 * });
 * if (result.isSuccess) {
 *   await handler.execute(result.value);
 * }
 * ```
 */
export class ChangeOperativeRoleCommand {
  private constructor(
    public readonly userId: string,
    public readonly newRole: string,
    public readonly changedBy: string,
  ) {}

  /**
   * Factory-Methode mit Validierung.
   * Prüft ob userId und changedBy vorhanden sind und ob newRole ein gültiger Wert ist.
   */
  public static create(props: { userId: string; newRole: string; changedBy: string }): Result<ChangeOperativeRoleCommand> {
    if (!props.userId?.trim()) return Result.fail('userId ist erforderlich');
    if (!props.changedBy?.trim()) return Result.fail('changedBy ist erforderlich');

    const roleResult = OperativeRole.create(props.newRole);
    if (roleResult.isFailure) return Result.fail(roleResult.error!);

    return Result.ok(new ChangeOperativeRoleCommand(props.userId.trim(), props.newRole, props.changedBy.trim()));
  }
}
