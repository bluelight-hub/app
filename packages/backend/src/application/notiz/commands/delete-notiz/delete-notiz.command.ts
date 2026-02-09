import { Result } from '@domain/common/result';
import { NOTIZ_ERROR_CODES } from '../../errors/notiz-error.codes';

export interface DeleteNotizCommandProps {
  notizId: string;
  geloeschtVon: string;
}

/**
 * Command zum Loeschen einer Notiz (Soft-Delete, Story 7.4).
 */
export class DeleteNotizCommand {
  private constructor(
    public readonly notizId: string,
    public readonly geloeschtVon: string,
  ) {}

  static create(props: DeleteNotizCommandProps): Result<DeleteNotizCommand> {
    const trimmedId = props.notizId?.trim() ?? '';
    if (trimmedId.length === 0) {
      return Result.fail<DeleteNotizCommand>(NOTIZ_ERROR_CODES.NOT_FOUND);
    }

    const trimmedGeloeschtVon = props.geloeschtVon?.trim() ?? '';
    if (trimmedGeloeschtVon.length === 0) {
      return Result.fail<DeleteNotizCommand>(NOTIZ_ERROR_CODES.GELOESCHT_VON_REQUIRED);
    }

    return Result.ok(new DeleteNotizCommand(trimmedId, trimmedGeloeschtVon));
  }
}
