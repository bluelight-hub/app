import { Result } from '@domain/common/result';
import { KATEGORIE_ERROR_CODES } from '../../errors/kategorie-error.codes';

export interface CreateKategorieCommandProps {
  name: string;
  farbe: string;
  einsatzId: string;
  erstelltVon: string;
}

/**
 * Command zum Erstellen einer neuen Kategorie.
 */
export class CreateKategorieCommand {
  private static readonly MAX_NAME_LENGTH = 100;
  private static readonly HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

  private constructor(
    public readonly name: string,
    public readonly farbe: string,
    public readonly einsatzId: string,
    public readonly erstelltVon: string,
  ) {}

  static create(props: CreateKategorieCommandProps): Result<CreateKategorieCommand> {
    // Validiere Name
    const trimmedName = props.name?.trim() ?? '';
    if (trimmedName.length === 0) {
      return Result.fail<CreateKategorieCommand>(KATEGORIE_ERROR_CODES.NAME_REQUIRED);
    }
    if (trimmedName.length > CreateKategorieCommand.MAX_NAME_LENGTH) {
      return Result.fail<CreateKategorieCommand>(KATEGORIE_ERROR_CODES.NAME_TOO_LONG);
    }

    // Validiere Farbe
    const trimmedFarbe = props.farbe?.trim() ?? '';
    if (trimmedFarbe.length === 0) {
      return Result.fail<CreateKategorieCommand>(KATEGORIE_ERROR_CODES.FARBE_REQUIRED);
    }
    if (!CreateKategorieCommand.HEX_COLOR_REGEX.test(trimmedFarbe)) {
      return Result.fail<CreateKategorieCommand>(KATEGORIE_ERROR_CODES.FARBE_INVALID);
    }

    // Validiere EinsatzId
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail<CreateKategorieCommand>(KATEGORIE_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }

    // Validiere ErstelltVon
    const trimmedErstelltVon = props.erstelltVon?.trim() ?? '';
    if (trimmedErstelltVon.length === 0) {
      return Result.fail<CreateKategorieCommand>(KATEGORIE_ERROR_CODES.ERSTELLT_VON_REQUIRED);
    }

    return Result.ok(new CreateKategorieCommand(trimmedName, trimmedFarbe, trimmedEinsatzId, trimmedErstelltVon));
  }
}
