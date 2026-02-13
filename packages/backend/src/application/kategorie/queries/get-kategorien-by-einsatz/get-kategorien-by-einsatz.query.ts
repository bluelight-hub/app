import { Result } from '@domain/common/result';
import { KATEGORIE_ERROR_CODES } from '../../errors/kategorie-error.codes';

/**
 * Query zum Abrufen aller Kategorien eines Einsatzes.
 * Validiert einsatzId vor der Ausfuehrung.
 * Liefert alle Kategorien (inkl. geloeschter) des Einsatzes.
 */
export class GetKategorienByEinsatzQuery {
  private constructor(public readonly einsatzId: string) {}

  static create(props: { einsatzId: string }): Result<GetKategorienByEinsatzQuery> {
    if (!props.einsatzId || props.einsatzId.trim() === '') {
      return Result.fail<GetKategorienByEinsatzQuery>(KATEGORIE_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }

    return Result.ok<GetKategorienByEinsatzQuery>(new GetKategorienByEinsatzQuery(props.einsatzId));
  }
}
