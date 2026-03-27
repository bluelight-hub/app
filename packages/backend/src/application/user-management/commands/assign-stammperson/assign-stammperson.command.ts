import { Result } from '@domain/common/result';

/**
 * Command zum Zuweisen einer Stammperson zu einem User.
 *
 * Wird vom Admin über den AdminOperativeRoleController ausgelöst.
 * stammpersonId kann null sein, um die Zuweisung zu entfernen.
 *
 * @example
 * ```typescript
 * const result = AssignStammpersonCommand.create({
 *   userId: 'clx_user_abc123',
 *   stammpersonId: 'clx_stammperson_xyz789',
 *   assignedBy: 'clx_admin_xyz789',
 * });
 * if (result.isSuccess) {
 *   await handler.execute(result.value);
 * }
 * ```
 */
export class AssignStammpersonCommand {
  private constructor(
    public readonly userId: string,
    public readonly stammpersonId: string | null,
    public readonly assignedBy: string,
  ) {}

  /**
   * Factory-Methode mit Validierung.
   * Prüft ob userId und assignedBy vorhanden sind.
   */
  public static create(props: { userId: string; stammpersonId: string | null; assignedBy: string }): Result<AssignStammpersonCommand> {
    if (!props.userId?.trim()) return Result.fail('userId ist erforderlich');
    if (!props.assignedBy?.trim()) return Result.fail('assignedBy ist erforderlich');

    return Result.ok(new AssignStammpersonCommand(props.userId.trim(), props.stammpersonId, props.assignedBy.trim()));
  }
}
