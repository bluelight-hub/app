import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
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
 * Input DTO für das Aktualisieren eines Fahrzeugtyps.
 *
 * Alle Felder sind optional - nur übergebene Felder werden aktualisiert.
 * Validiert Eingabedaten via class-validator und dokumentiert API via OpenAPI.
 *
 * **Empty-Update Check (Task 7):**
 * Handler validiert, dass mindestens ein Feld geändert wurde.
 * Vermeidet unnötige DB-Writes bei leeren Updates.
 */
export class UpdateFahrzeugtypDto {
  @ApiPropertyOptional({
    description: 'Eindeutiger Code (z.B. RTW, NEF, KTW) - wird automatisch auf UPPERCASE normalisiert',
    example: 'RTW',
    minLength: FAHRZEUGTYP_CODE_MIN_LENGTH,
    maxLength: FAHRZEUGTYP_CODE_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsOptional()
  @IsString()
  @MinLength(FAHRZEUGTYP_CODE_MIN_LENGTH, { message: FAHRZEUGTYP_VALIDATION_ERRORS.CODE_TOO_SHORT })
  @MaxLength(FAHRZEUGTYP_CODE_MAX_LENGTH, { message: FAHRZEUGTYP_VALIDATION_ERRORS.CODE_TOO_LONG })
  code?: string;

  @ApiPropertyOptional({
    description: 'Vollständige Bezeichnung',
    example: 'Rettungswagen',
    minLength: FAHRZEUGTYP_BEZEICHNUNG_MIN_LENGTH,
    maxLength: FAHRZEUGTYP_BEZEICHNUNG_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(FAHRZEUGTYP_BEZEICHNUNG_MIN_LENGTH, { message: FAHRZEUGTYP_VALIDATION_ERRORS.BEZEICHNUNG_TOO_SHORT })
  @MaxLength(FAHRZEUGTYP_BEZEICHNUNG_MAX_LENGTH, { message: FAHRZEUGTYP_VALIDATION_ERRORS.BEZEICHNUNG_TOO_LONG })
  bezeichnung?: string;

  @ApiPropertyOptional({
    description: 'Kategorie des Fahrzeugtyps',
    enum: FAHRZEUGTYP_KATEGORIEN,
    example: 'RETTUNGSDIENST',
  })
  @IsOptional()
  @IsEnum(FAHRZEUGTYP_KATEGORIEN, {
    message: `Kategorie muss einer der folgenden Werte sein: ${FAHRZEUGTYP_KATEGORIEN.join(', ')}`,
  })
  kategorie?: FahrzeugtypKategorieType;

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

  @ApiPropertyOptional({
    description: 'Aktivierungsstatus',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  istAktiv?: boolean;
}
