import { Result } from '@domain/common/result';

export interface ActivateFunkkanalCommandProps {
  readonly kanalId: string;
  readonly userId: string;
}

/**
 * Command zum Reaktivieren eines zuvor deaktivierten Funkkanals.
 *
 * Archivierte Kanäle können nicht reaktiviert werden — sie müssen vorher
 * über einen dedizierten Restore-Pfad entarchiviert werden (derzeit nicht
 * Teil dieses Features).
 */
export class ActivateFunkkanalCommand {
  private constructor(
    public readonly kanalId: string,
    public readonly userId: string,
  ) {}

  static create(props: ActivateFunkkanalCommandProps): Result<ActivateFunkkanalCommand> {
    const kanalId = props.kanalId?.trim();
    if (!kanalId) {
      return Result.fail<ActivateFunkkanalCommand>('kanalId ist erforderlich');
    }
    const userId = props.userId?.trim();
    if (!userId) {
      return Result.fail<ActivateFunkkanalCommand>('userId ist erforderlich');
    }
    return Result.ok(new ActivateFunkkanalCommand(kanalId, userId));
  }
}
