import { Result } from '@domain/common/result';

export interface SetFunkkanalZweckCommandProps {
  readonly kanalId: string;
  readonly zweck: string | null | undefined;
  readonly userId: string;
}

/**
 * Command zum Setzen oder Entfernen des Zweck-Texts eines Funkkanals.
 *
 * `zweck = null | undefined | ''` entfernt den aktuellen Wert.
 */
export class SetFunkkanalZweckCommand {
  private static readonly MAX_ZWECK_LENGTH = 500;

  private constructor(
    public readonly kanalId: string,
    public readonly zweck: string | undefined,
    public readonly userId: string,
  ) {}

  static create(props: SetFunkkanalZweckCommandProps): Result<SetFunkkanalZweckCommand> {
    const kanalId = props.kanalId?.trim();
    if (!kanalId) {
      return Result.fail<SetFunkkanalZweckCommand>('kanalId ist erforderlich');
    }
    const zweck = props.zweck == null ? undefined : props.zweck.trim() || undefined;
    if (zweck && zweck.length > SetFunkkanalZweckCommand.MAX_ZWECK_LENGTH) {
      return Result.fail<SetFunkkanalZweckCommand>('zweck darf maximal 500 Zeichen lang sein');
    }
    const userId = props.userId?.trim();
    if (!userId) {
      return Result.fail<SetFunkkanalZweckCommand>('userId ist erforderlich');
    }
    return Result.ok(new SetFunkkanalZweckCommand(kanalId, zweck, userId));
  }
}
