import { isCuid } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES } from '../../errors/fuehrungsrhythmus-template-error.codes';

export interface CreateFuehrungsrhythmusTemplateEintragProps {
  titel: string;
  intervallMinuten: number;
  offsetMinuten?: number;
}

export interface CreateFuehrungsrhythmusTemplateCommandProps {
  name: string;
  beschreibung?: string;
  eintraege: CreateFuehrungsrhythmusTemplateEintragProps[];
  createdBy: string;
}

/**
 * Command zum Erstellen eines neuen Fuehrungsrhythmus-Templates.
 */
export class CreateFuehrungsrhythmusTemplateCommand {
  private static readonly MAX_NAME_LENGTH = 100;
  private static readonly MAX_BESCHREIBUNG_LENGTH = 500;

  private constructor(
    public readonly name: string,
    public readonly beschreibung: string | undefined,
    public readonly eintraege: CreateFuehrungsrhythmusTemplateEintragProps[],
    public readonly createdBy: string,
  ) {}

  static create(props: CreateFuehrungsrhythmusTemplateCommandProps): Result<CreateFuehrungsrhythmusTemplateCommand> {
    // Validiere Name
    const trimmedName = props.name?.trim() ?? '';
    if (trimmedName.length === 0) {
      return Result.fail<CreateFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.NAME_REQUIRED);
    }
    if (trimmedName.length > CreateFuehrungsrhythmusTemplateCommand.MAX_NAME_LENGTH) {
      return Result.fail<CreateFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.NAME_TOO_LONG);
    }

    // Validiere Eintraege (mindestens 1 Eintrag)
    if (!props.eintraege || props.eintraege.length < 1) {
      return Result.fail<CreateFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.NO_EINTRAEGE);
    }

    // Validiere Beschreibung (optional)
    const trimmedBeschreibung = props.beschreibung?.trim() || undefined;
    if (trimmedBeschreibung && trimmedBeschreibung.length > CreateFuehrungsrhythmusTemplateCommand.MAX_BESCHREIBUNG_LENGTH) {
      return Result.fail<CreateFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.BESCHREIBUNG_TOO_LONG);
    }

    // Validiere CreatedBy (CUID2-Format)
    const trimmedCreatedBy = props.createdBy?.trim() ?? '';
    if (trimmedCreatedBy.length === 0) {
      return Result.fail<CreateFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.CREATED_BY_REQUIRED);
    }
    if (!isCuid(trimmedCreatedBy)) {
      return Result.fail<CreateFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.CREATED_BY_REQUIRED);
    }

    return Result.ok(new CreateFuehrungsrhythmusTemplateCommand(trimmedName, trimmedBeschreibung, props.eintraege, trimmedCreatedBy));
  }
}
