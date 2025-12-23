import { registerDecorator, type ValidationArguments, type ValidationOptions } from 'class-validator';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Validiert, dass ein String im CUID2-Format ist.
 *
 * CUID2s werden von der Application Layer via `@paralleldrive/cuid2` generiert.
 * CUID2 Format: Variable Länge (typischerweise 24-32 Zeichen), URL-safe, sortierbar.
 *
 * **Migration von CUID v1 zu CUID2:**
 * - CUID v1 (alt): 25 Zeichen, beginnt mit 'c', Format: `c[a-z0-9]{24}`
 * - CUID2 (neu): Variable Länge, beginnt mit beliebigem Kleinbuchstaben, z.B. `pf9902w6nvuidl428y92ssfc`
 *
 * @example
 * // Gültiges CUID2: 'pf9902w6nvuidl428y92ssfc'
 *
 * @param validationOptions Optionale Validierungsoptionen für class-validator
 * @returns PropertyDecorator für class-validator
 */
export function IsCuid(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isCuid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          return validateCuidFormat(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} muss eine gültige CUID2 sein`;
        },
      },
    });
  };
}

/**
 * Validiert das CUID2-Format.
 *
 * CUID2s (Collision-resistant Unique Identifiers v2) werden von der Application Layer generiert.
 * Nutzt die offizielle `isCuid` Funktion von `@paralleldrive/cuid2` für korrekte Validierung.
 *
 * **Warum CUID2 statt CUID v1?**
 * - Bessere Performance (kürzere IDs)
 * - Verbesserte Sicherheit (mehr Entropie)
 * - URL-safe ohne Encoding
 * - Zeitbasiert sortierbar (wie UUIDv7)
 *
 * @example
 * validateCuidFormat('pf9902w6nvuidl428y92ssfc') // true
 * validateCuidFormat('abc') // false - zu kurz
 * validateCuidFormat('ABC123') // false - Großbuchstaben
 *
 * @param value Der zu validierende Wert
 * @returns true wenn der Wert ein gültiges CUID2-Format hat, false sonst
 */
export function validateCuidFormat(value: unknown): boolean {
  // Null/undefined sind erlaubt (Handling durch @IsOptional)
  if (value === undefined || value === null) {
    return true;
  }

  // Muss ein String sein
  if (typeof value !== 'string') {
    return false;
  }

  // CUID2-Validierung mit offizieller Funktion
  return isCuid(value);
}
