import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * DTO für das Aktualisieren einer taktischen Einheit.
 *
 * Alle Felder sind optional — nur übergebene Felder werden aktualisiert (Partial Update).
 * Status-Änderungen erfolgen über den separaten ChangeEinsatzEinheitStatusDto Endpoint.
 */
export class UpdateEinsatzEinheitDto {
  @ApiPropertyOptional({
    description: 'Neuer Name der Einheit (max. 100 Zeichen)',
    example: '2. Bergungsgruppe',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Neuer Typ der taktischen Einheit',
    enum: ['TRUPP', 'STAFFEL', 'GRUPPE', 'ZUG', 'ABSCHNITT'],
    example: 'ZUG',
  })
  @IsOptional()
  @IsEnum(['TRUPP', 'STAFFEL', 'GRUPPE', 'ZUG', 'ABSCHNITT'], {
    message: 'typ muss einer der folgenden Werte sein: TRUPP, STAFFEL, GRUPPE, ZUG, ABSCHNITT',
  })
  typ?: string;

  @ApiPropertyOptional({
    description: 'Neue Funktion/Aufgabe der Einheit (max. 100 Zeichen)',
    example: 'Rettung',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  funktion?: string;

  @ApiPropertyOptional({
    description: 'Neue übergeordnete Einheit-ID (CUID2)',
    example: 'clw4i9jkl8m9n0opq1rs',
  })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Neue Soll-Stärke (geplante Personenanzahl, 0-9999)',
    example: 12,
    minimum: 0,
    maximum: 9999,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sollStaerke?: number;

  @ApiPropertyOptional({
    description: 'Neuer Auftrag der Einheit (max. 500 Zeichen)',
    example: 'Evakuierung Abschnitt Süd',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  auftrag?: string;

  @ApiPropertyOptional({
    description: 'Neuer Einsatzort der Einheit (max. 200 Zeichen)',
    example: 'Bahnhofstraße 5',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  einsatzort?: string;
}
