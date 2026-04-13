import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ZeichenDefinitionRequestDto } from './zeichen-definition.dto';

export class CreateTaktischesZeichenDto {
  @ApiProperty({ type: ZeichenDefinitionRequestDto, description: 'Zeichendefinition (Grundzeichen, Organisation usw.)' })
  @ValidateNested()
  @Type(() => ZeichenDefinitionRequestDto)
  zeichenDefinition!: ZeichenDefinitionRequestDto;

  @ApiPropertyOptional({ description: 'Art der verknüpften Ressource (EINHEIT, FAHRZEUG, ROLLE)' })
  @IsString()
  @IsOptional()
  referenzTyp?: string;

  @ApiPropertyOptional({ description: 'ID der verknüpften Ressource' })
  @IsString()
  @IsOptional()
  referenzId?: string;

  @ApiPropertyOptional({ description: 'Optionale Beschriftung des Zeichens' })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ description: 'Optionale Notiz/Bemerkung' })
  @IsString()
  @IsOptional()
  notiz?: string;

  @ApiPropertyOptional({ description: 'Gibt an ob das Zeichen aus dem Katalog stammt', default: false })
  @IsBoolean()
  @IsOptional()
  istAusKatalog?: boolean;

  @ApiPropertyOptional({ description: 'ID des Katalogeintrags' })
  @IsString()
  @IsOptional()
  katalogEintragId?: string;

  @ApiPropertyOptional({ description: 'ID der Lagekarte für sofortige Platzierung' })
  @IsString()
  @IsOptional()
  lagekarteId?: string;

  @ApiPropertyOptional({ description: 'WGS84 Breitengrad für sofortige Platzierung' })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ description: 'WGS84 Längengrad für sofortige Platzierung' })
  @IsNumber()
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional({ description: 'MGRS-Koordinate für sofortige Platzierung' })
  @IsString()
  @IsOptional()
  mgrs?: string;
}
