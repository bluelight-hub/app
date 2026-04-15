import { Result } from '@domain/common/result';

export interface SetFunkkanalSortIndexCommandProps {
  readonly kanalId: string;
  readonly sortIndex: number;
  readonly userId: string;
}

/**
 * Command zum Einzel-Update des `sortIndex` eines Funkkanals.
 *
 * Für das Neu-Anordnen mehrerer Kanäle auf einmal existiert
 * `ReorderFunkkanaeleCommand` (Bulk-Update).
 */
export class SetFunkkanalSortIndexCommand {
  private constructor(
    public readonly kanalId: string,
    public readonly sortIndex: number,
    public readonly userId: string,
  ) {}

  static create(props: SetFunkkanalSortIndexCommandProps): Result<SetFunkkanalSortIndexCommand> {
    const kanalId = props.kanalId?.trim();
    if (!kanalId) {
      return Result.fail<SetFunkkanalSortIndexCommand>('kanalId ist erforderlich');
    }
    if (!Number.isInteger(props.sortIndex) || props.sortIndex < 0) {
      return Result.fail<SetFunkkanalSortIndexCommand>('sortIndex muss ein nicht-negativer Integer sein');
    }
    const userId = props.userId?.trim();
    if (!userId) {
      return Result.fail<SetFunkkanalSortIndexCommand>('userId ist erforderlich');
    }
    return Result.ok(new SetFunkkanalSortIndexCommand(kanalId, props.sortIndex, userId));
  }
}
