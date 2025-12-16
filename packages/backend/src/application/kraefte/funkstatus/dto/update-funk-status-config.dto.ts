import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, Matches, IsBoolean } from 'class-validator';
import { FUNKSTATUS_VALIDATION } from '@domain/kraefte/constants/funkstatus-validation.constants';

/**
 * Request DTO für Update FunkStatusConfig API-Endpunkt.
 *
 * Validiert eingehende Daten mit class-validator Decorators.
 *
 * **Wichtig:**
 * - code und standardLabel sind NICHT änderbar (nicht in DTO)
 * - customLabel kann gesetzt werden um standardLabel zu überschreiben
 * - Leere Strings werden nach trim() zu undefined (Fallback zu Standard)
 */
export class UpdateFunkStatusConfigDto {
  @ApiPropertyOptional({
    description: 'Angepasstes Label (überschreibt standardLabel in UI)',
    maxLength: FUNKSTATUS_VALIDATION.LABEL_MAX_LENGTH,
    example: 'Verfügbar',
  })
  @IsOptional()
  @IsString()
  @MaxLength(FUNKSTATUS_VALIDATION.LABEL_MAX_LENGTH)
  customLabel?: string;

  @ApiPropertyOptional({
    description: 'Farbe als Hex-Code (#RRGGBB)',
    example: '#00FF00',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(FUNKSTATUS_VALIDATION.COLOR_HEX_PATTERN, {
    message: 'Farbe muss Hex-Format haben (#RRGGBB)',
  })
  farbe?: string;

  @ApiPropertyOptional({
    description: 'Ob Fahrzeuge mit diesem Status alarmierbar sind',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  istAlarmierbar?: boolean;

  @ApiPropertyOptional({
    description: 'Beschreibung des Status',
    maxLength: FUNKSTATUS_VALIDATION.BESCHREIBUNG_MAX_LENGTH,
    example: 'Fahrzeug ist einsatzbereit und kann alarmiert werden',
  })
  @IsOptional()
  @IsString()
  @MaxLength(FUNKSTATUS_VALIDATION.BESCHREIBUNG_MAX_LENGTH)
  beschreibung?: string;
}
