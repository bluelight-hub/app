import { Result } from '@domain/common/result';
import { NOTIZ_ERROR_CODES } from '../../errors/notiz-error.codes';

/**
 * Query zum Abrufen aller sichtbaren Notizen eines Einsatzes.
 * Validiert einsatzId und userId vor der Ausführung.
 * Liefert eigene Notizen + team-sichtbare Notizen anderer User.
 */
export class GetNotizenByEinsatzQuery {
  private constructor(
    public readonly einsatzId: string,
    public readonly userId: string,
  ) {}

  static create(props: { einsatzId: string; userId: string }): Result<GetNotizenByEinsatzQuery> {
    if (!props.einsatzId || props.einsatzId.trim() === '') {
      return Result.fail<GetNotizenByEinsatzQuery>(NOTIZ_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }

    if (!props.userId || props.userId.trim() === '') {
      return Result.fail<GetNotizenByEinsatzQuery>(NOTIZ_ERROR_CODES.ERSTELLT_VON_REQUIRED);
    }

    return Result.ok<GetNotizenByEinsatzQuery>(new GetNotizenByEinsatzQuery(props.einsatzId, props.userId));
  }
}
