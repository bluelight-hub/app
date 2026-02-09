import { ValueObject } from '@domain/common/value-object';
import { Result } from '@domain/common/result';

interface KategorieNameProps extends Record<string, unknown> {
  value: string;
}

/**
 * KategorieName Value Object mit Laengen-Validierung.
 * Name ist erforderlich (nicht leer), maximal 100 Zeichen, Whitespace wird getrimmt.
 */
export class KategorieName extends ValueObject<KategorieNameProps> {
  public static readonly MAX_LENGTH = 100;

  get value(): string {
    return this.props.value;
  }

  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): Result<KategorieName> {
    if (value == null) {
      return Result.fail<KategorieName>('KATEGORIE_NAME_REQUIRED');
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      return Result.fail<KategorieName>('KATEGORIE_NAME_REQUIRED');
    }

    if (trimmedValue.length > KategorieName.MAX_LENGTH) {
      return Result.fail<KategorieName>(`KATEGORIE_NAME_TOO_LONG: Name darf maximal ${KategorieName.MAX_LENGTH} Zeichen haben, aber ${trimmedValue.length} gefunden`);
    }

    return Result.ok<KategorieName>(new KategorieName(trimmedValue));
  }

  public toString(): string {
    return this.value;
  }
}
