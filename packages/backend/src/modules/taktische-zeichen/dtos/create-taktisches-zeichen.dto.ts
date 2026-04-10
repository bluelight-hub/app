import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
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
}
