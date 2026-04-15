import { Result } from '@domain/common/result';
import { Gefahrentyp } from '@domain/gefahr/value-objects/gefahrentyp';
import { type HazardZoneGeometry, HazardZoneGeometryType } from '@domain/hazard-zone/value-objects/hazard-zone-geometry';
import { HAZARD_ZONE_ERROR_CODES } from '../../errors/hazard-zone-error.codes';

export class CreateHazardZoneCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly gefahrentyp: Gefahrentyp,
    public readonly geometryType: HazardZoneGeometryType,
    public readonly geometry: HazardZoneGeometry,
    public readonly radiusMeters: number | null,
    public readonly label: string | undefined,
    public readonly beschreibung: string | undefined,
    public readonly createdBy: string,
  ) {}

  static create(props: {
    einsatzId: string;
    gefahrentyp: string;
    geometryType: string;
    geometry: unknown;
    radiusMeters?: number | null;
    label?: string;
    beschreibung?: string;
    createdBy: string;
  }): Result<CreateHazardZoneCommand> {
    const einsatzId = props.einsatzId?.trim() ?? '';
    if (einsatzId.length === 0) {
      return Result.fail<CreateHazardZoneCommand>(HAZARD_ZONE_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }
    if (!Object.values(Gefahrentyp).includes(props.gefahrentyp as Gefahrentyp)) {
      return Result.fail<CreateHazardZoneCommand>(HAZARD_ZONE_ERROR_CODES.GEFAHRENTYP_INVALID);
    }
    if (!Object.values(HazardZoneGeometryType).includes(props.geometryType as HazardZoneGeometryType)) {
      return Result.fail<CreateHazardZoneCommand>(HAZARD_ZONE_ERROR_CODES.GEOMETRY_TYPE_INVALID);
    }
    if (!props.geometry || typeof props.geometry !== 'object') {
      return Result.fail<CreateHazardZoneCommand>(HAZARD_ZONE_ERROR_CODES.GEOMETRY_INVALID);
    }
    const createdBy = props.createdBy?.trim() ?? '';
    if (createdBy.length === 0) {
      return Result.fail<CreateHazardZoneCommand>(HAZARD_ZONE_ERROR_CODES.CREATED_BY_REQUIRED);
    }

    return Result.ok(
      new CreateHazardZoneCommand(
        einsatzId,
        props.gefahrentyp as Gefahrentyp,
        props.geometryType as HazardZoneGeometryType,
        props.geometry as HazardZoneGeometry,
        props.radiusMeters ?? null,
        props.label,
        props.beschreibung,
        createdBy,
      ),
    );
  }
}
