import { Result } from '@domain/common/result';
import { ValueObject } from '@domain/common/value-object';

/**
 * Interface für die Props eines TokenHash Value Objects.
 */
interface TokenHashProps extends Record<string, unknown> {
  value: string;
}

/**
 * Value Object für bcrypt Token-Hashes.
 *
 * Validiert bcrypt-Format gemäß NFR-S1 (Security Requirements):
 * - Akzeptierte Varianten: $2a$, $2b$, $2y$
 * - Exakte Länge: 60 Zeichen
 * - Cost Factor mindestens 10 (Sicherheitsanforderung)
 *
 * Format: $2[aby]$[cost]$[22 chars salt][31 chars hash]
 *
 * @example
 * ```typescript
 * // Valider Hash
 * const result = TokenHash.create('$2a$10$N9qo8uLOickgx2ZMRZoMye.IjqQBrkHx6Y.q8e8.mzYsYB1.qKWZS');
 * if (result.isSuccess) {
 *   const hash: TokenHash = result.value;
 *   console.log(hash.value); // Der bcrypt Hash
 * }
 *
 * // Ungültiger Hash (Cost Factor zu niedrig)
 * const invalid = TokenHash.create('$2a$08$...');
 * // invalid.isFailure === true
 * ```
 */
export class TokenHash extends ValueObject<TokenHashProps> {
  /** Exakte Länge eines bcrypt Hash */
  private static readonly HASH_LENGTH = 60;

  /** Minimaler Cost Factor gemäß NFR-S1 */
  private static readonly MIN_COST_FACTOR = 10;

  /**
   * Regex für bcrypt Format-Validierung.
   * Format: $2[aby]$[2-stelliger cost]$[53 Zeichen salt+hash]
   */
  private static readonly BCRYPT_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

  /**
   * Protected Constructor erzwingt Factory Method Nutzung.
   */
  protected constructor(hash: string) {
    super({ value: hash });
  }

  /**
   * Readonly getter für den Hash-Wert.
   */
  get value(): string {
    return this.props.value;
  }

  /**
   * Factory Method mit vollständiger bcrypt-Validierung.
   *
   * Prüft:
   * 1. Exakte Länge (60 Zeichen)
   * 2. Format ($2a$/$2b$/$2y$ + cost + salt + hash)
   * 3. Cost Factor >= 10 (NFR-S1 Sicherheitsanforderung)
   *
   * @param hash - Der zu validierende bcrypt Hash
   * @returns Result<TokenHash> - Success mit Hash oder Failure mit Fehler
   */
  static create(hash: string): Result<TokenHash> {
    // Längenprüfung
    if (hash.length !== TokenHash.HASH_LENGTH) {
      return Result.fail<TokenHash>(`TokenHash muss exakt ${TokenHash.HASH_LENGTH} Zeichen lang sein (ist: ${hash.length})`);
    }

    // Format-Prüfung
    if (!TokenHash.BCRYPT_REGEX.test(hash)) {
      return Result.fail<TokenHash>('TokenHash muss gültiges bcrypt-Format haben ($2a$/$2b$/$2y$)');
    }

    // Cost Factor Prüfung (Position 4-5 im Hash)
    const costFactor = Number.parseInt(hash.substring(4, 6), 10);
    if (costFactor < TokenHash.MIN_COST_FACTOR) {
      return Result.fail<TokenHash>(`TokenHash Cost Factor muss mindestens ${TokenHash.MIN_COST_FACTOR} sein (ist: ${costFactor}, NFR-S1)`);
    }

    return Result.ok<TokenHash>(new TokenHash(hash));
  }

  /**
   * Prüft Gleichheit mit einem anderen TokenHash.
   */
  public equals(other?: TokenHash): boolean {
    if (other == null) return false;
    if (other === this) return true;

    return this.value === other.value;
  }

  /**
   * String-Repräsentation für Logging (maskiert!).
   * WICHTIG: Zeigt nur die ersten 8 Zeichen, um Token-Leaks zu verhindern.
   */
  public toString(): string {
    return `${this.value.substring(0, 8)}...`;
  }

  /**
   * Gibt die ersten 8 Zeichen des Hashes zurück (für Logging).
   * Sicherheitsmaßnahme: Verhindert vollständige Hash-Exposition in Logs.
   */
  public toMaskedString(): string {
    return `${this.value.substring(0, 8)}...`;
  }
}
