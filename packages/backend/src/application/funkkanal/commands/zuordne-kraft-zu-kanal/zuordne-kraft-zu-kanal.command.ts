import { Result } from '@domain/common/result';
import { FUNKKANAL_ROLLEN, type FunkkanalRolle } from '@domain/aggregates/funkkanal/funkkanal-zuordnung.entity';

export type ZuordneKraftRef =
  | { readonly kind: 'fahrzeug'; readonly fahrzeugId: string }
  | { readonly kind: 'person'; readonly personId: string }
  | { readonly kind: 'einheit'; readonly einheitId: string };

export interface ZuordneKraftZuKanalCommandProps {
  readonly kanalId: string;
  readonly kraft: ZuordneKraftRef;
  readonly rolle: FunkkanalRolle;
  readonly userId: string;
}

/**
 * Command zum Zuordnen einer Kraft (Fahrzeug / Person / Einheit) zu einem Funkkanal.
 *
 * Der `rufnameSnapshot` wird vom Handler zum Zeitpunkt der Zuordnung aus
 * dem jeweiligen Kraft-Repository gelesen — nicht vom Controller übergeben.
 */
export class ZuordneKraftZuKanalCommand {
  private constructor(
    public readonly kanalId: string,
    public readonly kraft: ZuordneKraftRef,
    public readonly rolle: FunkkanalRolle,
    public readonly userId: string,
  ) {}

  static create(props: ZuordneKraftZuKanalCommandProps): Result<ZuordneKraftZuKanalCommand> {
    const kanalId = props.kanalId?.trim();
    if (!kanalId) {
      return Result.fail<ZuordneKraftZuKanalCommand>('kanalId ist erforderlich');
    }
    if (!props.kraft || typeof props.kraft !== 'object') {
      return Result.fail<ZuordneKraftZuKanalCommand>('kraft ist erforderlich');
    }
    const kraftValidation = validateKraft(props.kraft);
    if (kraftValidation.isFailure) {
      return Result.fail<ZuordneKraftZuKanalCommand>(kraftValidation.error ?? 'Ungültige kraft');
    }
    if (!FUNKKANAL_ROLLEN.includes(props.rolle)) {
      return Result.fail<ZuordneKraftZuKanalCommand>(`rolle muss eines von ${FUNKKANAL_ROLLEN.join(', ')} sein`);
    }
    const userId = props.userId?.trim();
    if (!userId) {
      return Result.fail<ZuordneKraftZuKanalCommand>('userId ist erforderlich');
    }
    return Result.ok(new ZuordneKraftZuKanalCommand(kanalId, kraftValidation.value!, props.rolle, userId));
  }
}

function validateKraft(kraft: ZuordneKraftRef): Result<ZuordneKraftRef> {
  switch (kraft.kind) {
    case 'fahrzeug': {
      const id = kraft.fahrzeugId?.trim();
      if (!id) return Result.fail<ZuordneKraftRef>('fahrzeugId ist erforderlich');
      return Result.ok<ZuordneKraftRef>({ kind: 'fahrzeug', fahrzeugId: id });
    }
    case 'person': {
      const id = kraft.personId?.trim();
      if (!id) return Result.fail<ZuordneKraftRef>('personId ist erforderlich');
      return Result.ok<ZuordneKraftRef>({ kind: 'person', personId: id });
    }
    case 'einheit': {
      const id = kraft.einheitId?.trim();
      if (!id) return Result.fail<ZuordneKraftRef>('einheitId ist erforderlich');
      return Result.ok<ZuordneKraftRef>({ kind: 'einheit', einheitId: id });
    }
    default:
      return Result.fail<ZuordneKraftRef>('kraft.kind muss fahrzeug | person | einheit sein');
  }
}
