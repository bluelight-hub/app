import { Result } from '@domain/common/result';

/**
 * Query für das Laden aller taktischen Einheiten eines Einsatzes.
 *
 * Verwendet für die Einheiten-Übersicht im Einsatz-Detail-View.
 */
export class GetEinsatzEinheitenQuery {
  private constructor(
    /** Einsatz-ID für die Einheiten geladen werden sollen (UUID) */
    public readonly einsatzId: string,
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param einsatzId - Einsatz-ID (UUID)
   * @returns Result<GetEinsatzEinheitenQuery>
   */
  static create(einsatzId: string): Result<GetEinsatzEinheitenQuery> {
    const trimmed = einsatzId?.trim() ?? '';
    if (trimmed.length === 0) {
      return Result.fail('einsatzId ist erforderlich');
    }

    return Result.ok(new GetEinsatzEinheitenQuery(trimmed));
  }
}
