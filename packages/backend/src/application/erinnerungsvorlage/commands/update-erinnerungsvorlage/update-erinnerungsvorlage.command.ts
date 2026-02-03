import { Result } from '@domain/common/result';
import { ERINNERUNGSVORLAGE_ERROR_CODES } from '../../errors/erinnerungsvorlage-error.codes';

export interface UpdateErinnerungsvorlageCommandProps {
  vorlageId: string;
  titel?: string;
  minuten?: number;
  beschreibung?: string | null;
  updatedBy: string;
}

/**
 * Command zum Aktualisieren einer Erinnerungsvorlage.
 * Partial Update: Mindestens ein Feld muss gesetzt sein.
 */
export class UpdateErinnerungsvorlageCommand {
  private static readonly MAX_TITEL_LENGTH = 100;
  private static readonly MAX_BESCHREIBUNG_LENGTH = 500;
  private static readonly MIN_MINUTEN = 1;

  private constructor(
    public readonly vorlageId: string,
    public readonly titel: string | undefined,
    public readonly minuten: number | undefined,
    public readonly beschreibung: string | null | undefined,
    public readonly updatedBy: string,
  ) {}

  static create(props: UpdateErinnerungsvorlageCommandProps): Result<UpdateErinnerungsvorlageCommand> {
    // Validiere vorlageId
    const trimmedId = props.vorlageId?.trim() ?? '';
    if (trimmedId.length === 0) {
      return Result.fail<UpdateErinnerungsvorlageCommand>(ERINNERUNGSVORLAGE_ERROR_CODES.NOT_FOUND);
    }

    // Validiere updatedBy (Pflichtfeld, darf nicht leer sein)
    const trimmedUpdatedBy = props.updatedBy?.trim() ?? '';
    if (trimmedUpdatedBy.length === 0) {
      return Result.fail<UpdateErinnerungsvorlageCommand>(ERINNERUNGSVORLAGE_ERROR_CODES.UPDATE_FAILED);
    }

    // Mindestens ein Feld muss gesetzt sein
    if (props.titel === undefined && props.minuten === undefined && props.beschreibung === undefined) {
      return Result.fail<UpdateErinnerungsvorlageCommand>(ERINNERUNGSVORLAGE_ERROR_CODES.NO_CHANGES);
    }

    // Validiere Titel (wenn gesetzt)
    let trimmedTitel: string | undefined;
    if (props.titel !== undefined) {
      trimmedTitel = props.titel.trim();
      if (trimmedTitel.length === 0) {
        return Result.fail<UpdateErinnerungsvorlageCommand>(ERINNERUNGSVORLAGE_ERROR_CODES.TITEL_REQUIRED);
      }
      if (trimmedTitel.length > UpdateErinnerungsvorlageCommand.MAX_TITEL_LENGTH) {
        return Result.fail<UpdateErinnerungsvorlageCommand>(ERINNERUNGSVORLAGE_ERROR_CODES.TITEL_TOO_LONG);
      }
    }

    // Validiere Minuten (wenn gesetzt)
    if (props.minuten !== undefined) {
      if (props.minuten < UpdateErinnerungsvorlageCommand.MIN_MINUTEN) {
        return Result.fail<UpdateErinnerungsvorlageCommand>(ERINNERUNGSVORLAGE_ERROR_CODES.MINUTEN_INVALID);
      }
    }

    // Validiere Beschreibung (wenn gesetzt und nicht null)
    let beschreibung: string | null | undefined = props.beschreibung;
    if (props.beschreibung !== undefined && props.beschreibung !== null) {
      const trimmedBeschreibung = props.beschreibung.trim();
      if (trimmedBeschreibung.length > UpdateErinnerungsvorlageCommand.MAX_BESCHREIBUNG_LENGTH) {
        return Result.fail<UpdateErinnerungsvorlageCommand>(ERINNERUNGSVORLAGE_ERROR_CODES.BESCHREIBUNG_TOO_LONG);
      }
      beschreibung = trimmedBeschreibung.length > 0 ? trimmedBeschreibung : null;
    }

    return Result.ok(new UpdateErinnerungsvorlageCommand(trimmedId, trimmedTitel, props.minuten, beschreibung, trimmedUpdatedBy));
  }
}
