import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
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
 * Input DTO für das Erstellen eines neuen Stamm-Fahrzeugs.
 *
 * Validiert Eingabedaten via class-validator und dokumentiert API via OpenAPI.
 *
 * **Architektur-Entscheidung [AI-R7]:**
 * DTOs im Application Layer verwenden NestJS/Swagger-Decorators (@ApiProperty)
 * und class-validator-Decorators, obwohl dies Framework-Agnostizität (AC3) leicht
 * verletzt. Diese pragmatische Entscheidung vermeidet redundanten Mapping-Overhead
 * zwischen Presentation Layer (Controller) und Application Layer (Handlers).
 * Die deklarative Validierung via class-validator ist effizienter als manuelle
 * Validierungslogik und integriert sich nahtlos mit NestJS ValidationPipe.
 * Business Logic bleibt framework-agnostisch in Domain Aggregates gekapselt.
 *
 * **Validation Strategy:**
 * - Nutzt zentrale Domain-Konstanten aus `stamm-fahrzeug-validation.constants.ts`
 * - Single Source of Truth für min/max lengths über alle Layer
 * - Konsistente Error Messages zwischen Command, DTO und Aggregate
 * - Funkrufname wird automatisch getrimmt (Transform)
 *
 * **FahrzeugtypId:**
 * - FK zu Fahrzeugtyp aus Epic 1 (Story 1-2)
 * - IMMUTABLE: Kann nach Erstellung NICHT geändert werden
 * - Wichtig für Sollbesatzung-Berechnung und Einsatzplanung
 */
export class CreateStammFahrzeugDto {
  @ApiProperty({
    description: 'Fahrzeugbezeichnung (z.B. "RTW 1", "KTW 2")',
    example: 'RTW 1',
    minLength: STAMM_FAHRZEUG_RUFNAME_MIN_LENGTH,
    maxLength: STAMM_FAHRZEUG_RUFNAME_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(STAMM_FAHRZEUG_RUFNAME_MIN_LENGTH, { message: STAMM_FAHRZEUG_VALIDATION_ERRORS.RUFNAME_TOO_SHORT })
  @MaxLength(STAMM_FAHRZEUG_RUFNAME_MAX_LENGTH, { message: STAMM_FAHRZEUG_VALIDATION_ERRORS.RUFNAME_TOO_LONG })
  rufname!: string;

  @ApiProperty({
    description: 'Funkrufzeichen (UNIQUE) - z.B. "Rotkreuz 83/1"',
    example: 'Rotkreuz 83/1',
    minLength: STAMM_FAHRZEUG_FUNKRUFNAME_MIN_LENGTH,
    maxLength: STAMM_FAHRZEUG_FUNKRUFNAME_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(STAMM_FAHRZEUG_FUNKRUFNAME_MIN_LENGTH, {
    message: STAMM_FAHRZEUG_VALIDATION_ERRORS.FUNKRUFNAME_TOO_SHORT,
  })
  @MaxLength(STAMM_FAHRZEUG_FUNKRUFNAME_MAX_LENGTH, {
    message: STAMM_FAHRZEUG_VALIDATION_ERRORS.FUNKRUFNAME_TOO_LONG,
  })
  funkrufname!: string;

  @ApiProperty({
    description: 'Fahrzeugtyp-ID (FK zu Fahrzeugtyp aus Epic 1) - IMMUTABLE',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  @IsString()
  @IsNotEmpty({ message: STAMM_FAHRZEUG_VALIDATION_ERRORS.FAHRZEUGTYP_ID_REQUIRED })
  fahrzeugtypId!: string;

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
