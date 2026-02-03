import { Result } from '@domain/common/result';
import { ERINNERUNGSVORLAGE_ERROR_CODES } from '../../errors/erinnerungsvorlage-error.codes';

export interface DeleteErinnerungsvorlageCommandProps {
  vorlageId: string;
  deletedBy: string;
}

/**
 * Command zum Löschen einer Erinnerungsvorlage (Soft-Delete).
 */
export class DeleteErinnerungsvorlageCommand {
  private constructor(
    public readonly vorlageId: string,
    public readonly deletedBy: string,
  ) {}

  static create(props: DeleteErinnerungsvorlageCommandProps): Result<DeleteErinnerungsvorlageCommand> {
    const trimmedId = props.vorlageId?.trim() ?? '';
    if (trimmedId.length === 0) {
      return Result.fail<DeleteErinnerungsvorlageCommand>(ERINNERUNGSVORLAGE_ERROR_CODES.NOT_FOUND);
    }

    const trimmedDeletedBy = props.deletedBy?.trim() ?? '';
    if (trimmedDeletedBy.length === 0) {
      return Result.fail<DeleteErinnerungsvorlageCommand>(ERINNERUNGSVORLAGE_ERROR_CODES.CREATED_BY_REQUIRED);
    }

    return Result.ok(new DeleteErinnerungsvorlageCommand(trimmedId, trimmedDeletedBy));
  }
}
