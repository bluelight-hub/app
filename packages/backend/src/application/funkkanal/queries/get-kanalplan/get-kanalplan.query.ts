import { Result } from '@domain/common/result';

export interface GetKanalplanQueryProps {
  readonly einsatzId: string;
  readonly includeArchived?: boolean;
}

/**
 * Query: Liefert alle Funkkanäle eines Einsatzes inkl. Zuordnungen,
 * sortiert nach `sortIndex asc`.
 */
export class GetKanalplanQuery {
  private constructor(
    public readonly einsatzId: string,
    public readonly includeArchived: boolean,
  ) {}

  static create(props: GetKanalplanQueryProps): Result<GetKanalplanQuery> {
    const einsatzId = props.einsatzId?.trim();
    if (!einsatzId) {
      return Result.fail<GetKanalplanQuery>('einsatzId ist erforderlich');
    }
    return Result.ok(new GetKanalplanQuery(einsatzId, props.includeArchived ?? false));
  }
}
