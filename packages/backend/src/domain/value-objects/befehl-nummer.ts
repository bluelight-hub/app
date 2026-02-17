import { ValueObject } from '@domain/common/value-object';
import { Result } from '@domain/common/result';
import { createId } from '@paralleldrive/cuid2';

/**
 * Props für BefehlNummer Value Object.
 */
interface BefehlNummerProps extends Record<string, unknown> {
  value: string;
}

/**
 * BefehlNummer Value Object.
 *
 * Format: `B{YEAR}-{CUID-8}` (z.B. "B2026-abc12def")
 * Analog zu EinsatzNummer, aber mit CUID-8 statt Sequenznummer.
 */
export class BefehlNummer extends ValueObject<BefehlNummerProps> {
  /** Regex für das Befehlsnummer-Format: B{4-stelliges Jahr}-{8 alphanumerische Zeichen} */
  private static readonly FORMAT_REGEX = /^B\d{4}-[a-z0-9]{8}$/;

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
      return Result.fail<BefehlNummer>(`Ungültiges Befehlsnummer-Format: ${value}. Erwartetes Format: B{YEAR}-{CUID-8}`);
    }
    return Result.ok<BefehlNummer>(new BefehlNummer(value));
  }

  /**
   * Generiert eine neue Befehlsnummer mit dem aktuellen Jahr und einem CUID-8 Suffix.
   */
  static generateNummer(): BefehlNummer {
    const year = new Date().getFullYear();
    const cuidSuffix = createId().substring(0, 8);
    return new BefehlNummer(`B${year}-${cuidSuffix}`);
  }

  public toString(): string {
    return this.value;
  }
}
