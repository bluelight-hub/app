import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  STAMM_PERSON_VORNAME_MIN_LENGTH,
  STAMM_PERSON_VORNAME_MAX_LENGTH,
  STAMM_PERSON_NACHNAME_MIN_LENGTH,
  STAMM_PERSON_NACHNAME_MAX_LENGTH,
  STAMM_PERSON_PERSONALNUMMER_MIN_LENGTH,
  STAMM_PERSON_PERSONALNUMMER_MAX_LENGTH,
  STAMM_PERSON_FUNKKENNUNG_BOS_MAX_LENGTH,
  STAMM_PERSON_VALIDATION_ERRORS,
} from '@domain/kraefte/constants/stamm-person-validation.constants';

/**
 * Input DTO für das Erstellen einer neuen Stamm-Person.
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
 * - Nutzt zentrale Domain-Konstanten aus `stamm-person-validation.constants.ts`
 * - Single Source of Truth für min/max lengths über alle Layer
 * - Konsistente Error Messages zwischen Command, DTO und Aggregate
 * - Alle String-Felder werden automatisch getrimmt (Transform)
 *
 * **Personalnummer:**
 * - UNIQUE Constraint in DB
 * - Eindeutige Kennung der Person in der Organisation
 * - IMMUTABLE: Kann nach Erstellung NICHT geändert werden
 *
 * **Qualifikationen:**
 * - Array von Qualifikation-IDs (CUIDs)
 * - Verknüpft Person mit ihren Qualifikationen
 * - Wichtig für Einsatzplanung und Sollbesatzung
 */
export class CreateStammPersonDto {
  @ApiProperty({
    description: 'Vorname der Person',
    example: 'Max',
    minLength: STAMM_PERSON_VORNAME_MIN_LENGTH,
    maxLength: STAMM_PERSON_VORNAME_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(STAMM_PERSON_VORNAME_MIN_LENGTH, { message: STAMM_PERSON_VALIDATION_ERRORS.VORNAME_TOO_SHORT })
  @MaxLength(STAMM_PERSON_VORNAME_MAX_LENGTH, { message: STAMM_PERSON_VALIDATION_ERRORS.VORNAME_TOO_LONG })
  vorname!: string;

  @ApiProperty({
    description: 'Nachname der Person',
    example: 'Mustermann',
    minLength: STAMM_PERSON_NACHNAME_MIN_LENGTH,
    maxLength: STAMM_PERSON_NACHNAME_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(STAMM_PERSON_NACHNAME_MIN_LENGTH, { message: STAMM_PERSON_VALIDATION_ERRORS.NACHNAME_TOO_SHORT })
  @MaxLength(STAMM_PERSON_NACHNAME_MAX_LENGTH, { message: STAMM_PERSON_VALIDATION_ERRORS.NACHNAME_TOO_LONG })
  nachname!: string;

  @ApiProperty({
    description: 'Personalnummer (eindeutig, case-insensitive) - z.B. "12345" oder "MA-2024-001"',
    example: '12345',
    minLength: STAMM_PERSON_PERSONALNUMMER_MIN_LENGTH,
    maxLength: STAMM_PERSON_PERSONALNUMMER_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(STAMM_PERSON_PERSONALNUMMER_MIN_LENGTH, {
    message: STAMM_PERSON_VALIDATION_ERRORS.PERSONALNUMMER_TOO_SHORT,
  })
  @MaxLength(STAMM_PERSON_PERSONALNUMMER_MAX_LENGTH, {
    message: STAMM_PERSON_VALIDATION_ERRORS.PERSONALNUMMER_TOO_LONG,
  })
  personalnummer!: string;

  @ApiPropertyOptional({
    description: 'BOS-Funkkennung der Person',
    example: '83/47/1',
    maxLength: STAMM_PERSON_FUNKKENNUNG_BOS_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(STAMM_PERSON_FUNKKENNUNG_BOS_MAX_LENGTH, {
    message: STAMM_PERSON_VALIDATION_ERRORS.FUNKKENNUNG_BOS_TOO_LONG,
  })
  funkkenungBOS?: string;

  @ApiPropertyOptional({
    description: 'Qualifikation-IDs (CUIDs), die der Person zugewiesen werden sollen (max. 50)',
    example: ['clw3h8x9y0000qwertyuiopas', 'clw3h8x9y0001qwertyuiopas'],
    type: [String],
    maxItems: 50,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50, { message: 'Maximal 50 Qualifikationen pro Person erlaubt' })
  @IsString({ each: true })
  qualifikationIds?: string[];
}
