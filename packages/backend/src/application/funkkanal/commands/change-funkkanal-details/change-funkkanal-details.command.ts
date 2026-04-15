import { Result } from '@domain/common/result';
import type { CreateFunkkanalCommandDetails } from '../create-funkkanal/create-funkkanal.command';

export type ChangeFunkkanalDetailsInput = CreateFunkkanalCommandDetails;

export interface ChangeFunkkanalDetailsCommandProps {
  readonly kanalId: string;
  readonly details: ChangeFunkkanalDetailsInput;
  readonly userId: string;
}

/**
 * Command zum Ändern der KanalDetails (TMO/DMO/Analog) eines Funkkanals.
 */
export class ChangeFunkkanalDetailsCommand {
  private constructor(
    public readonly kanalId: string,
    public readonly details: ChangeFunkkanalDetailsInput,
    public readonly userId: string,
  ) {}

  static create(props: ChangeFunkkanalDetailsCommandProps): Result<ChangeFunkkanalDetailsCommand> {
    const kanalId = props.kanalId?.trim();
    if (!kanalId) {
      return Result.fail<ChangeFunkkanalDetailsCommand>('kanalId ist erforderlich');
    }
    if (!props.details || typeof props.details !== 'object') {
      return Result.fail<ChangeFunkkanalDetailsCommand>('details sind erforderlich');
    }
    const userId = props.userId?.trim();
    if (!userId) {
      return Result.fail<ChangeFunkkanalDetailsCommand>('userId ist erforderlich');
    }
    return Result.ok(new ChangeFunkkanalDetailsCommand(kanalId, props.details, userId));
  }
}
