import { Result } from '@domain/common/result';

export interface EntferneZuordnungCommandProps {
  readonly kanalId: string;
  readonly zuordnungId: string;
  readonly userId: string;
}

/**
 * Command zum Entfernen einer Funkkanal-Zuordnung.
 */
export class EntferneZuordnungCommand {
  private constructor(
    public readonly kanalId: string,
    public readonly zuordnungId: string,
    public readonly userId: string,
  ) {}

  static create(props: EntferneZuordnungCommandProps): Result<EntferneZuordnungCommand> {
    const kanalId = props.kanalId?.trim();
    if (!kanalId) {
      return Result.fail<EntferneZuordnungCommand>('kanalId ist erforderlich');
    }
    const zuordnungId = props.zuordnungId?.trim();
    if (!zuordnungId) {
      return Result.fail<EntferneZuordnungCommand>('zuordnungId ist erforderlich');
    }
    const userId = props.userId?.trim();
    if (!userId) {
      return Result.fail<EntferneZuordnungCommand>('userId ist erforderlich');
    }
    return Result.ok(new EntferneZuordnungCommand(kanalId, zuordnungId, userId));
  }
}
