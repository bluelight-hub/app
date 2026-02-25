import { Result } from '@domain/common/result';

/**
 * Command zum Beitreten eines Einsatzes mit einer EinsatzPerson.
 *
 * Erstellt einen EinsatzTeilnehmer-Eintrag der den User mit einer
 * EinsatzPerson dem Einsatz zuordnet.
 */
export class JoinEinsatzCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly userId: string,
    public readonly einsatzPersonId: string,
  ) {}

  /**
   * Factory-Methode für JoinEinsatzCommand mit Validierung.
   */
  public static create(einsatzId: string, userId: string, einsatzPersonId: string): Result<JoinEinsatzCommand> {
    if (!einsatzId || einsatzId.trim().length === 0) {
      return Result.fail('einsatzId is required');
    }

    if (!userId || userId.trim().length === 0) {
      return Result.fail('userId is required');
    }

    if (!einsatzPersonId || einsatzPersonId.trim().length === 0) {
      return Result.fail('einsatzPersonId is required');
    }

    return Result.ok(new JoinEinsatzCommand(einsatzId, userId, einsatzPersonId.trim()));
  }
}
