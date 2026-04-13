import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ZeichenDefinitionRequestDto } from './zeichen-definition.dto';

export class UpdateTaktischesZeichenDto {
  @ApiPropertyOptional({ type: ZeichenDefinitionRequestDto, description: 'Neue Zeichendefinition' })
  @ValidateNested()
  @Type(() => ZeichenDefinitionRequestDto)
  @IsOptional()
  zeichenDefinition?: ZeichenDefinitionRequestDto;

  @ApiPropertyOptional({ description: 'Neue Beschriftung (null zum Löschen)' })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ description: 'Neue Notiz (null zum Löschen)' })
  @IsString()
  @IsOptional()
  notiz?: string;
}
