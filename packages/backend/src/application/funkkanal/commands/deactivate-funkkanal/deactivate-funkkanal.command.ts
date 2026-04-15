import { Result } from '@domain/common/result';

export interface DeactivateFunkkanalCommandProps {
  readonly kanalId: string;
  readonly userId: string;
}

/**
 * Command zum temporären Deaktivieren eines Funkkanals (Status `inaktiv`).
 *
 * Deaktivierte Kanäle bleiben im Plan sichtbar, werden aber als nicht
 * belegt markiert. Über {@link ActivateFunkkanalCommand} reaktivierbar.
 */
export class DeactivateFunkkanalCommand {
  private constructor(
    public readonly kanalId: string,
    public readonly userId: string,
  ) {}

  static create(props: DeactivateFunkkanalCommandProps): Result<DeactivateFunkkanalCommand> {
    const kanalId = props.kanalId?.trim();
    if (!kanalId) {
      return Result.fail<DeactivateFunkkanalCommand>('kanalId ist erforderlich');
    }
    const userId = props.userId?.trim();
    if (!userId) {
      return Result.fail<DeactivateFunkkanalCommand>('userId ist erforderlich');
    }
    return Result.ok(new DeactivateFunkkanalCommand(kanalId, userId));
  }
}
