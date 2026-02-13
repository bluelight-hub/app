import { ValueObject } from '@domain/common/value-object';
import { Result } from '@domain/common/result';

interface ErinnerungsvorlageTitelProps extends Record<string, unknown> {
  value: string;
}

/**
 * ErinnerungsvorlageTitel Value Object mit Laengen-Validierung.
 * Titel ist erforderlich (nicht leer), maximal 100 Zeichen, Whitespace wird getrimmt.
 */
export class ErinnerungsvorlageTitel extends ValueObject<ErinnerungsvorlageTitelProps> {
  public static readonly MAX_LENGTH = 100;

  get value(): string {
    return this.props.value;
  }

  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): Result<ErinnerungsvorlageTitel> {
    if (value == null) {
      return Result.fail<ErinnerungsvorlageTitel>('VORLAGE_TITEL_REQUIRED');
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      return Result.fail<ErinnerungsvorlageTitel>('VORLAGE_TITEL_REQUIRED');
    }

    if (trimmedValue.length > ErinnerungsvorlageTitel.MAX_LENGTH) {
      return Result.fail<ErinnerungsvorlageTitel>(`VORLAGE_TITEL_TOO_LONG: Titel darf maximal ${ErinnerungsvorlageTitel.MAX_LENGTH} Zeichen haben, aber ${trimmedValue.length} gefunden`);
    }

    return Result.ok<ErinnerungsvorlageTitel>(new ErinnerungsvorlageTitel(trimmedValue));
  }

  public toString(): string {
    return this.value;
  }
}
