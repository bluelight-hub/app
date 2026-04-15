import { Result } from '@domain/common/result';
import { Gefahrentyp } from '@domain/gefahr/value-objects/gefahrentyp';
import { type HazardZoneGeometry, HazardZoneGeometryType } from '@domain/hazard-zone/value-objects/hazard-zone-geometry';
import { HAZARD_ZONE_ERROR_CODES } from '../../errors/hazard-zone-error.codes';

export class UpdateHazardZoneCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly zoneId: string,
    public readonly gefahrentyp: Gefahrentyp | undefined,
    public readonly geometryType: HazardZoneGeometryType | undefined,
    public readonly geometry: HazardZoneGeometry | undefined,
    public readonly radiusMeters: number | null | undefined,
    public readonly label: string | undefined,
    public readonly beschreibung: string | undefined,
    public readonly updatedBy: string,
  ) {}

  static create(props: {
    einsatzId: string;
    zoneId: string;
    gefahrentyp?: string;
    geometryType?: string;
    geometry?: unknown;
    radiusMeters?: number | null;
    label?: string;
    beschreibung?: string;
    updatedBy: string;
  }): Result<UpdateHazardZoneCommand> {
    const einsatzId = props.einsatzId?.trim() ?? '';
    if (einsatzId.length === 0) {
      return Result.fail<UpdateHazardZoneCommand>(HAZARD_ZONE_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }
    const zoneId = props.zoneId?.trim() ?? '';
    if (zoneId.length === 0) {
      return Result.fail<UpdateHazardZoneCommand>(HAZARD_ZONE_ERROR_CODES.ZONE_ID_REQUIRED);
    }
    if (props.gefahrentyp !== undefined && !Object.values(Gefahrentyp).includes(props.gefahrentyp as Gefahrentyp)) {
      return Result.fail<UpdateHazardZoneCommand>(HAZARD_ZONE_ERROR_CODES.GEFAHRENTYP_INVALID);
    }
    if (props.geometryType !== undefined && !Object.values(HazardZoneGeometryType).includes(props.geometryType as HazardZoneGeometryType)) {
      return Result.fail<UpdateHazardZoneCommand>(HAZARD_ZONE_ERROR_CODES.GEOMETRY_TYPE_INVALID);
    }
    const updatedBy = props.updatedBy?.trim() ?? '';
    if (updatedBy.length === 0) {
      return Result.fail<UpdateHazardZoneCommand>(HAZARD_ZONE_ERROR_CODES.UPDATED_BY_REQUIRED);
    }

    return Result.ok(
      new UpdateHazardZoneCommand(
        einsatzId,
        zoneId,
        props.gefahrentyp as Gefahrentyp | undefined,
        props.geometryType as HazardZoneGeometryType | undefined,
        props.geometry as HazardZoneGeometry | undefined,
        props.radiusMeters,
        props.label,
        props.beschreibung,
        updatedBy,
      ),
    );
  }
}
