import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * DTO für das Erstellen einer taktischen Einheit im Einsatz.
 *
 * **Pflichtfelder:** name, typ
 * **Optionale Felder:** funktion, parentId, sollStaerke, auftrag, einsatzort
 *
 * Der Typ bestimmt die Größenordnung (TRUPP < STAFFEL < GRUPPE < ZUG < ABSCHNITT).
 * Über parentId kann eine hierarchische Zuordnung erfolgen.
 */
export class CreateEinsatzEinheitDto {
  @ApiProperty({
    description: 'Name der Einheit (max. 100 Zeichen)',
    example: '1. Bergungsgruppe',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Typ der taktischen Einheit',
    enum: ['TRUPP', 'STAFFEL', 'GRUPPE', 'ZUG', 'ABSCHNITT'],
    example: 'GRUPPE',
  })
  @IsEnum(['TRUPP', 'STAFFEL', 'GRUPPE', 'ZUG', 'ABSCHNITT'], {
    message: 'typ muss einer der folgenden Werte sein: TRUPP, STAFFEL, GRUPPE, ZUG, ABSCHNITT',
  })
  typ!: string;

  @ApiPropertyOptional({
    description: 'Funktion/Aufgabe der Einheit (max. 100 Zeichen)',
    example: 'Bergung',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  funktion?: string;

  @ApiPropertyOptional({
    description: 'Übergeordnete Einheit-ID (CUID2) für hierarchische Zuordnung',
    example: 'clw4i9jkl8m9n0opq1rs',
  })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Soll-Stärke (geplante Personenanzahl, 0-9999)',
    example: 9,
    minimum: 0,
    maximum: 9999,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sollStaerke?: number;

  @ApiPropertyOptional({
    description: 'Auftrag der Einheit (max. 500 Zeichen)',
    example: 'Gebäudesicherung Abschnitt Nord',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  auftrag?: string;

  @ApiPropertyOptional({
    description: 'Einsatzort der Einheit (max. 200 Zeichen)',
    example: 'Hauptstraße 12, Gebäude A',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  einsatzort?: string;
}
