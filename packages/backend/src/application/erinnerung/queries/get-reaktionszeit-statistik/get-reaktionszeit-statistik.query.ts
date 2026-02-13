import { Result } from '@domain/common/result';
import { ERINNERUNG_ERROR_CODES } from '../../errors/erinnerung-error.codes';

export interface GetReaktionszeitStatistikQueryProps {
  einsatzId: string;
}

export class GetReaktionszeitStatistikQuery {
  private static readonly CUID2_PATTERN = /^[a-z0-9]{24,32}$/;

  private constructor(public readonly einsatzId: string) {}

  static create(props: GetReaktionszeitStatistikQueryProps): Result<GetReaktionszeitStatistikQuery> {
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';

    if (trimmedEinsatzId.length === 0) {
      return Result.fail<GetReaktionszeitStatistikQuery>(ERINNERUNG_ERROR_CODES.QUERY_EINSATZ_ID_REQUIRED);
    }

    if (!GetReaktionszeitStatistikQuery.CUID2_PATTERN.test(trimmedEinsatzId)) {
      return Result.fail<GetReaktionszeitStatistikQuery>(ERINNERUNG_ERROR_CODES.EINSATZ_ID_INVALID);
    }

    return Result.ok(new GetReaktionszeitStatistikQuery(trimmedEinsatzId));
  }
}
