import { Result } from '@domain/common/result';

/**
 * Command zum Beitreten eines Einsatzes mit einem Funkrufnamen.
 *
 * Erstellt einen EinsatzTeilnehmer-Eintrag der den User mit seinem
 * gewählten Funkrufnamen dem Einsatz zuordnet.
 */
export class JoinEinsatzCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly userId: string,
    public readonly funkrufname: string,
  ) {}

  /**
   * Factory-Methode für JoinEinsatzCommand mit Validierung.
   */
  public static create(einsatzId: string, userId: string, funkrufname: string): Result<JoinEinsatzCommand> {
    if (!einsatzId || einsatzId.trim().length === 0) {
      return Result.fail('einsatzId is required');
    }

    if (!userId || userId.trim().length === 0) {
      return Result.fail('userId is required');
    }

    if (!funkrufname || funkrufname.trim().length === 0) {
      return Result.fail('funkrufname is required');
    }

    if (funkrufname.length > 100) {
      return Result.fail('funkrufname cannot exceed 100 characters');
    }

    return Result.ok(new JoinEinsatzCommand(einsatzId, userId, funkrufname.trim()));
  }
}
