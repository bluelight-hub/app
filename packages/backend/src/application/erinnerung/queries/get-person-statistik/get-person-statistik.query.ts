import { Result } from '@domain/common/result';
import { ERINNERUNG_ERROR_CODES } from '../../errors/erinnerung-error.codes';

export interface GetPersonStatistikQueryProps {
  einsatzId: string;
}

export class GetPersonStatistikQuery {
  private static readonly CUID2_PATTERN = /^[a-z0-9]{24,32}$/;

  private constructor(public readonly einsatzId: string) {}

  static create(props: GetPersonStatistikQueryProps): Result<GetPersonStatistikQuery> {
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';

    if (trimmedEinsatzId.length === 0) {
      return Result.fail<GetPersonStatistikQuery>(ERINNERUNG_ERROR_CODES.QUERY_EINSATZ_ID_REQUIRED);
    }

    if (!GetPersonStatistikQuery.CUID2_PATTERN.test(trimmedEinsatzId)) {
      return Result.fail<GetPersonStatistikQuery>(ERINNERUNG_ERROR_CODES.EINSATZ_ID_INVALID);
    }

    return Result.ok(new GetPersonStatistikQuery(trimmedEinsatzId));
  }
}
