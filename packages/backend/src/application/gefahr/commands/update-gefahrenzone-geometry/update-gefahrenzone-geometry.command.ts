import { Result } from '@domain/common/result';
import { GefahrenzoneGeometry, GefahrenzoneGeometryType } from '@domain/gefahr/value-objects/gefahrenzone-geometry';
import { GEFAHRENZONE_APPLICATION_ERROR_CODES } from '../../errors/gefahrenzone-error.codes';

export class UpdateGefahrenzoneGeometryCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly zoneId: string,
    public readonly geometryType: GefahrenzoneGeometryType,
    public readonly geometry: GefahrenzoneGeometry,
    public readonly aktualisiertVon: string,
  ) {}

  static create(props: { einsatzId: string; zoneId: string; geometryType: string; geometry: unknown; aktualisiertVon: string }): Result<UpdateGefahrenzoneGeometryCommand> {
    const einsatzId = props.einsatzId?.trim() ?? '';
    if (einsatzId.length === 0) {
      return Result.fail<UpdateGefahrenzoneGeometryCommand>(GEFAHRENZONE_APPLICATION_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }
    const zoneId = props.zoneId?.trim() ?? '';
    if (zoneId.length === 0) {
      return Result.fail<UpdateGefahrenzoneGeometryCommand>(GEFAHRENZONE_APPLICATION_ERROR_CODES.ZONE_ID_REQUIRED);
    }
    if (!Object.values(GefahrenzoneGeometryType).includes(props.geometryType as GefahrenzoneGeometryType)) {
      return Result.fail<UpdateGefahrenzoneGeometryCommand>(GEFAHRENZONE_APPLICATION_ERROR_CODES.GEOMETRY_TYPE_INVALID);
    }
    const geometryResult = GefahrenzoneGeometry.fromFeature(props.geometry);
    if (geometryResult.isFailure || !geometryResult.value) {
      return Result.fail<UpdateGefahrenzoneGeometryCommand>(geometryResult.error ?? GEFAHRENZONE_APPLICATION_ERROR_CODES.GEOMETRY_INVALID);
    }
    const aktualisiertVon = props.aktualisiertVon?.trim() ?? '';
    if (aktualisiertVon.length === 0) {
      return Result.fail<UpdateGefahrenzoneGeometryCommand>(GEFAHRENZONE_APPLICATION_ERROR_CODES.AKTUALISIERT_VON_REQUIRED);
    }

    return Result.ok(new UpdateGefahrenzoneGeometryCommand(einsatzId, zoneId, props.geometryType as GefahrenzoneGeometryType, geometryResult.value, aktualisiertVon));
  }
}
