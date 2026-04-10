import { Result } from '@domain/common/result';

/**
 * Query zum Abrufen aller taktischen Zeichen eines Einsatzes.
 */
export class FindeZeichenFuerEinsatzQuery {
  private constructor(public readonly einsatzId: string) {}

  static create(props: { einsatzId: string }): Result<FindeZeichenFuerEinsatzQuery> {
    if (!props.einsatzId || props.einsatzId.trim() === '') {
      return Result.fail<FindeZeichenFuerEinsatzQuery>('EINSATZ_ID_REQUIRED');
    }

    return Result.ok<FindeZeichenFuerEinsatzQuery>(new FindeZeichenFuerEinsatzQuery(props.einsatzId.trim()));
  }
}
