import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Discriminated-Union-Shape eines am Vorfall Beteiligten (Story 5.1).
 *
 * Spiegelt das Epic-Wortlaut „Beteiligte (Multi-User + Freitext, optional)".
 * Domain bleibt Framework-frei — kein Zod-Import, dafür ein deckungsgleicher
 * Result-Validator (Pattern: `Standort` aus Story 4.1).
 */
export type BeteiligterProps = { kind: 'user'; userId: string; rolle?: string } | { kind: 'freitext'; name: string; rolle?: string };

const FREITEXT_NAME_MIN = 1;
const FREITEXT_NAME_MAX = 200;
const ROLLE_MAX = 100;

/**
 * Wert-Objekt `Beteiligter`. Persistiert 1:1 als Element im JSONB-Array
 * `EigenschutzVorfall.beteiligte` (kein eigenes VO-Wrap im Aggregate —
 * Plain-Object analog `PersonalEntryProps` aus Story 4.1).
 *
 * Invarianten:
 * - `kind = 'user'`: `userId` ist eine CUID2 (24 Zeichen, `[a-z0-9]`).
 * - `kind = 'freitext'`: `name` nach Trim 1–200 Zeichen.
 * - `rolle` optional, nach Trim 0–100 Zeichen (leer ⇒ `undefined`).
 */
export class Beteiligter {
  private constructor(private readonly props: BeteiligterProps) {}

  static create(props: BeteiligterProps): Result<Beteiligter> {
    if (!props || typeof props !== 'object') {
      return Result.fail<Beteiligter>('Beteiligter ist erforderlich');
    }

    const rolleResult = normalizeRolle(props.rolle);
    if (rolleResult.isFailure) {
      return Result.fail<Beteiligter>(rolleResult.error ?? 'rolle ungültig');
    }
    const rolle = rolleResult.value ?? undefined;

    if (props.kind === 'user') {
      const userId = props.userId?.trim() ?? '';
      if (!isCuid(userId)) {
        return Result.fail<Beteiligter>('userId muss eine CUID2 sein');
      }
      return Result.ok(new Beteiligter({ kind: 'user', userId, ...(rolle ? { rolle } : {}) }));
    }

    if (props.kind === 'freitext') {
      const name = props.name?.trim() ?? '';
      if (name.length < FREITEXT_NAME_MIN) {
        return Result.fail<Beteiligter>('name ist erforderlich');
      }
      if (name.length > FREITEXT_NAME_MAX) {
        return Result.fail<Beteiligter>(`name darf maximal ${FREITEXT_NAME_MAX} Zeichen haben`);
      }
      return Result.ok(new Beteiligter({ kind: 'freitext', name, ...(rolle ? { rolle } : {}) }));
    }

    return Result.fail<Beteiligter>('Unbekannter Beteiligter-Typ');
  }

  /**
   * Liefert eine Kopie der zugrundeliegenden Props (für Persistierung +
   * DTO-Serialisierung). Kein Referenz-Leak.
   */
  toJSON(): BeteiligterProps {
    if (this.props.kind === 'user') {
      return { kind: 'user', userId: this.props.userId, ...(this.props.rolle !== undefined ? { rolle: this.props.rolle } : {}) };
    }
    return { kind: 'freitext', name: this.props.name, ...(this.props.rolle !== undefined ? { rolle: this.props.rolle } : {}) };
  }

  get kind(): BeteiligterProps['kind'] {
    return this.props.kind;
  }

  equals(other: Beteiligter): boolean {
    if (this.props.kind !== other.props.kind) return false;
    if (this.props.kind === 'user' && other.props.kind === 'user') {
      return this.props.userId === other.props.userId && (this.props.rolle ?? null) === (other.props.rolle ?? null);
    }
    if (this.props.kind === 'freitext' && other.props.kind === 'freitext') {
      return this.props.name === other.props.name && (this.props.rolle ?? null) === (other.props.rolle ?? null);
    }
    return false;
  }
}

function normalizeRolle(value: string | undefined): Result<string | null> {
  if (value === undefined) return Result.ok(null);
  const trimmed = value.trim();
  if (trimmed.length === 0) return Result.ok(null);
  if (trimmed.length > ROLLE_MAX) {
    return Result.fail<string | null>(`rolle darf maximal ${ROLLE_MAX} Zeichen haben`);
  }
  return Result.ok(trimmed);
}
