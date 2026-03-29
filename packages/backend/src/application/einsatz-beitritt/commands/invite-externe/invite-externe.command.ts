import { validateRequiredStringResult } from '@application/common/validators/string-validator';
import { Result } from '@domain/common/result';

/**
 * Command zum Einladen eines EXTERNE-Users in einen Einsatz.
 *
 * Eine Führungskraft lädt einen User mit operativer Rolle EXTERNE ein.
 * Die Beitrittsanfrage wird direkt mit Status GENEHMIGT erstellt,
 * da es sich um eine FK-initiierte Einladung handelt.
 */
export class InviteExterneCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly userId: string,
    public readonly invitedBy: string,
  ) {}

  /**
   * Factory-Methode mit Validierung.
   * Verwendet Result<T> Pattern für explizite Fehlerbehandlung.
   */
  public static create(einsatzId: string, userId: string, invitedBy: string): Result<InviteExterneCommand> {
    const einsatzIdError = validateRequiredStringResult(einsatzId, 'einsatzId');
    if (einsatzIdError) return Result.fail(einsatzIdError);

    const userIdError = validateRequiredStringResult(userId, 'userId');
    if (userIdError) return Result.fail(userIdError);

    const invitedByError = validateRequiredStringResult(invitedBy, 'invitedBy');
    if (invitedByError) return Result.fail(invitedByError);

    return Result.ok(new InviteExterneCommand(einsatzId.trim(), userId.trim(), invitedBy.trim()));
  }
}
