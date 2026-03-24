/**
 * DisconnectHiOrgCommand - HiOrg-Server Integration trennen.
 *
 * @module application/integrations/commands/disconnect-hiorg
 */

import { Result } from '@domain/common/result';

/**
 * Command zum Trennen der HiOrg-Server Integration.
 */
export class DisconnectHiOrgCommand {
  private constructor(public readonly userId: string) {}

  static create(props: { userId: string }): Result<DisconnectHiOrgCommand> {
    if (!props.userId || props.userId.trim().length === 0) {
      return Result.fail('userId ist erforderlich');
    }
    return Result.ok(new DisconnectHiOrgCommand(props.userId));
  }
}
