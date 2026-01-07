import { randomInt } from 'node:crypto';
import { Result } from '@domain/common/result';
import { ValueObject } from '@domain/common/value-object';

/**
 * Interface für die Props eines InviteCodeValue Value Objects.
 */
interface InviteCodeValueProps extends Record<string, unknown> {
  value: string;
}

/**
 * Value Object für den eigentlichen Invite-Code (8-stellig, alphanumerisch, uppercase).
 *
 * Der Invite-Code ist der vom Admin generierte, menschenlesbare Code,
 * den der Nutzer bei der Registrierung eingeben muss.
 *
 * **Format:**
 * - Länge: 8 Zeichen
 * - Alphabet: A-Z (Großbuchstaben) + 0-9 (Ziffern)
 * - Beispiel: "ABC12345", "XYZ98765"
 *
 * **Warum 8 Zeichen?**
 * - Ausreichend Entropie (36^8 = ~2.8 Billionen Kombinationen)
 * - Gut merkbar und eingebbar
 * - Brute-Force-resistent mit Rate Limiting
 *
 * @example
 * ```typescript
 * // Code generieren
 * const result = InviteCodeValue.generate();
 * if (result.isSuccess) {
 *   console.log(result.value.toString()); // "ABC12345"
 *   console.log(result.value.toMasked()); // "ABC1****"
 * }
 *
 * // Existierenden Code parsen
 * const result2 = InviteCodeValue.fromString('XYZ98765');
 * if (result2.isSuccess) {
 *   console.log(result2.value.value); // "XYZ98765"
 * }
 * ```
 */
export class InviteCodeValue extends ValueObject<InviteCodeValueProps> {
  /** Exakte Länge des Invite-Codes */
  private static readonly CODE_LENGTH = 8;
  /** Erlaubte Zeichen: Uppercase Buchstaben + Ziffern */
  private static readonly ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  /** Format-Regex für Validierung */
  private static readonly FORMAT_REGEX = /^[A-Z0-9]{8}$/;

  /**
   * Protected Constructor erzwingt Factory Method Nutzung.
   */
  protected constructor(code: string) {
    super({ value: code });
  }

  /**
   * Readonly getter für den Code-Wert.
   */
  get value(): string {
    return this.props.value;
  }

  /**
   * Generiert einen neuen zufälligen Invite-Code.
   *
   * Verwendet kryptographisch sichere Zufallszahlen für die Code-Generierung.
   *
   * @returns Result<InviteCodeValue> - Immer erfolgreich bei Generation
   */
  static generate(): Result<InviteCodeValue> {
    const code = Array.from({ length: InviteCodeValue.CODE_LENGTH }, () => InviteCodeValue.ALPHABET.charAt(randomInt(0, InviteCodeValue.ALPHABET.length))).join('');

    return Result.ok<InviteCodeValue>(new InviteCodeValue(code));
  }

  /**
   * Parst und validiert einen existierenden Code-String.
   *
   * Normalisiert den Input zu Uppercase und prüft Format.
   *
   * @param code - Der zu parsende Code-String
   * @returns Result<InviteCodeValue> - Success mit Code oder Failure bei ungültigem Format
   */
  static fromString(code: string): Result<InviteCodeValue> {
    if (!code) {
      return Result.fail<InviteCodeValue>('INVITE_CODE_EMPTY');
    }

    const trimmed = code.trim();

    if (trimmed.length !== InviteCodeValue.CODE_LENGTH) {
      return Result.fail<InviteCodeValue>('INVITE_CODE_INVALID_LENGTH');
    }

    const normalized = trimmed.toUpperCase();

    if (!InviteCodeValue.FORMAT_REGEX.test(normalized)) {
      return Result.fail<InviteCodeValue>('INVITE_CODE_INVALID_FORMAT');
    }

    return Result.ok<InviteCodeValue>(new InviteCodeValue(normalized));
  }

  /**
   * Prüft Gleichheit mit einem anderen InviteCodeValue.
   */
  public equals(other?: InviteCodeValue): boolean {
    if (other == null) return false;
    if (other === this) return true;

    return this.value === other.value;
  }

  /**
   * Gibt eine maskierte Version des Codes zurück.
   * Zeigt nur die ersten 4 Zeichen, Rest wird mit Sternchen ersetzt.
   *
   * Nützlich für Logging und UI-Anzeige.
   *
   * **Security:**
   * - Validiert Runtime-Format zur Vermeidung von Code-Leaks
   * - Wirft Error wenn Maskierung fehlschlägt (Defense in Depth)
   *
   * @returns Maskierter Code (z.B. "ABC1****")
   * @throws Error wenn maskiertes Format ungültig ist
   */
  public toMasked(): string {
    const masked = `${this.value.substring(0, 4)}****`;

    // Runtime-Validation: Stelle sicher, dass Maskierung korrekt ist
    // Format: 4 alphanumerische Zeichen + 4 Sternchen
    if (!/^[A-Z0-9]{4}\*{4}$/.test(masked)) {
      // Programming Error - sollte nie passieren, außer bei Code-Bug
      throw new Error(`Code masking validation failed: expected format [A-Z0-9]{4}\\*{4}, got "${masked}"`);
    }

    return masked;
  }

  /**
   * String-Repräsentation des Invite-Codes.
   */
  public toString(): string {
    return this.value;
  }
}
