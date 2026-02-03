import { ValueObject } from '@domain/common/value-object';
import { Result } from '@domain/common/result';

interface FuehrungsrhythmusTemplateNameProps extends Record<string, unknown> {
  value: string;
}

/**
 * FuehrungsrhythmusTemplateName Value Object mit Laengen-Validierung.
 * Name ist erforderlich (nicht leer), maximal 100 Zeichen, Whitespace wird getrimmt.
 */
export class FuehrungsrhythmusTemplateName extends ValueObject<FuehrungsrhythmusTemplateNameProps> {
  public static readonly MAX_LENGTH = 100;

  get value(): string {
    return this.props.value;
  }

  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): Result<FuehrungsrhythmusTemplateName> {
    if (value == null) {
      return Result.fail<FuehrungsrhythmusTemplateName>('FR_TEMPLATE_NAME_REQUIRED');
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      return Result.fail<FuehrungsrhythmusTemplateName>('FR_TEMPLATE_NAME_REQUIRED');
    }

    if (trimmedValue.length > FuehrungsrhythmusTemplateName.MAX_LENGTH) {
      return Result.fail<FuehrungsrhythmusTemplateName>(`FR_TEMPLATE_NAME_TOO_LONG: Name darf maximal ${FuehrungsrhythmusTemplateName.MAX_LENGTH} Zeichen haben, aber ${trimmedValue.length} gefunden`);
    }

    return Result.ok<FuehrungsrhythmusTemplateName>(new FuehrungsrhythmusTemplateName(trimmedValue));
  }

  public toString(): string {
    return this.value;
  }
}
