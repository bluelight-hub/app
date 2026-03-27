import { validateRequiredStringResult } from '@application/common/validators/string-validator';
import { Result } from '@domain/common/result';

/**
 * Command zum Entscheiden einer Beitrittsanfrage.
 *
 * Eine Führungskraft genehmigt oder lehnt eine Beitrittsanfrage ab.
 */
export class ResolveBeitrittsanfrageCommand {
  private constructor(
    public readonly anfrageId: string,
    public readonly decision: 'GENEHMIGT' | 'ABGELEHNT',
    public readonly resolvedBy: string,
  ) {}

  /**
   * Factory-Methode mit Validierung.
   * Verwendet Result<T> Pattern für explizite Fehlerbehandlung.
   */
  public static create(anfrageId: string, decision: string, resolvedBy: string): Result<ResolveBeitrittsanfrageCommand> {
    const anfrageIdError = validateRequiredStringResult(anfrageId, 'anfrageId');
    if (anfrageIdError) return Result.fail(anfrageIdError);

    if (decision !== 'GENEHMIGT' && decision !== 'ABGELEHNT') {
      return Result.fail('Entscheidung muss GENEHMIGT oder ABGELEHNT sein');
    }

    const resolvedByError = validateRequiredStringResult(resolvedBy, 'resolvedBy');
    if (resolvedByError) return Result.fail(resolvedByError);

    return Result.ok(new ResolveBeitrittsanfrageCommand(anfrageId.trim(), decision, resolvedBy.trim()));
  }
}
