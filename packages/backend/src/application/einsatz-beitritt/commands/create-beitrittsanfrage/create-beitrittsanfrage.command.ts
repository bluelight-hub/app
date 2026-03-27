import { validateRequiredStringResult } from '@application/common/validators/string-validator';
import { Result } from '@domain/common/result';

/**
 * Command zum Erstellen einer Beitrittsanfrage für einen Einsatz.
 *
 * Eine Einsatzkraft stellt eine Anfrage, einem laufenden Einsatz beizutreten.
 * Die Anfrage muss von einer Führungskraft genehmigt oder abgelehnt werden.
 */
export class CreateBeitrittsanfrageCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly userId: string,
  ) {}

  /**
   * Factory-Methode mit Validierung.
   * Verwendet Result<T> Pattern für explizite Fehlerbehandlung.
   */
  public static create(einsatzId: string, userId: string): Result<CreateBeitrittsanfrageCommand> {
    const einsatzIdError = validateRequiredStringResult(einsatzId, 'einsatzId');
    if (einsatzIdError) return Result.fail(einsatzIdError);

    const userIdError = validateRequiredStringResult(userId, 'userId');
    if (userIdError) return Result.fail(userIdError);

    return Result.ok(new CreateBeitrittsanfrageCommand(einsatzId.trim(), userId.trim()));
  }
}
