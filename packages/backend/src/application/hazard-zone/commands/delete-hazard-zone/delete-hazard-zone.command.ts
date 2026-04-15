import { Result } from '@domain/common/result';
import { HAZARD_ZONE_ERROR_CODES } from '../../errors/hazard-zone-error.codes';

export class DeleteHazardZoneCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly zoneId: string,
    public readonly deletedBy: string,
  ) {}

  static create(props: { einsatzId: string; zoneId: string; deletedBy: string }): Result<DeleteHazardZoneCommand> {
    const einsatzId = props.einsatzId?.trim() ?? '';
    if (einsatzId.length === 0) {
      return Result.fail<DeleteHazardZoneCommand>(HAZARD_ZONE_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }
    const zoneId = props.zoneId?.trim() ?? '';
    if (zoneId.length === 0) {
      return Result.fail<DeleteHazardZoneCommand>(HAZARD_ZONE_ERROR_CODES.ZONE_ID_REQUIRED);
    }
    const deletedBy = props.deletedBy?.trim() ?? '';
    if (deletedBy.length === 0) {
      return Result.fail<DeleteHazardZoneCommand>(HAZARD_ZONE_ERROR_CODES.DELETED_BY_REQUIRED);
    }
    return Result.ok(new DeleteHazardZoneCommand(einsatzId, zoneId, deletedBy));
  }
}
