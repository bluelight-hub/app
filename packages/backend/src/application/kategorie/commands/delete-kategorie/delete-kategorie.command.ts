import { Result } from '@domain/common/result';
import { KATEGORIE_ERROR_CODES } from '../../errors/kategorie-error.codes';

export interface DeleteKategorieCommandProps {
  kategorieId: string;
  geloeschtVon: string;
}

/**
 * Command zum Loeschen einer Kategorie (Soft-Delete).
 */
export class DeleteKategorieCommand {
  private constructor(
    public readonly kategorieId: string,
    public readonly geloeschtVon: string,
  ) {}

  static create(props: DeleteKategorieCommandProps): Result<DeleteKategorieCommand> {
    const trimmedId = props.kategorieId?.trim() ?? '';
    if (trimmedId.length === 0) {
      return Result.fail<DeleteKategorieCommand>(KATEGORIE_ERROR_CODES.NOT_FOUND);
    }

    const trimmedGeloeschtVon = props.geloeschtVon?.trim() ?? '';
    if (trimmedGeloeschtVon.length === 0) {
      return Result.fail<DeleteKategorieCommand>(KATEGORIE_ERROR_CODES.GELOESCHT_VON_REQUIRED);
    }

    return Result.ok(new DeleteKategorieCommand(trimmedId, trimmedGeloeschtVon));
  }
}
