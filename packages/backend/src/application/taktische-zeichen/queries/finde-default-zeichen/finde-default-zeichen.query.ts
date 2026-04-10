import { Result } from '@domain/common/result';

/**
 * Typ der angefragten Standard-Zeichen.
 * - 'fahrzeugtypen': Standard-Zeichen für Fahrzeugtypen
 * - 'einheitentypen': Standard-Zeichen für Einheitentypen
 */
export type DefaultZeichenTyp = 'fahrzeugtypen' | 'einheitentypen';

/**
 * Query zum Abrufen von Standard-Zeichen-Definitionen für Fahrzeug- oder Einheitentypen.
 */
export class FindeDefaultZeichenQuery {
  private constructor(public readonly typ: DefaultZeichenTyp) {}

  static create(props: { typ: DefaultZeichenTyp }): Result<FindeDefaultZeichenQuery> {
    if (props.typ !== 'fahrzeugtypen' && props.typ !== 'einheitentypen') {
      return Result.fail<FindeDefaultZeichenQuery>('INVALID_DEFAULT_ZEICHEN_TYP');
    }

    return Result.ok<FindeDefaultZeichenQuery>(new FindeDefaultZeichenQuery(props.typ));
  }
}
