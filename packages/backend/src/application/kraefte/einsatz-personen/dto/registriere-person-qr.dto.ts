import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, registerDecorator, type ValidationOptions, type ValidationArguments } from 'class-validator';

/**
 * Regex für Script-Injection Erkennung (identisch zum Command DANGEROUS_PATTERN).
 *
 * **ISSUE #3 FIX:** DTO verwendet nun den gleichen DANGEROUS_PATTERN wie Command
 * für konsistente Security-Validierung auf allen Ebenen.
 *
 * Blockiert gefährliche Zeichen/Patterns aber erlaubt:
 * - Umlaute (äöüÄÖÜß)
 * - Bindestriche, Apostrophe, Leerzeichen (für Namen)
 * - Zahlen und Buchstaben
 *
 * Schutzmechanismen:
 * - XSS: <, >, &lt;, &gt;, javascript:, data:, vbscript:
 * - Event Handlers: on\w+=
 * - NULL Bytes: %00
 * - CRLF Injection: %0d, %0a
 * - Unicode Homoglyphs: ＜ (U+FF1C), ＞ (U+FF1E), ﹤ (U+FE64), ﹥ (U+FE65)
 * - SQL Injection: '; DROP, DELETE, UPDATE, INSERT, UNION, SELECT, --, /*
 */
const DANGEROUS_PATTERN = /[<>]|&lt;|&gt;|javascript:|data:|vbscript:|on\w+=|%00|%0[ad]|[\uFF1C\uFF1E\uFE64\uFE65]|'\s*;?\s*(?:DROP|DELETE|UPDATE|INSERT|UNION|SELECT|--|\/\*)/i;

/**
 * Custom Validator: Prüft ob ein String gefährliche Zeichen/Patterns enthält.
 *
 * **Wichtig:** Dieser Decorator verwendet NEGATIVE Logik (Pattern NICHT matchen = valide).
 * Das ist identisch zur Command-Validierung für konsistente Security.
 *
 * @param validationOptions - class-validator Optionen
 */
function IsNotDangerousContent(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isNotDangerousContent',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }
          // Check for NULL bytes separately (cannot use \x00 in regex due to linter)
          if (value.includes('\0')) {
            return false;
          }
          // Return true if NO dangerous pattern found (negative check)
          return !DANGEROUS_PATTERN.test(value);
        },
        defaultMessage(_args: ValidationArguments) {
          return `${propertyName} enthält ungültige Zeichen`;
        },
      },
    });
  };
}

/**
 * DTO fuer QR-Code Registrierung (DRK-App Format).
 *
 * Die QR-Parameter werden vom Frontend geparst und hierher gemappt:
 * - QR "mnr" -> personalnummer
 * - QR "vn" -> vorname
 * - QR "nn" -> nachname
 * - QR "fk" -> funkkennung (optional)
 *
 * @see docs/sprint-artifacts/4-2-person-via-qr-code-registrieren.md
 */
export class RegistrierePersonViaQrCodeDto {
  /**
   * Personalnummer aus QR-Code (DRK-Parameter "mnr").
   *
   * Wird für StammPerson-Lookup verwendet. Falls keine Stammdaten gefunden werden,
   * wird eine temporäre EinsatzPerson aus den QR-Daten erstellt.
   */
  @ApiProperty({
    description: 'Personalnummer aus QR-Code (DRK-Parameter "mnr")',
    example: '12345678',
  })
  @IsString()
  @IsNotEmpty({ message: 'Personalnummer ist erforderlich' })
  @MaxLength(50, { message: 'Personalnummer darf maximal 50 Zeichen lang sein' })
  @IsNotDangerousContent({ message: 'Personalnummer enthält ungültige Zeichen' })
  personalnummer!: string;

  /**
   * Vorname aus QR-Code (DRK-Parameter "vn").
   *
   * Wird als Fallback verwendet wenn keine StammPerson gefunden wird,
   * oder zur Anzeige in der UI während des Scan-Prozesses.
   */
  @ApiProperty({
    description: 'Vorname aus QR-Code (DRK-Parameter "vn")',
    example: 'Max',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vorname ist erforderlich' })
  @MaxLength(100, { message: 'Vorname darf maximal 100 Zeichen lang sein' })
  @IsNotDangerousContent({ message: 'Vorname enthält ungültige Zeichen' })
  vorname!: string;

  /**
   * Nachname aus QR-Code (DRK-Parameter "nn").
   *
   * Wird als Fallback verwendet wenn keine StammPerson gefunden wird,
   * oder zur Anzeige in der UI während des Scan-Prozesses.
   */
  @ApiProperty({
    description: 'Nachname aus QR-Code (DRK-Parameter "nn")',
    example: 'Mustermann',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nachname ist erforderlich' })
  @MaxLength(100, { message: 'Nachname darf maximal 100 Zeichen lang sein' })
  @IsNotDangerousContent({ message: 'Nachname enthält ungültige Zeichen' })
  nachname!: string;

  /**
   * BOS-Funkkennung aus QR-Code (DRK-Parameter "fk", optional).
   *
   * Optionale Funkkennung die direkt vom QR-Code übernommen wird.
   * Falls StammPerson gefunden wird, hat deren Funkkennung Vorrang.
   */
  @ApiPropertyOptional({
    description: 'BOS-Funkkennung aus QR-Code (DRK-Parameter "fk", optional)',
    example: '4711',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Funkkennung darf maximal 50 Zeichen lang sein' })
  @IsNotDangerousContent({ message: 'Funkkennung enthält ungültige Zeichen' })
  funkkennung?: string;
}
