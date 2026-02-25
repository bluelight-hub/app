import { ValueObject } from '@domain/common/value-object';
import { Result } from '@domain/common/result';

/**
 * Props für BefehlNummer Value Object.
 */
interface BefehlNummerProps extends Record<string, unknown> {
  value: string;
}

/**
 * BefehlNummer Value Object.
 *
 * Format: `B-{SEQ}` (z.B. "B-001", "B-042")
 * Laufende Nummer pro Einsatz, kein Jahr nötig.
 */
export class BefehlNummer extends ValueObject<BefehlNummerProps> {
  /** Regex für das Befehlsnummer-Format: B-{3+ stellige Zahl} */
  private static readonly FORMAT_REGEX = /^B-\d{3,}$/;

  get value(): string {
    return this.props.value;
  }

  private constructor(value: string) {
    super({ value });
  }

  /**
   * Factory Method mit Validierung eines existierenden Werts.
   */
  static create(value: string): Result<BefehlNummer> {
    if (!BefehlNummer.FORMAT_REGEX.test(value)) {
      return Result.fail<BefehlNummer>(`Ungültiges Befehlsnummer-Format: ${value}. Erwartetes Format: B-{SEQ} (z.B. B-001)`);
    }
    return Result.ok<BefehlNummer>(new BefehlNummer(value));
  }

  public toString(): string {
    return this.value;
  }
}
