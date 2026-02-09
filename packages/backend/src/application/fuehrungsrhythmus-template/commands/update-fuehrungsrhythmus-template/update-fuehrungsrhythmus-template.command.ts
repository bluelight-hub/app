import { isCuid } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES } from '../../errors/fuehrungsrhythmus-template-error.codes';

export interface UpdateFuehrungsrhythmusTemplateEintragProps {
  titel: string;
  intervallMinuten: number;
  offsetMinuten?: number;
}

export interface UpdateFuehrungsrhythmusTemplateCommandProps {
  templateId: string;
  name: string;
  beschreibung?: string;
  eintraege: UpdateFuehrungsrhythmusTemplateEintragProps[];
  aktualisiertVon: string;
}

/**
 * Command zum Aktualisieren eines Fuehrungsrhythmus-Templates (Story 6.8).
 */
export class UpdateFuehrungsrhythmusTemplateCommand {
  private static readonly MAX_NAME_LENGTH = 100;
  private static readonly MAX_BESCHREIBUNG_LENGTH = 500;

  private constructor(
    public readonly templateId: string,
    public readonly name: string,
    public readonly beschreibung: string | undefined,
    public readonly eintraege: UpdateFuehrungsrhythmusTemplateEintragProps[],
    public readonly aktualisiertVon: string,
  ) {}

  static create(props: UpdateFuehrungsrhythmusTemplateCommandProps): Result<UpdateFuehrungsrhythmusTemplateCommand> {
    // Validiere Template ID
    const trimmedTemplateId = props.templateId?.trim() ?? '';
    if (trimmedTemplateId.length === 0) {
      return Result.fail<UpdateFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.TEMPLATE_ID_REQUIRED);
    }
    if (!isCuid(trimmedTemplateId)) {
      return Result.fail<UpdateFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.TEMPLATE_ID_REQUIRED);
    }

    // Validiere Name
    const trimmedName = props.name?.trim() ?? '';
    if (trimmedName.length === 0) {
      return Result.fail<UpdateFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.NAME_REQUIRED);
    }
    if (trimmedName.length > UpdateFuehrungsrhythmusTemplateCommand.MAX_NAME_LENGTH) {
      return Result.fail<UpdateFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.NAME_TOO_LONG);
    }

    // Validiere Eintraege
    if (!props.eintraege || props.eintraege.length < 1) {
      return Result.fail<UpdateFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.NO_EINTRAEGE);
    }

    // Validiere Beschreibung
    const trimmedBeschreibung = props.beschreibung?.trim() || undefined;
    if (trimmedBeschreibung && trimmedBeschreibung.length > UpdateFuehrungsrhythmusTemplateCommand.MAX_BESCHREIBUNG_LENGTH) {
      return Result.fail<UpdateFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.BESCHREIBUNG_TOO_LONG);
    }

    // Validiere AktualisiertVon
    const trimmedAktualisiertVon = props.aktualisiertVon?.trim() ?? '';
    if (trimmedAktualisiertVon.length === 0 || !isCuid(trimmedAktualisiertVon)) {
      return Result.fail<UpdateFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.AKTUALISIERT_VON_REQUIRED);
    }

    return Result.ok(new UpdateFuehrungsrhythmusTemplateCommand(trimmedTemplateId, trimmedName, trimmedBeschreibung, props.eintraege, trimmedAktualisiertVon));
  }
}
