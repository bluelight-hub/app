import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEinsatzDto {
  @ApiPropertyOptional({
    description: 'Das Alarmstichwort des Einsatzes',
    example: 'Brand 3',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alarmstichwort?: string;

  @ApiPropertyOptional({
    description: 'Zeitpunkt der Alarmierung',
    example: '2025-01-27T14:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  alarmierungszeit?: string;
}
