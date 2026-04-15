import { Result } from '@domain/common/result';

export interface RenameFunkkanalCommandProps {
  readonly kanalId: string;
  readonly name: string;
  readonly userId: string;
}

/**
 * Command zum Umbenennen eines bestehenden Funkkanals.
 */
export class RenameFunkkanalCommand {
  private static readonly MAX_NAME_LENGTH = 100;

  private constructor(
    public readonly kanalId: string,
    public readonly name: string,
    public readonly userId: string,
  ) {}

  static create(props: RenameFunkkanalCommandProps): Result<RenameFunkkanalCommand> {
    const kanalId = props.kanalId?.trim();
    if (!kanalId) {
      return Result.fail<RenameFunkkanalCommand>('kanalId ist erforderlich');
    }
    const name = props.name?.trim();
    if (!name) {
      return Result.fail<RenameFunkkanalCommand>('Kanalname ist erforderlich');
    }
    if (name.length > RenameFunkkanalCommand.MAX_NAME_LENGTH) {
      return Result.fail<RenameFunkkanalCommand>('Kanalname darf maximal 100 Zeichen lang sein');
    }
    const userId = props.userId?.trim();
    if (!userId) {
      return Result.fail<RenameFunkkanalCommand>('userId ist erforderlich');
    }
    return Result.ok(new RenameFunkkanalCommand(kanalId, name, userId));
  }
}
