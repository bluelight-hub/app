import { Result } from '@domain/common/result';

/**
 * Query für das Laden einer einzelnen EinsatzPerson per ID.
 *
 * Verwendet nach Command-Operationen um aktualisierte Person zu laden.
 */
export class GetEinsatzPersonByIdQuery {
  private constructor(
    /** Person-ID (CUID2) */
    public readonly personId: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param personId - EinsatzPerson-ID (CUID2)
   * @returns Result<GetEinsatzPersonByIdQuery>
   */
  static create(personId: string): Result<GetEinsatzPersonByIdQuery> {
    const trimmed = personId?.trim() ?? '';
    if (trimmed.length === 0) {
      return Result.fail('personId ist erforderlich');
    }

    return Result.ok(new GetEinsatzPersonByIdQuery(trimmed));
  }
}
