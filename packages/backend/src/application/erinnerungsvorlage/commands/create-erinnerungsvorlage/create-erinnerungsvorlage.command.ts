import { Result } from '@domain/common/result';
import { ERINNERUNGSVORLAGE_ERROR_CODES } from '../../errors/erinnerungsvorlage-error.codes';

export interface CreateErinnerungsvorlageCommandProps {
  titel: string;
  minuten: number;
  beschreibung?: string;
  createdBy: string;
}

/**
 * Command zum Erstellen einer neuen Erinnerungsvorlage.
 */
export class CreateErinnerungsvorlageCommand {
  private static readonly MAX_TITEL_LENGTH = 100;
  private static readonly MAX_BESCHREIBUNG_LENGTH = 500;
  private static readonly MIN_MINUTEN = 1;

  private constructor(
    public readonly titel: string,
    public readonly minuten: number,
    public readonly beschreibung: string | undefined,
    public readonly createdBy: string,
  ) {}

  static create(props: CreateErinnerungsvorlageCommandProps): Result<CreateErinnerungsvorlageCommand> {
    // Validiere Titel
    const trimmedTitel = props.titel?.trim() ?? '';
    if (trimmedTitel.length === 0) {
      return Result.fail<CreateErinnerungsvorlageCommand>(ERINNERUNGSVORLAGE_ERROR_CODES.TITEL_REQUIRED);
    }
    if (trimmedTitel.length > CreateErinnerungsvorlageCommand.MAX_TITEL_LENGTH) {
      return Result.fail<CreateErinnerungsvorlageCommand>(ERINNERUNGSVORLAGE_ERROR_CODES.TITEL_TOO_LONG);
    }

    // Validiere Minuten
    if (props.minuten == null || props.minuten < CreateErinnerungsvorlageCommand.MIN_MINUTEN) {
      return Result.fail<CreateErinnerungsvorlageCommand>(ERINNERUNGSVORLAGE_ERROR_CODES.MINUTEN_INVALID);
    }

    // Validiere Beschreibung (optional)
    const trimmedBeschreibung = props.beschreibung?.trim() || undefined;
    if (trimmedBeschreibung && trimmedBeschreibung.length > CreateErinnerungsvorlageCommand.MAX_BESCHREIBUNG_LENGTH) {
      return Result.fail<CreateErinnerungsvorlageCommand>(ERINNERUNGSVORLAGE_ERROR_CODES.BESCHREIBUNG_TOO_LONG);
    }

    // Validiere CreatedBy
    const trimmedCreatedBy = props.createdBy?.trim() ?? '';
    if (trimmedCreatedBy.length === 0) {
      return Result.fail<CreateErinnerungsvorlageCommand>(ERINNERUNGSVORLAGE_ERROR_CODES.CREATED_BY_REQUIRED);
    }

    return Result.ok(new CreateErinnerungsvorlageCommand(trimmedTitel, props.minuten, trimmedBeschreibung, trimmedCreatedBy));
  }
}
