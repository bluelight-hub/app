import { Result } from '@domain/common/result';
import { Gefahrentyp } from '@domain/gefahr/value-objects/gefahrentyp';
import { Schutzobjekt } from '@domain/gefahr/value-objects/schutzobjekt';
import { Warnstufe } from '@domain/gefahr/value-objects/warnstufe';
import { GEFAHR_ERROR_CODES } from '../../errors/gefahr-error.codes';

export class UpdateGefahrenmatrixCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly gefahrentyp: Gefahrentyp,
    public readonly schutzobjekt: Schutzobjekt,
    public readonly warnstufe: Warnstufe,
    public readonly beschreibung: string | undefined,
    public readonly gemeldetVon: string | undefined,
    public readonly aktualisiertVon: string,
  ) {}

  static create(props: {
    einsatzId: string;
    gefahrentyp: string;
    schutzobjekt: string;
    warnstufe: string;
    beschreibung?: string;
    gemeldetVon?: string;
    aktualisiertVon: string;
  }): Result<UpdateGefahrenmatrixCommand> {
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail<UpdateGefahrenmatrixCommand>(GEFAHR_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }

    if (!Object.values(Gefahrentyp).includes(props.gefahrentyp as Gefahrentyp)) {
      return Result.fail<UpdateGefahrenmatrixCommand>(GEFAHR_ERROR_CODES.GEFAHRENTYP_INVALID);
    }

    if (!Object.values(Schutzobjekt).includes(props.schutzobjekt as Schutzobjekt)) {
      return Result.fail<UpdateGefahrenmatrixCommand>(GEFAHR_ERROR_CODES.SCHUTZOBJEKT_INVALID);
    }

    if (!Object.values(Warnstufe).includes(props.warnstufe as Warnstufe)) {
      return Result.fail<UpdateGefahrenmatrixCommand>(GEFAHR_ERROR_CODES.WARNSTUFE_INVALID);
    }

    const trimmedVon = props.aktualisiertVon?.trim() ?? '';
    if (trimmedVon.length === 0) {
      return Result.fail<UpdateGefahrenmatrixCommand>(GEFAHR_ERROR_CODES.AKTUALISIERT_VON_REQUIRED);
    }

    return Result.ok(
      new UpdateGefahrenmatrixCommand(
        trimmedEinsatzId,
        props.gefahrentyp as Gefahrentyp,
        props.schutzobjekt as Schutzobjekt,
        props.warnstufe as Warnstufe,
        props.beschreibung,
        props.gemeldetVon,
        trimmedVon,
      ),
    );
  }
}
