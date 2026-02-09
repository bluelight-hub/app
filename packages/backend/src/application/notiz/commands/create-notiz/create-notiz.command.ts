import { Result } from '@domain/common/result';
import { NOTIZ_ERROR_CODES } from '../../errors/notiz-error.codes';

export interface CreateNotizCommandProps {
  titel: string;
  inhalt?: string;
  kategorie?: string;
  /** Story 8.2: Optionale Kategorie-Referenz */
  kategorieId?: string | null;
  istTeamsichtbar?: boolean;
  einsatzId: string;
  erstelltVon: string;
}

/**
 * Command zum Erstellen einer neuen Notiz.
 */
export class CreateNotizCommand {
  private static readonly MAX_TITEL_LENGTH = 100;
  private static readonly MAX_INHALT_LENGTH = 2000;
  private static readonly MAX_KATEGORIE_LENGTH = 50;

  private constructor(
    public readonly titel: string,
    public readonly inhalt: string | undefined,
    public readonly kategorie: string | undefined,
    public readonly kategorieId: string | null,
    public readonly istTeamsichtbar: boolean,
    public readonly einsatzId: string,
    public readonly erstelltVon: string,
  ) {}

  static create(props: CreateNotizCommandProps): Result<CreateNotizCommand> {
    // Validiere Titel
    const trimmedTitel = props.titel?.trim() ?? '';
    if (trimmedTitel.length === 0) {
      return Result.fail<CreateNotizCommand>(NOTIZ_ERROR_CODES.TITEL_REQUIRED);
    }
    if (trimmedTitel.length > CreateNotizCommand.MAX_TITEL_LENGTH) {
      return Result.fail<CreateNotizCommand>(NOTIZ_ERROR_CODES.TITEL_TOO_LONG);
    }

    // Validiere Inhalt (optional)
    const trimmedInhalt = props.inhalt?.trim() || undefined;
    if (trimmedInhalt && trimmedInhalt.length > CreateNotizCommand.MAX_INHALT_LENGTH) {
      return Result.fail<CreateNotizCommand>(NOTIZ_ERROR_CODES.INHALT_TOO_LONG);
    }

    // Validiere Kategorie (optional)
    const trimmedKategorie = props.kategorie?.trim() || undefined;
    if (trimmedKategorie && trimmedKategorie.length > CreateNotizCommand.MAX_KATEGORIE_LENGTH) {
      return Result.fail<CreateNotizCommand>(NOTIZ_ERROR_CODES.KATEGORIE_TOO_LONG);
    }

    // Validiere EinsatzId
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail<CreateNotizCommand>(NOTIZ_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }

    // Validiere ErstelltVon
    const trimmedErstelltVon = props.erstelltVon?.trim() ?? '';
    if (trimmedErstelltVon.length === 0) {
      return Result.fail<CreateNotizCommand>(NOTIZ_ERROR_CODES.ERSTELLT_VON_REQUIRED);
    }

    return Result.ok(new CreateNotizCommand(trimmedTitel, trimmedInhalt, trimmedKategorie, props.kategorieId ?? null, props.istTeamsichtbar ?? false, trimmedEinsatzId, trimmedErstelltVon));
  }
}
