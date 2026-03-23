import { Result } from '@domain/common/result';

/**
 * Command fuer das Gewaehren einer Custom Permission an einen User.
 *
 * Kapselt alle Parameter fuer die Grant Permission Operation.
 * Folgt Command Pattern fuer CQRS Architecture.
 */
export class GrantPermissionCommand {
  private constructor(
    public readonly userId: string,
    public readonly permission: string,
    public readonly grantedBy: string,
  ) {}

  /**
   * Factory Method mit Basic Validation.
   *
   * @param props - Command Properties
   * @returns Result<GrantPermissionCommand>
   */
  static create(props: { userId: string; permission: string; grantedBy: string }): Result<GrantPermissionCommand> {
    if (!props.userId?.trim()) {
      return Result.fail<GrantPermissionCommand>('User ID is required');
    }

    if (!props.permission?.trim()) {
      return Result.fail<GrantPermissionCommand>('Permission is required');
    }

    if (!props.grantedBy?.trim()) {
      return Result.fail<GrantPermissionCommand>('GrantedBy ID is required');
    }

    return Result.ok<GrantPermissionCommand>(new GrantPermissionCommand(props.userId.trim(), props.permission.trim(), props.grantedBy.trim()));
  }
}
