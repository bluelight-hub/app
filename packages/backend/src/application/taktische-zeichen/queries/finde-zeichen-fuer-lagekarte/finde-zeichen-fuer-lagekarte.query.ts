import { Result } from '@domain/common/result';

/**
 * Query zum Abrufen aller platzierten taktischen Zeichen einer Lagekarte.
 */
export class FindeZeichenFuerLagekarteQuery {
  private constructor(public readonly lagekarteId: string) {}

  static create(props: { lagekarteId: string }): Result<FindeZeichenFuerLagekarteQuery> {
    if (!props.lagekarteId || props.lagekarteId.trim() === '') {
      return Result.fail<FindeZeichenFuerLagekarteQuery>('LAGEKARTE_ID_REQUIRED');
    }

    return Result.ok<FindeZeichenFuerLagekarteQuery>(new FindeZeichenFuerLagekarteQuery(props.lagekarteId.trim()));
  }
}
