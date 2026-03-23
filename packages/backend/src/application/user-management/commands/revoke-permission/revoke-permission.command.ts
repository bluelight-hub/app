import { Result } from '@domain/common/result';

/**
 * Command fuer das Entziehen einer Custom Permission von einem User.
 *
 * Kapselt alle Parameter fuer die Revoke Permission Operation.
 * Folgt Command Pattern fuer CQRS Architecture.
 */
export class RevokePermissionCommand {
  private constructor(
    public readonly userId: string,
    public readonly permission: string,
    public readonly revokedBy: string,
  ) {}

  /**
   * Factory Method mit Basic Validation.
   *
   * @param props - Command Properties
   * @returns Result<RevokePermissionCommand>
   */
  static create(props: { userId: string; permission: string; revokedBy: string }): Result<RevokePermissionCommand> {
    if (!props.userId?.trim()) {
      return Result.fail<RevokePermissionCommand>('User ID is required');
    }

    if (!props.permission?.trim()) {
      return Result.fail<RevokePermissionCommand>('Permission is required');
    }

    if (!props.revokedBy?.trim()) {
      return Result.fail<RevokePermissionCommand>('RevokedBy ID is required');
    }

    return Result.ok<RevokePermissionCommand>(new RevokePermissionCommand(props.userId.trim(), props.permission.trim(), props.revokedBy.trim()));
  }
}
