import { Result } from '@domain/common/result';

export interface ArchiveFunkkanalCommandProps {
  readonly kanalId: string;
  readonly userId: string;
}

/**
 * Command zum Archivieren eines Funkkanals.
 *
 * Archiv statt Hard-Delete: Kanäle mit Funkspruch-Historie dürfen
 * nicht gelöscht werden, ein Archivieren bleibt jederzeit zulässig.
 */
export class ArchiveFunkkanalCommand {
  private constructor(
    public readonly kanalId: string,
    public readonly userId: string,
  ) {}

  static create(props: ArchiveFunkkanalCommandProps): Result<ArchiveFunkkanalCommand> {
    const kanalId = props.kanalId?.trim();
    if (!kanalId) {
      return Result.fail<ArchiveFunkkanalCommand>('kanalId ist erforderlich');
    }
    const userId = props.userId?.trim();
    if (!userId) {
      return Result.fail<ArchiveFunkkanalCommand>('userId ist erforderlich');
    }
    return Result.ok(new ArchiveFunkkanalCommand(kanalId, userId));
  }
}
