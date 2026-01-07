import { Result } from '@domain/common/result';
import { ValueObject } from '@domain/common/value-object';
import { createId } from '@paralleldrive/cuid2';

/**
 * Interface für die Props eines AccessTokenId Value Objects.
 */
interface AccessTokenIdProps extends Record<string, unknown> {
  value: string;
}

/**
 * Type-Safe ID für ServerAccessToken Aggregates.
 *
 * Format: `blh_{cuid2}` (BlueLight Hub Identifier)
 * - Prefix: "blh_" (4 Zeichen)
 * - Body: CUID2 (24 Zeichen, lowercase alphanumeric)
 * - Gesamt: 28 Zeichen
 *
 * Verhindert Primitive Obsession und ermöglicht compile-time type safety.
 *
 * @example
 * ```typescript
 * // Auto-Generation
 * const result = AccessTokenId.create();
 * if (result.isSuccess) {
 *   const id: AccessTokenId = result.value;
 *   console.log(id.toString()); // "blh_ckpf2xrkc0001zyp8jq8qzx9f"
 * }
 *
 * // Mit existierendem Token
 * const result2 = AccessTokenId.create('blh_ckpf2xrkc0001zyp8jq8qzx9f');
 * ```
 */
export class AccessTokenId extends ValueObject<AccessTokenIdProps> {
  /** Prefix für alle Server-Access-Token IDs */
  private static readonly PREFIX = 'blh_';
  /** Erwartete Gesamtlänge: 4 (Prefix) + 24 (CUID2) = 28 */
  private static readonly TOTAL_LENGTH = 28;
  /** Format-Regex: blh_ gefolgt von 24 lowercase alphanumerischen Zeichen */
  private static readonly FORMAT_REGEX = /^blh_[a-z0-9]{24}$/;

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
   * @param id - Optional: Existierende Token-ID. Falls undefined → auto-generate mit blh_ Prefix
   * @returns Result<AccessTokenId> - Success mit ID oder Failure mit Fehler
   */
  static create(id?: string): Result<AccessTokenId> {
    // Auto-Generation: Prefix + CUID2
    if (id === undefined) {
      const cuid = createId();
      const newId = `${AccessTokenId.PREFIX}${cuid}`;
      return Result.ok<AccessTokenId>(new AccessTokenId(newId));
    }

    const trimmed = id.trim();

    // Längenprüfung
    if (trimmed.length !== AccessTokenId.TOTAL_LENGTH) {
      return Result.fail<AccessTokenId>(`TokenId muss exakt ${AccessTokenId.TOTAL_LENGTH} Zeichen haben (ist: ${trimmed.length})`);
    }

    // Prefix-Prüfung
    if (!trimmed.startsWith(AccessTokenId.PREFIX)) {
      return Result.fail<AccessTokenId>(`TokenId muss mit '${AccessTokenId.PREFIX}' beginnen`);
    }

    // Format-Prüfung (nur lowercase alphanumeric nach Prefix)
    if (!AccessTokenId.FORMAT_REGEX.test(trimmed)) {
      return Result.fail<AccessTokenId>('TokenId Format ungültig (erwartet: blh_ + 24 lowercase alphanumerisch)');
    }

    return Result.ok<AccessTokenId>(new AccessTokenId(trimmed));
  }

  /**
   * Prüft Gleichheit mit einer anderen AccessTokenId.
   */
  public equals(other?: AccessTokenId): boolean {
    if (other == null) return false;
    if (other === this) return true;

    return this.value === other.value;
  }

  /**
   * String-Repräsentation der AccessTokenId.
   */
  public toString(): string {
    return this.value;
  }
}
