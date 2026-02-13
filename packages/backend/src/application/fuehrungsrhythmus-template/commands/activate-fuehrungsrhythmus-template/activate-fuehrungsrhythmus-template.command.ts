import { isCuid } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES } from '../../errors/fuehrungsrhythmus-template-error.codes';

export interface ActivateFuehrungsrhythmusTemplateCommandProps {
  templateId: string;
  einsatzId: string;
  aktiviertVon: string;
}

/**
 * Command zum Aktivieren eines Fuehrungsrhythmus-Templates fuer einen Einsatz.
 */
export class ActivateFuehrungsrhythmusTemplateCommand {
  private constructor(
    public readonly templateId: string,
    public readonly einsatzId: string,
    public readonly aktiviertVon: string,
  ) {}

  static create(props: ActivateFuehrungsrhythmusTemplateCommandProps): Result<ActivateFuehrungsrhythmusTemplateCommand> {
    // Validiere templateId (Pflicht, CUID2-Format)
    const trimmedTemplateId = props.templateId?.trim() ?? '';
    if (trimmedTemplateId.length === 0) {
      return Result.fail<ActivateFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.TEMPLATE_ID_REQUIRED);
    }
    if (!isCuid(trimmedTemplateId)) {
      return Result.fail<ActivateFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.TEMPLATE_ID_REQUIRED);
    }

    // Validiere einsatzId (Pflicht, CUID2-Format)
    const trimmedEinsatzId = props.einsatzId?.trim() ?? '';
    if (trimmedEinsatzId.length === 0) {
      return Result.fail<ActivateFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }
    if (!isCuid(trimmedEinsatzId)) {
      return Result.fail<ActivateFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.EINSATZ_ID_REQUIRED);
    }

    // Validiere aktiviertVon (Pflicht, CUID2-Format)
    const trimmedAktiviertVon = props.aktiviertVon?.trim() ?? '';
    if (trimmedAktiviertVon.length === 0) {
      return Result.fail<ActivateFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.AKTIVIERT_VON_REQUIRED);
    }
    if (!isCuid(trimmedAktiviertVon)) {
      return Result.fail<ActivateFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.AKTIVIERT_VON_REQUIRED);
    }

    return Result.ok(new ActivateFuehrungsrhythmusTemplateCommand(trimmedTemplateId, trimmedEinsatzId, trimmedAktiviertVon));
  }
}
