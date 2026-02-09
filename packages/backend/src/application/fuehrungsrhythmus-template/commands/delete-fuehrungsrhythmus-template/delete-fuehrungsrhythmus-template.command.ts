import { isCuid } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES } from '../../errors/fuehrungsrhythmus-template-error.codes';

export interface DeleteFuehrungsrhythmusTemplateCommandProps {
  templateId: string;
  geloeschtVon: string;
}

/**
 * Command zum Loeschen eines Fuehrungsrhythmus-Templates (Soft-Delete, Story 6.8).
 */
export class DeleteFuehrungsrhythmusTemplateCommand {
  private constructor(
    public readonly templateId: string,
    public readonly geloeschtVon: string,
  ) {}

  static create(props: DeleteFuehrungsrhythmusTemplateCommandProps): Result<DeleteFuehrungsrhythmusTemplateCommand> {
    const trimmedTemplateId = props.templateId?.trim() ?? '';
    if (trimmedTemplateId.length === 0 || !isCuid(trimmedTemplateId)) {
      return Result.fail<DeleteFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.TEMPLATE_ID_REQUIRED);
    }

    const trimmedGeloeschtVon = props.geloeschtVon?.trim() ?? '';
    if (trimmedGeloeschtVon.length === 0 || !isCuid(trimmedGeloeschtVon)) {
      return Result.fail<DeleteFuehrungsrhythmusTemplateCommand>(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.GELOESCHT_VON_REQUIRED);
    }

    return Result.ok(new DeleteFuehrungsrhythmusTemplateCommand(trimmedTemplateId, trimmedGeloeschtVon));
  }
}
