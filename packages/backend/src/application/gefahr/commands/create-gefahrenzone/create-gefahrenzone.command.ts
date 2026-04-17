import { Result } from '@domain/common/result';
import { Gefahrentyp } from '@domain/gefahr/value-objects/gefahrentyp';
import { Schutzobjekt } from '@domain/gefahr/value-objects/schutzobjekt';
import { GefahrenzoneGeometry, GefahrenzoneGeometryType } from '@domain/gefahr/value-objects/gefahrenzone-geometry';
import { GEFAHRENZONE_APPLICATION_ERROR_CODES } from '../../errors/gefahrenzone-error.codes';

export class CreateGefahrenzoneCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly gefahrentyp: Gefahrentyp,
    public readonly schutzobjekt: Schutzobjekt,
    public readonly geometryType: GefahrenzoneGeometryType,
    public readonly geometry: GefahrenzoneGeometry,
    public readonly bezeichnung: string | undefined,
    public readonly erstelltVon: string,
  ) {}

  static create(props: {
    einsatzId: string;
    gefahrentyp: string;
    schutzobjekt: string;
    geometryType: string;
    geometry: unknown;
    bezeichnung?: string;
    erstelltVon: string;
  }): Result<CreateGefahrenzoneCommand> {
    const einsatzId = props.einsatzId?.trim() ?? '';
    if (einsatzId.length === 0) {
      return Result.fail<CreateGefahrenzoneCommand>(GEFAHRENZONE_APPLICATION_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }
    if (!Object.values(Gefahrentyp).includes(props.gefahrentyp as Gefahrentyp)) {
      return Result.fail<CreateGefahrenzoneCommand>(GEFAHRENZONE_APPLICATION_ERROR_CODES.GEFAHRENTYP_INVALID);
    }
    if (!Object.values(Schutzobjekt).includes(props.schutzobjekt as Schutzobjekt)) {
      return Result.fail<CreateGefahrenzoneCommand>(GEFAHRENZONE_APPLICATION_ERROR_CODES.SCHUTZOBJEKT_INVALID);
    }
    if (!Object.values(GefahrenzoneGeometryType).includes(props.geometryType as GefahrenzoneGeometryType)) {
      return Result.fail<CreateGefahrenzoneCommand>(GEFAHRENZONE_APPLICATION_ERROR_CODES.GEOMETRY_TYPE_INVALID);
    }

    const geometryResult = GefahrenzoneGeometry.fromFeature(props.geometry);
    if (geometryResult.isFailure || !geometryResult.value) {
      return Result.fail<CreateGefahrenzoneCommand>(geometryResult.error ?? GEFAHRENZONE_APPLICATION_ERROR_CODES.GEOMETRY_INVALID);
    }

    const erstelltVon = props.erstelltVon?.trim() ?? '';
    if (erstelltVon.length === 0) {
      return Result.fail<CreateGefahrenzoneCommand>(GEFAHRENZONE_APPLICATION_ERROR_CODES.ERSTELLT_VON_REQUIRED);
    }

    const bezeichnung = props.bezeichnung?.trim() ?? undefined;
    if (bezeichnung && bezeichnung.length > 200) {
      return Result.fail<CreateGefahrenzoneCommand>(GEFAHRENZONE_APPLICATION_ERROR_CODES.BEZEICHNUNG_TOO_LONG);
    }

    return Result.ok(
      new CreateGefahrenzoneCommand(
        einsatzId,
        props.gefahrentyp as Gefahrentyp,
        props.schutzobjekt as Schutzobjekt,
        props.geometryType as GefahrenzoneGeometryType,
        geometryResult.value,
        bezeichnung,
        erstelltVon,
      ),
    );
  }
}
