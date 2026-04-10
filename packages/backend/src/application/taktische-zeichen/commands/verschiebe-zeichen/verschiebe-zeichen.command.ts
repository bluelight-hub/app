import { Result } from '@domain/common/result';

/**
 * Props für VerschiebeZeichenCommand.
 */
export interface VerschiebeZeichenCommandProps {
  einsatzId: string;
  zeichenId: string;
  lat: number;
  lng: number;
  mgrs?: string;
  verschobenVon: string;
}

/**
 * Command zum Verschieben eines bereits platzierten taktischen Zeichens.
 */
export class VerschiebeZeichenCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly zeichenId: string,
    public readonly lat: number,
    public readonly lng: number,
    public readonly verschobenVon: string,
    public readonly mgrs: string | undefined,
  ) {}

  static create(props: VerschiebeZeichenCommandProps): Result<VerschiebeZeichenCommand> {
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail<VerschiebeZeichenCommand>('EINSATZ_ID_REQUIRED');
    }

    const trimmedZeichenId = props.zeichenId?.trim() ?? '';
    if (trimmedZeichenId.length === 0) {
      return Result.fail<VerschiebeZeichenCommand>('ZEICHEN_ID_REQUIRED');
    }

    if (props.lat === undefined || props.lat === null) {
      return Result.fail<VerschiebeZeichenCommand>('LAT_REQUIRED');
    }

    if (props.lng === undefined || props.lng === null) {
      return Result.fail<VerschiebeZeichenCommand>('LNG_REQUIRED');
    }

    const trimmedVerschobenVon = props.verschobenVon?.trim() ?? '';
    if (trimmedVerschobenVon.length === 0) {
      return Result.fail<VerschiebeZeichenCommand>('VERSCHOBEN_VON_REQUIRED');
    }

    return Result.ok(new VerschiebeZeichenCommand(trimmedEinsatzId, trimmedZeichenId, props.lat, props.lng, trimmedVerschobenVon, props.mgrs?.trim() || undefined));
  }
}
