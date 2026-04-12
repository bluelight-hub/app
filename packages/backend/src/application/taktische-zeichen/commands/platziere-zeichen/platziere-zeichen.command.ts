import { Result } from '@domain/common/result';

/**
 * Props für PlatziereZeichenCommand.
 */
export interface PlatziereZeichenCommandProps {
  einsatzId: string;
  zeichenId: string;
  lagekarteId: string;
  lat: number;
  lng: number;
  mgrs?: string;
  platziertVon: string;
}

/**
 * Command zum Platzieren eines taktischen Zeichens auf einer Lagekarte.
 * Wenn das Zeichen bereits platziert ist, wird es verschoben.
 */
export class PlatziereZeichenCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly zeichenId: string,
    public readonly lagekarteId: string,
    public readonly lat: number,
    public readonly lng: number,
    public readonly platziertVon: string,
    public readonly mgrs: string | undefined,
  ) {}

  static create(props: PlatziereZeichenCommandProps): Result<PlatziereZeichenCommand> {
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail<PlatziereZeichenCommand>('EINSATZ_ID_REQUIRED');
    }

    const trimmedZeichenId = props.zeichenId?.trim() ?? '';
    if (trimmedZeichenId.length === 0) {
      return Result.fail<PlatziereZeichenCommand>('ZEICHEN_ID_REQUIRED');
    }

    const trimmedLagekarteId = props.lagekarteId?.trim() ?? '';
    if (trimmedLagekarteId.length === 0) {
      return Result.fail<PlatziereZeichenCommand>('LAGEKARTE_ID_REQUIRED');
    }

    if (props.lat === undefined || props.lat === null) {
      return Result.fail<PlatziereZeichenCommand>('LAT_REQUIRED');
    }

    if (props.lng === undefined || props.lng === null) {
      return Result.fail<PlatziereZeichenCommand>('LNG_REQUIRED');
    }

    const trimmedPlatziertVon = props.platziertVon?.trim() ?? '';
    if (trimmedPlatziertVon.length === 0) {
      return Result.fail<PlatziereZeichenCommand>('PLATZIERT_VON_REQUIRED');
    }

    return Result.ok(new PlatziereZeichenCommand(trimmedEinsatzId, trimmedZeichenId, trimmedLagekarteId, props.lat, props.lng, trimmedPlatziertVon, props.mgrs?.trim() || undefined));
  }
}
