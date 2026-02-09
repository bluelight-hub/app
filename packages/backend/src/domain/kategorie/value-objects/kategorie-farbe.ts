import { ValueObject } from '@domain/common/value-object';
import { Result } from '@domain/common/result';

interface KategorieFarbeProps extends Record<string, unknown> {
  value: string;
}

/**
 * KategorieFarbe Value Object mit Hex-Code-Validierung.
 * Farbe muss einem validen Hex-Code Format entsprechen (#RRGGBB).
 */
export class KategorieFarbe extends ValueObject<KategorieFarbeProps> {
  private static readonly HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

  get value(): string {
    return this.props.value;
  }

  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): Result<KategorieFarbe> {
    if (value == null || value.trim().length === 0) {
      return Result.fail<KategorieFarbe>('KATEGORIE_FARBE_REQUIRED');
    }

    const trimmedValue = value.trim();
    if (!KategorieFarbe.HEX_COLOR_REGEX.test(trimmedValue)) {
      return Result.fail<KategorieFarbe>('KATEGORIE_FARBE_INVALID');
    }

    return Result.ok<KategorieFarbe>(new KategorieFarbe(trimmedValue));
  }

  public toString(): string {
    return this.value;
  }
}
