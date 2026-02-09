import { Result } from '@domain/common/result';
import { NOTIZ_ERROR_CODES } from '../../errors/notiz-error.codes';

export interface UpdateNotizCommandProps {
  notizId: string;
  titel?: string;
  inhalt?: string | null;
  kategorie?: string | null;
  /** Story 8.2: Optionale Kategorie-Referenz */
  kategorieId?: string | null;
  istTeamsichtbar?: boolean;
  aktualisiertVon: string;
}

/**
 * Command zum Aktualisieren einer Notiz (Story 7.3).
 * Partial Update: Mindestens ein Feld muss gesetzt sein.
 */
export class UpdateNotizCommand {
  private static readonly MAX_TITEL_LENGTH = 100;
  private static readonly MAX_INHALT_LENGTH = 2000;
  private static readonly MAX_KATEGORIE_LENGTH = 50;

  private constructor(
    public readonly notizId: string,
    public readonly titel: string | undefined,
    public readonly inhalt: string | null | undefined,
    public readonly kategorie: string | null | undefined,
    public readonly kategorieId: string | null | undefined,
    public readonly istTeamsichtbar: boolean | undefined,
    public readonly aktualisiertVon: string,
  ) {}

  static create(props: UpdateNotizCommandProps): Result<UpdateNotizCommand> {
    // Validiere notizId
    const trimmedId = props.notizId?.trim() ?? '';
    if (trimmedId.length === 0) {
      return Result.fail<UpdateNotizCommand>(NOTIZ_ERROR_CODES.NOT_FOUND);
    }

    // Validiere aktualisiertVon (Pflichtfeld)
    const trimmedAktualisiertVon = props.aktualisiertVon?.trim() ?? '';
    if (trimmedAktualisiertVon.length === 0) {
      return Result.fail<UpdateNotizCommand>(NOTIZ_ERROR_CODES.AKTUALISIERT_VON_REQUIRED);
    }

    // Mindestens ein Feld muss gesetzt sein
    if (props.titel === undefined && props.inhalt === undefined && props.kategorie === undefined && props.kategorieId === undefined && props.istTeamsichtbar === undefined) {
      return Result.fail<UpdateNotizCommand>(NOTIZ_ERROR_CODES.NO_CHANGES);
    }

    // Validiere Titel (wenn gesetzt)
    let trimmedTitel: string | undefined;
    if (props.titel !== undefined) {
      trimmedTitel = props.titel.trim();
      if (trimmedTitel.length === 0) {
        return Result.fail<UpdateNotizCommand>(NOTIZ_ERROR_CODES.TITEL_REQUIRED);
      }
      if (trimmedTitel.length > UpdateNotizCommand.MAX_TITEL_LENGTH) {
        return Result.fail<UpdateNotizCommand>(NOTIZ_ERROR_CODES.TITEL_TOO_LONG);
      }
    }

    // Validiere Inhalt (wenn gesetzt und nicht null)
    let inhalt: string | null | undefined = props.inhalt;
    if (props.inhalt !== undefined && props.inhalt !== null) {
      const trimmedInhalt = props.inhalt.trim();
      if (trimmedInhalt.length > UpdateNotizCommand.MAX_INHALT_LENGTH) {
        return Result.fail<UpdateNotizCommand>(NOTIZ_ERROR_CODES.INHALT_TOO_LONG);
      }
      inhalt = trimmedInhalt.length > 0 ? trimmedInhalt : null;
    }

    // Validiere Kategorie (wenn gesetzt und nicht null)
    let kategorie: string | null | undefined = props.kategorie;
    if (props.kategorie !== undefined && props.kategorie !== null) {
      const trimmedKategorie = props.kategorie.trim();
      if (trimmedKategorie.length > UpdateNotizCommand.MAX_KATEGORIE_LENGTH) {
        return Result.fail<UpdateNotizCommand>(NOTIZ_ERROR_CODES.KATEGORIE_TOO_LONG);
      }
      kategorie = trimmedKategorie.length > 0 ? trimmedKategorie : null;
    }

    return Result.ok(new UpdateNotizCommand(trimmedId, trimmedTitel, inhalt, kategorie, props.kategorieId, props.istTeamsichtbar, trimmedAktualisiertVon));
  }
}
