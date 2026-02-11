import { Result } from '@domain/common/result';
import { ERINNERUNG_ERROR_CODES } from '../../errors/erinnerung-error.codes';

export interface GetEinsatzVergleichQueryProps {
  einsatzIds: string[];
}

export class GetEinsatzVergleichQuery {
  private static readonly CUID2_PATTERN = /^[a-z0-9]{24,32}$/;

  private constructor(public readonly einsatzIds: string[]) {}

  static create(props: GetEinsatzVergleichQueryProps): Result<GetEinsatzVergleichQuery> {
    if (!props.einsatzIds || props.einsatzIds.length === 0) {
      return Result.fail<GetEinsatzVergleichQuery>(ERINNERUNG_ERROR_CODES.QUERY_EINSATZ_ID_REQUIRED);
    }

    for (const id of props.einsatzIds) {
      const trimmed = id.trim();
      if (!GetEinsatzVergleichQuery.CUID2_PATTERN.test(trimmed)) {
        return Result.fail<GetEinsatzVergleichQuery>(ERINNERUNG_ERROR_CODES.EINSATZ_ID_INVALID);
      }
    }

    const uniqueIds = [...new Set(props.einsatzIds.map((id) => id.trim()))];
    if (uniqueIds.length > 10) {
      return Result.fail<GetEinsatzVergleichQuery>('Maximal 10 Einsätze zum Vergleich erlaubt');
    }
    return Result.ok(new GetEinsatzVergleichQuery(uniqueIds));
  }
}
