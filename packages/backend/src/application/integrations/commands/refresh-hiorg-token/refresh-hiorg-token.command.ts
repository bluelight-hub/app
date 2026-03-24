/**
 * RefreshHiOrgTokenCommand - Manuelles Token-Refresh für HiOrg-Server OAuth2.
 *
 * @module application/integrations/commands/refresh-hiorg-token
 */

import { Result } from '@domain/common/result';

/**
 * Command zum manuellen Auslösen eines OAuth2 Token-Refresh.
 */
export class RefreshHiOrgTokenCommand {
  private constructor(public readonly userId: string) {}

  static create(props: { userId: string }): Result<RefreshHiOrgTokenCommand> {
    if (!props.userId || props.userId.trim().length === 0) {
      return Result.fail('userId ist erforderlich');
    }
    return Result.ok(new RefreshHiOrgTokenCommand(props.userId));
  }
}
