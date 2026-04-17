import { Result } from '@domain/common/result';
import { GEFAHRENZONE_APPLICATION_ERROR_CODES } from '../../errors/gefahrenzone-error.codes';

export class GetGefahrenzonenByEinsatzQuery {
  private constructor(public readonly einsatzId: string) {}

  static create(props: { einsatzId: string }): Result<GetGefahrenzonenByEinsatzQuery> {
    const einsatzId = props.einsatzId?.trim() ?? '';
    if (einsatzId.length === 0) {
      return Result.fail<GetGefahrenzonenByEinsatzQuery>(GEFAHRENZONE_APPLICATION_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }
    return Result.ok(new GetGefahrenzonenByEinsatzQuery(einsatzId));
  }
}
