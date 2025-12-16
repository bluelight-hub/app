import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { FAHRZEUGTYP_KATEGORIEN, type FahrzeugtypKategorieType } from '@domain/kraefte';
import {
  FAHRZEUGTYP_CODE_MIN_LENGTH,
  FAHRZEUGTYP_CODE_MAX_LENGTH,
  FAHRZEUGTYP_BEZEICHNUNG_MIN_LENGTH,
  FAHRZEUGTYP_BEZEICHNUNG_MAX_LENGTH,
  FAHRZEUGTYP_BESCHREIBUNG_MAX_LENGTH,
  FAHRZEUGTYP_VALIDATION_ERRORS,
} from '@domain/kraefte/constants/fahrzeugtyp-validation.constants';
import { FahrzeugtypSollbesatzungDto } from './fahrzeugtyp-sollbesatzung.dto';

/**
 * Input DTO für das Erstellen eines neuen Fahrzeugtyps.
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
 * - Nutzt zentrale Domain-Konstanten aus `fahrzeugtyp-validation.constants.ts`
 * - Single Source of Truth für min/max lengths über alle Layer
 * - Konsistente Error Messages zwischen Command, DTO und Aggregate
 * - Code wird automatisch auf UPPERCASE normalisiert (Transform)
 *
 * **Sollbesatzung:**
 * - Nested Validation via @ValidateNested und @Type(() => FahrzeugtypSollbesatzungDto)
 * - Alle Felder sind optional (nicht jeder Fahrzeugtyp benötigt alle Rollen)
 */
export class CreateFahrzeugtypDto {
  @ApiProperty({
    description: 'Eindeutiger Code (z.B. RTW, NEF, KTW) - wird automatisch auf UPPERCASE normalisiert',
    example: 'RTW',
    minLength: FAHRZEUGTYP_CODE_MIN_LENGTH,
    maxLength: FAHRZEUGTYP_CODE_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(FAHRZEUGTYP_CODE_MIN_LENGTH, { message: FAHRZEUGTYP_VALIDATION_ERRORS.CODE_TOO_SHORT })
  @MaxLength(FAHRZEUGTYP_CODE_MAX_LENGTH, { message: FAHRZEUGTYP_VALIDATION_ERRORS.CODE_TOO_LONG })
  code!: string;

  @ApiProperty({
    description: 'Vollständige Bezeichnung',
    example: 'Rettungswagen',
    minLength: FAHRZEUGTYP_BEZEICHNUNG_MIN_LENGTH,
    maxLength: FAHRZEUGTYP_BEZEICHNUNG_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(FAHRZEUGTYP_BEZEICHNUNG_MIN_LENGTH, { message: FAHRZEUGTYP_VALIDATION_ERRORS.BEZEICHNUNG_TOO_SHORT })
  @MaxLength(FAHRZEUGTYP_BEZEICHNUNG_MAX_LENGTH, { message: FAHRZEUGTYP_VALIDATION_ERRORS.BEZEICHNUNG_TOO_LONG })
  bezeichnung!: string;

  @ApiProperty({
    description: 'Kategorie des Fahrzeugtyps',
    enum: FAHRZEUGTYP_KATEGORIEN,
    example: 'RETTUNGSDIENST',
  })
  @IsEnum(FAHRZEUGTYP_KATEGORIEN, {
    message: `Kategorie muss einer der folgenden Werte sein: ${FAHRZEUGTYP_KATEGORIEN.join(', ')}`,
  })
  kategorie!: FahrzeugtypKategorieType;

  @ApiPropertyOptional({
    description: 'Soll-Besetzung pro Rolle (JSONB)',
    type: FahrzeugtypSollbesatzungDto,
    example: { fahrer: 1, sanitaeter: 2 },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FahrzeugtypSollbesatzungDto)
  sollbesatzung?: FahrzeugtypSollbesatzungDto;

  @ApiPropertyOptional({
    description: 'Optionale Beschreibung',
    example: 'Standard-Rettungswagen nach DIN EN 1789 Typ B',
    maxLength: FAHRZEUGTYP_BESCHREIBUNG_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(FAHRZEUGTYP_BESCHREIBUNG_MAX_LENGTH, { message: FAHRZEUGTYP_VALIDATION_ERRORS.BESCHREIBUNG_TOO_LONG })
  beschreibung?: string;
}
