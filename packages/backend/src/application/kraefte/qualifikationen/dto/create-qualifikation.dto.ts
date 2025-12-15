import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { QUALIFIKATION_KATEGORIEN, type QualifikationKategorieType } from '@domain/kraefte';
import {
  QUALIFIKATION_NAME_MIN_LENGTH,
  QUALIFIKATION_NAME_MAX_LENGTH,
  QUALIFIKATION_ABKUERZUNG_MIN_LENGTH,
  QUALIFIKATION_ABKUERZUNG_MAX_LENGTH,
  QUALIFIKATION_BESCHREIBUNG_MAX_LENGTH,
  QUALIFIKATION_VALIDATION_ERRORS,
} from '@domain/kraefte/constants/qualifikation-validation.constants';

/**
 * Input DTO für das Erstellen einer neuen Qualifikation.
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
 * - Nutzt zentrale Domain-Konstanten aus `qualifikation-validation.constants.ts`
 * - Single Source of Truth für min/max lengths über alle Layer
 * - Konsistente Error Messages zwischen Command, DTO und Aggregate
 */
export class CreateQualifikationDto {
  @ApiProperty({
    description: 'Name der Qualifikation',
    example: 'Notfallsanitäter',
    minLength: QUALIFIKATION_NAME_MIN_LENGTH,
    maxLength: QUALIFIKATION_NAME_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(QUALIFIKATION_NAME_MIN_LENGTH, { message: QUALIFIKATION_VALIDATION_ERRORS.NAME_TOO_SHORT })
  @MaxLength(QUALIFIKATION_NAME_MAX_LENGTH, { message: QUALIFIKATION_VALIDATION_ERRORS.NAME_TOO_LONG })
  name!: string;

  @ApiProperty({
    description: 'Eindeutige Abkürzung',
    example: 'NotSan',
    minLength: QUALIFIKATION_ABKUERZUNG_MIN_LENGTH,
    maxLength: QUALIFIKATION_ABKUERZUNG_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(QUALIFIKATION_ABKUERZUNG_MIN_LENGTH, { message: QUALIFIKATION_VALIDATION_ERRORS.ABKUERZUNG_TOO_SHORT })
  @MaxLength(QUALIFIKATION_ABKUERZUNG_MAX_LENGTH, { message: QUALIFIKATION_VALIDATION_ERRORS.ABKUERZUNG_TOO_LONG })
  abkuerzung!: string;

  @ApiProperty({
    description: 'Kategorie der Qualifikation',
    enum: QUALIFIKATION_KATEGORIEN,
    example: 'SANITAET',
  })
  @IsEnum(QUALIFIKATION_KATEGORIEN, {
    message: `Kategorie muss einer der folgenden Werte sein: ${QUALIFIKATION_KATEGORIEN.join(', ')}`,
  })
  kategorie!: QualifikationKategorieType;

  @ApiPropertyOptional({
    description: 'Optionale Beschreibung',
    example: 'Staatlich anerkannte Ausbildung im Rettungsdienst',
    maxLength: QUALIFIKATION_BESCHREIBUNG_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(QUALIFIKATION_BESCHREIBUNG_MAX_LENGTH, { message: QUALIFIKATION_VALIDATION_ERRORS.BESCHREIBUNG_TOO_LONG })
  beschreibung?: string;
}
