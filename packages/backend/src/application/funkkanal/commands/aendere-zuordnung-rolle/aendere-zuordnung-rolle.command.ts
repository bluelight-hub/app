import { Result } from '@domain/common/result';
import { FUNKKANAL_ROLLEN, type FunkkanalRolle } from '@domain/aggregates/funkkanal/funkkanal-zuordnung.entity';

export interface AendereZuordnungRolleCommandProps {
  readonly kanalId: string;
  readonly zuordnungId: string;
  readonly rolle: FunkkanalRolle;
  readonly userId: string;
}

/**
 * Command zum Ändern der Rolle einer bestehenden Funkkanal-Zuordnung.
 */
export class AendereZuordnungRolleCommand {
  private constructor(
    public readonly kanalId: string,
    public readonly zuordnungId: string,
    public readonly rolle: FunkkanalRolle,
    public readonly userId: string,
  ) {}

  static create(props: AendereZuordnungRolleCommandProps): Result<AendereZuordnungRolleCommand> {
    const kanalId = props.kanalId?.trim();
    if (!kanalId) {
      return Result.fail<AendereZuordnungRolleCommand>('kanalId ist erforderlich');
    }
    const zuordnungId = props.zuordnungId?.trim();
    if (!zuordnungId) {
      return Result.fail<AendereZuordnungRolleCommand>('zuordnungId ist erforderlich');
    }
    if (!FUNKKANAL_ROLLEN.includes(props.rolle)) {
      return Result.fail<AendereZuordnungRolleCommand>(`rolle muss eines von ${FUNKKANAL_ROLLEN.join(', ')} sein`);
    }
    const userId = props.userId?.trim();
    if (!userId) {
      return Result.fail<AendereZuordnungRolleCommand>('userId ist erforderlich');
    }
    return Result.ok(new AendereZuordnungRolleCommand(kanalId, zuordnungId, props.rolle, userId));
  }
}
