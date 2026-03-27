import { Result } from '@domain/common/result';

/**
 * Query zum Abrufen aller Beitrittsanfragen eines Einsatzes.
 *
 * Wird von Führungskräften verwendet, um offene und entschiedene
 * Beitrittsanfragen einzusehen.
 */
export class GetBeitrittsanfragenQuery {
  private constructor(
    public readonly einsatzId: string,
    public readonly status?: string,
  ) {}

  /**
   * Factory-Methode mit Validierung.
   *
   * @param props - Query-Parameter mit einsatzId und optionalem Status-Filter
   * @returns Result mit Query oder Fehler bei ungültigem einsatzId
   */
  static create(props: { einsatzId: string; status?: string }): Result<GetBeitrittsanfragenQuery> {
    if (!props.einsatzId || props.einsatzId.trim() === '') {
      return Result.fail<GetBeitrittsanfragenQuery>('einsatzId ist erforderlich');
    }

    return Result.ok<GetBeitrittsanfragenQuery>(new GetBeitrittsanfragenQuery(props.einsatzId, props.status));
  }
}
