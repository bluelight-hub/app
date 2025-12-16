import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  ROLLE_NAME_MIN_LENGTH,
  ROLLE_NAME_MAX_LENGTH,
  ROLLE_FUNKRUFNAME_MAX_LENGTH,
  ROLLE_BESCHREIBUNG_MAX_LENGTH,
  ROLLE_VALIDATION_ERRORS,
} from '@domain/kraefte/constants/rolle-validation.constants';

/**
 * DTO für die Aktualisierung einer RollenDefinition.
 * Alle Felder optional (Partial Update).
 */
export class UpdateRollenDefinitionDto {
  @ApiPropertyOptional({
    description: 'Name der Rolle',
    minLength: ROLLE_NAME_MIN_LENGTH,
    maxLength: ROLLE_NAME_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(ROLLE_NAME_MIN_LENGTH, { message: ROLLE_VALIDATION_ERRORS.NAME_TOO_SHORT })
  @MaxLength(ROLLE_NAME_MAX_LENGTH, { message: ROLLE_VALIDATION_ERRORS.NAME_TOO_LONG })
  name?: string;

  @ApiPropertyOptional({
    description: 'Funkrufname der Rolle',
    maxLength: ROLLE_FUNKRUFNAME_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(ROLLE_FUNKRUFNAME_MAX_LENGTH, { message: ROLLE_VALIDATION_ERRORS.FUNKRUFNAME_TOO_LONG })
  funkrufname?: string;

  @ApiPropertyOptional({
    description: 'Beschreibung der Rolle',
    maxLength: ROLLE_BESCHREIBUNG_MAX_LENGTH,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(ROLLE_BESCHREIBUNG_MAX_LENGTH, { message: ROLLE_VALIDATION_ERRORS.BESCHREIBUNG_TOO_LONG })
  beschreibung?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'IDs der erforderlichen Qualifikationen (ersetzt bestehende)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qualifikationIds?: string[];
}
