import { Result } from '@domain/common/result';
import { HAZARD_ZONE_ERROR_CODES } from '../../errors/hazard-zone-error.codes';

export class ListHazardZonesQuery {
  private constructor(public readonly einsatzId: string) {}

  static create(props: { einsatzId: string }): Result<ListHazardZonesQuery> {
    const trimmed = props.einsatzId?.trim() ?? '';
    if (trimmed.length === 0) {
      return Result.fail<ListHazardZonesQuery>(HAZARD_ZONE_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }
    return Result.ok(new ListHazardZonesQuery(trimmed));
  }
}
