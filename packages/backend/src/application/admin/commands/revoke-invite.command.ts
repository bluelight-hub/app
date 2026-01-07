import { Result } from '@domain/common/result';

/**
 * Command zum Widerrufen eines Invite-Codes.
 *
 * Enthält die notwendigen Daten um einen InviteCode permanent
 * als widerrufen zu markieren. Der Code kann danach nicht mehr
 * für Registrierungen verwendet werden.
 *
 * **Validierung:**
 * - inviteCodeId: Muss vorhanden sein (nicht leer)
 * - revokedById: Muss vorhanden sein (nicht leer)
 *
 * @example
 * ```typescript
 * const result = RevokeInviteCommand.create({
 *   inviteCodeId: 'inv_abc123def456ghi789jkl012',
 *   revokedById: 'user_admin123',
 * });
 *
 * if (result.isSuccess) {
 *   await handler.execute(result.value);
 * }
 * ```
 */
export class RevokeInviteCommand {
  /**
   * Private Constructor erzwingt Factory Method Nutzung.
   */
  private constructor(
    /** ID des zu widerrufenden InviteCodes */
    public readonly inviteCodeId: string,
    /** ID des Admin-Users der den Widerruf durchführt */
    public readonly revokedById: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param props - Command Properties
   * @returns Result<RevokeInviteCommand> - Success mit Command oder Failure mit Fehler
   */
  static create(props: { inviteCodeId: string; revokedById: string }): Result<RevokeInviteCommand> {
    if (!props.inviteCodeId || props.inviteCodeId.trim() === '') {
      return Result.fail<RevokeInviteCommand>('Invite-Code-ID erforderlich');
    }
    if (!props.revokedById || props.revokedById.trim() === '') {
      return Result.fail<RevokeInviteCommand>('Revoker-ID erforderlich');
    }
    return Result.ok(new RevokeInviteCommand(props.inviteCodeId.trim(), props.revokedById.trim()));
  }
}
