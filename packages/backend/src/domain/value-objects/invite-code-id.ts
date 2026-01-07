import { Result } from '@domain/common/result';
import { ValueObject } from '@domain/common/value-object';
import { createId } from '@paralleldrive/cuid2';

/**
 * Interface für die Props eines InviteCodeId Value Objects.
 */
interface InviteCodeIdProps extends Record<string, unknown> {
  value: string;
}

/**
 * Type-Safe ID für InviteCode Aggregates.
 *
 * Format: `inv_{cuid2}` (Invite Code Identifier)
 * - Prefix: "inv_" (4 Zeichen)
 * - Body: CUID2 (24 Zeichen, lowercase alphanumeric)
 * - Gesamt: 28 Zeichen
 *
 * Verhindert Primitive Obsession und ermöglicht compile-time type safety.
 *
 * @example
 * ```typescript
 * // Auto-Generation
 * const result = InviteCodeId.create();
 * if (result.isSuccess) {
 *   const id: InviteCodeId = result.value;
 *   console.log(id.toString()); // "inv_ckpf2xrkc0001zyp8jq8qzx9f"
 * }
 *
 * // Mit existierendem Wert
 * const result2 = InviteCodeId.create('inv_ckpf2xrkc0001zyp8jq8qzx9f');
 * ```
 */
export class InviteCodeId extends ValueObject<InviteCodeIdProps> {
  /** Prefix für alle Invite-Code IDs */
  private static readonly PREFIX = 'inv_';
  /** Erwartete Gesamtlänge: 4 (Prefix) + 24 (CUID2) = 28 */
  private static readonly TOTAL_LENGTH = 28;
  /** Format-Regex: inv_ gefolgt von 24 lowercase alphanumerischen Zeichen */
  private static readonly FORMAT_REGEX = /^inv_[a-z0-9]{24}$/;

  /**
   * Protected Constructor erzwingt Factory Method Nutzung.
   */
  protected constructor(id: string) {
    super({ value: id });
  }

  /**
   * Readonly getter für den ID-Wert.
   */
  get value(): string {
    return this.props.value;
  }

  /**
   * Factory Method mit Format-Validierung und Auto-Generation.
   *
   * @param id - Optional: Existierende InviteCode-ID. Falls undefined → auto-generate mit inv_ Prefix
   * @returns Result<InviteCodeId> - Success mit ID oder Failure mit Fehler
   */
  static create(id?: string): Result<InviteCodeId> {
    // Auto-Generation: Prefix + CUID2
    if (id === undefined) {
      const cuid = createId();
      const newId = `${InviteCodeId.PREFIX}${cuid}`;
      return Result.ok<InviteCodeId>(new InviteCodeId(newId));
    }

    const trimmed = id.trim();

    // Längenprüfung
    if (trimmed.length !== InviteCodeId.TOTAL_LENGTH) {
      return Result.fail<InviteCodeId>(`InviteCodeId muss exakt ${InviteCodeId.TOTAL_LENGTH} Zeichen haben (ist: ${trimmed.length})`);
    }

    // Prefix-Prüfung
    if (!trimmed.startsWith(InviteCodeId.PREFIX)) {
      return Result.fail<InviteCodeId>(`InviteCodeId muss mit '${InviteCodeId.PREFIX}' beginnen`);
    }

    // Format-Prüfung (nur lowercase alphanumeric nach Prefix)
    if (!InviteCodeId.FORMAT_REGEX.test(trimmed)) {
      return Result.fail<InviteCodeId>('InviteCodeId Format ungültig (erwartet: inv_ + 24 lowercase alphanumerisch)');
    }

    return Result.ok<InviteCodeId>(new InviteCodeId(trimmed));
  }

  /**
   * Prüft Gleichheit mit einer anderen InviteCodeId.
   */
  public equals(other?: InviteCodeId): boolean {
    if (other == null) return false;
    if (other === this) return true;

    return this.value === other.value;
  }

  /**
   * String-Repräsentation der InviteCodeId.
   */
  public toString(): string {
    return this.value;
  }
}
