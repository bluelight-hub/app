import { Result } from '@domain/common/result';
import { GEFAHRENZONE_APPLICATION_ERROR_CODES } from '../../errors/gefahrenzone-error.codes';

export class DeleteGefahrenzoneCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly zoneId: string,
    public readonly geloeschtVon: string,
  ) {}

  static create(props: { einsatzId: string; zoneId: string; geloeschtVon: string }): Result<DeleteGefahrenzoneCommand> {
    const einsatzId = props.einsatzId?.trim() ?? '';
    if (einsatzId.length === 0) {
      return Result.fail<DeleteGefahrenzoneCommand>(GEFAHRENZONE_APPLICATION_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }
    const zoneId = props.zoneId?.trim() ?? '';
    if (zoneId.length === 0) {
      return Result.fail<DeleteGefahrenzoneCommand>(GEFAHRENZONE_APPLICATION_ERROR_CODES.ZONE_ID_REQUIRED);
    }
    const geloeschtVon = props.geloeschtVon?.trim() ?? '';
    if (geloeschtVon.length === 0) {
      return Result.fail<DeleteGefahrenzoneCommand>(GEFAHRENZONE_APPLICATION_ERROR_CODES.AKTUALISIERT_VON_REQUIRED);
    }
    return Result.ok(new DeleteGefahrenzoneCommand(einsatzId, zoneId, geloeschtVon));
  }
}
