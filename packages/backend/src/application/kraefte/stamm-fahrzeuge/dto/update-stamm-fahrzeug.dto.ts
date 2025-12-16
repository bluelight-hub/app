import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import {
  STAMM_FAHRZEUG_RUFNAME_MIN_LENGTH,
  STAMM_FAHRZEUG_RUFNAME_MAX_LENGTH,
  STAMM_FAHRZEUG_FUNKRUFNAME_MIN_LENGTH,
  STAMM_FAHRZEUG_FUNKRUFNAME_MAX_LENGTH,
  STAMM_FAHRZEUG_KENNZEICHEN_MAX_LENGTH,
  STAMM_FAHRZEUG_FUNKKENNUNG_MAX_LENGTH,
  STAMM_FAHRZEUG_BAUJAHR_MIN,
  STAMM_FAHRZEUG_VALIDATION_ERRORS,
} from '@domain/kraefte/constants/stamm-fahrzeug-validation.constants';

/**
 * Input DTO für das Aktualisieren eines Stamm-Fahrzeugs.
 *
 * Alle Felder sind optional - nur übergebene Felder werden aktualisiert.
 * Validiert Eingabedaten via class-validator und dokumentiert API via OpenAPI.
 *
 * **WICHTIG: fahrzeugtypId ist IMMUTABLE!**
 * - FahrzeugtypId kann nach Erstellung NICHT geändert werden
 * - Grund: Fahrzeugtyp definiert Sollbesatzung und Einsatzplanung
 * - Bei Fahrzeugtyp-Wechsel muss neues Fahrzeug angelegt werden
 * - Daher KEIN fahrzeugtypId-Feld in diesem DTO
 *
 * **Empty-Update Check:**
 * Handler validiert, dass mindestens ein Feld geändert wurde.
 * Vermeidet unnötige DB-Writes bei leeren Updates.
 */
export class UpdateStammFahrzeugDto {
  @ApiPropertyOptional({
    description: 'Fahrzeugbezeichnung (z.B. "RTW 1", "KTW 2")',
    example: 'RTW 1',
    minLength: STAMM_FAHRZEUG_RUFNAME_MIN_LENGTH,
    maxLength: STAMM_FAHRZEUG_RUFNAME_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(STAMM_FAHRZEUG_RUFNAME_MIN_LENGTH, { message: STAMM_FAHRZEUG_VALIDATION_ERRORS.RUFNAME_TOO_SHORT })
  @MaxLength(STAMM_FAHRZEUG_RUFNAME_MAX_LENGTH, { message: STAMM_FAHRZEUG_VALIDATION_ERRORS.RUFNAME_TOO_LONG })
  rufname?: string;

  @ApiPropertyOptional({
    description: 'Funkrufzeichen (UNIQUE) - z.B. "Rotkreuz 83/1"',
    example: 'Rotkreuz 83/1',
    minLength: STAMM_FAHRZEUG_FUNKRUFNAME_MIN_LENGTH,
    maxLength: STAMM_FAHRZEUG_FUNKRUFNAME_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(STAMM_FAHRZEUG_FUNKRUFNAME_MIN_LENGTH, {
    message: STAMM_FAHRZEUG_VALIDATION_ERRORS.FUNKRUFNAME_TOO_SHORT,
  })
  @MaxLength(STAMM_FAHRZEUG_FUNKRUFNAME_MAX_LENGTH, {
    message: STAMM_FAHRZEUG_VALIDATION_ERRORS.FUNKRUFNAME_TOO_LONG,
  })
  funkrufname?: string;

  @ApiPropertyOptional({
    description: 'Kfz-Kennzeichen (z.B. "DA-RK 101")',
    example: 'DA-RK 101',
    maxLength: STAMM_FAHRZEUG_KENNZEICHEN_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(STAMM_FAHRZEUG_KENNZEICHEN_MAX_LENGTH, {
    message: STAMM_FAHRZEUG_VALIDATION_ERRORS.KENNZEICHEN_TOO_LONG,
  })
  kennzeichen?: string;

  @ApiPropertyOptional({
    description: 'Baujahr des Fahrzeugs',
    example: 2022,
    minimum: STAMM_FAHRZEUG_BAUJAHR_MIN,
  })
  @IsOptional()
  @IsInt()
  @Min(STAMM_FAHRZEUG_BAUJAHR_MIN, { message: STAMM_FAHRZEUG_VALIDATION_ERRORS.BAUJAHR_TOO_LOW })
  baujahr?: number;

  @ApiPropertyOptional({
    description: 'BOS-Funkkennung',
    example: '83/1/1',
    maxLength: STAMM_FAHRZEUG_FUNKKENNUNG_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(STAMM_FAHRZEUG_FUNKKENNUNG_MAX_LENGTH, {
    message: STAMM_FAHRZEUG_VALIDATION_ERRORS.FUNKKENNUNG_TOO_LONG,
  })
  funkkenungBOS?: string;
}
