import { Result } from '@domain/common/result';
import { GEFAHR_ERROR_CODES } from '../../errors/gefahr-error.codes';

export class GetGefahrenmatrixQuery {
  private constructor(public readonly einsatzId: string) {}

  static create(props: { einsatzId: string }): Result<GetGefahrenmatrixQuery> {
    const trimmed = props.einsatzId?.trim() ?? '';
    if (trimmed.length === 0) {
      return Result.fail<GetGefahrenmatrixQuery>(GEFAHR_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }
    return Result.ok(new GetGefahrenmatrixQuery(trimmed));
  }
}
