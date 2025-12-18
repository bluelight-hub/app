import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  STAMM_PERSON_VORNAME_MIN_LENGTH,
  STAMM_PERSON_VORNAME_MAX_LENGTH,
  STAMM_PERSON_NACHNAME_MIN_LENGTH,
  STAMM_PERSON_NACHNAME_MAX_LENGTH,
  STAMM_PERSON_FUNKKENNUNG_BOS_MAX_LENGTH,
  STAMM_PERSON_VALIDATION_ERRORS,
} from '@domain/kraefte/constants/stamm-person-validation.constants';

/**
 * Input DTO für das Aktualisieren einer Stamm-Person.
 *
 * Alle Felder sind optional - nur übergebene Felder werden aktualisiert.
 * Validiert Eingabedaten via class-validator und dokumentiert API via OpenAPI.
 *
 * **WICHTIG: personalnummer ist IMMUTABLE!**
 * - Personalnummer kann nach Erstellung NICHT geändert werden
 * - Grund: Personalnummer ist die eindeutige Kennung in der Organisation
 * - Bei Personalnummer-Wechsel muss neue Person angelegt werden
 * - Daher KEIN personalnummer-Feld in diesem DTO
 *
 * **Qualifikationen:**
 * - Array von Qualifikation-IDs (CUIDs) ERSETZT bestehende Qualifikationen
 * - Nutzt separate Endpoints für Add/Remove einzelner Qualifikationen:
 *   - POST /api/admin/kraefte/stamm-personen/:id/qualifikationen
 *   - DELETE /api/admin/kraefte/stamm-personen/:id/qualifikationen/:qualifikationId
 *
 * **Empty-Update Check:**
 * Handler validiert, dass mindestens ein Feld geändert wurde.
 * Vermeidet unnötige DB-Writes bei leeren Updates.
 */
export class UpdateStammPersonDto {
  @ApiPropertyOptional({
    description: 'Vorname der Person',
    example: 'Max',
    minLength: STAMM_PERSON_VORNAME_MIN_LENGTH,
    maxLength: STAMM_PERSON_VORNAME_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(STAMM_PERSON_VORNAME_MIN_LENGTH, { message: STAMM_PERSON_VALIDATION_ERRORS.VORNAME_TOO_SHORT })
  @MaxLength(STAMM_PERSON_VORNAME_MAX_LENGTH, { message: STAMM_PERSON_VALIDATION_ERRORS.VORNAME_TOO_LONG })
  vorname?: string;

  @ApiPropertyOptional({
    description: 'Nachname der Person',
    example: 'Mustermann',
    minLength: STAMM_PERSON_NACHNAME_MIN_LENGTH,
    maxLength: STAMM_PERSON_NACHNAME_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(STAMM_PERSON_NACHNAME_MIN_LENGTH, { message: STAMM_PERSON_VALIDATION_ERRORS.NACHNAME_TOO_SHORT })
  @MaxLength(STAMM_PERSON_NACHNAME_MAX_LENGTH, { message: STAMM_PERSON_VALIDATION_ERRORS.NACHNAME_TOO_LONG })
  nachname?: string;

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
    description: 'Qualifikation-IDs (CUIDs) - ERSETZT bestehende Qualifikationen (max. 50)',
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
