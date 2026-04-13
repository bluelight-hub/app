import { Result } from '@domain/common/result';

/**
 * Props für EntferneZeichenCommand.
 */
export interface EntferneZeichenCommandProps {
  einsatzId: string;
  zeichenId: string;
  entferntVon: string;
}

/**
 * Command zum Löschen eines taktischen Zeichens aus dem System.
 */
export class EntferneZeichenCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly zeichenId: string,
    public readonly entferntVon: string,
  ) {}

  static create(props: EntferneZeichenCommandProps): Result<EntferneZeichenCommand> {
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail<EntferneZeichenCommand>('EINSATZ_ID_REQUIRED');
    }

    const trimmedZeichenId = props.zeichenId?.trim() ?? '';
    if (trimmedZeichenId.length === 0) {
      return Result.fail<EntferneZeichenCommand>('ZEICHEN_ID_REQUIRED');
    }

    const trimmedEntferntVon = props.entferntVon?.trim() ?? '';
    if (trimmedEntferntVon.length === 0) {
      return Result.fail<EntferneZeichenCommand>('ENTFERNT_VON_REQUIRED');
    }

    return Result.ok(new EntferneZeichenCommand(trimmedEinsatzId, trimmedZeichenId, trimmedEntferntVon));
  }
}
