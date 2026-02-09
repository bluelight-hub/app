import { ValueObject } from '@domain/common/value-object';
import { Result } from '@domain/common/result';

interface NotizTitelProps extends Record<string, unknown> {
  value: string;
}

/**
 * NotizTitel Value Object mit Laengen-Validierung.
 * Titel ist erforderlich (nicht leer), maximal 100 Zeichen, Whitespace wird getrimmt.
 */
export class NotizTitel extends ValueObject<NotizTitelProps> {
  public static readonly MAX_LENGTH = 100;

  get value(): string {
    return this.props.value;
  }

  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): Result<NotizTitel> {
    if (value == null) {
      return Result.fail<NotizTitel>('NOTIZ_TITEL_REQUIRED');
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      return Result.fail<NotizTitel>('NOTIZ_TITEL_REQUIRED');
    }

    if (trimmedValue.length > NotizTitel.MAX_LENGTH) {
      return Result.fail<NotizTitel>(`NOTIZ_TITEL_TOO_LONG: Titel darf maximal ${NotizTitel.MAX_LENGTH} Zeichen haben, aber ${trimmedValue.length} gefunden`);
    }

    return Result.ok<NotizTitel>(new NotizTitel(trimmedValue));
  }

  public toString(): string {
    return this.value;
  }
}
