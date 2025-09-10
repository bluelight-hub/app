import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEinsatzDto {
  @ApiPropertyOptional({
    description: 'Das Alarmstichwort des Einsatzes',
    example: 'Brand 3',
    maxLength: 255,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alarmstichwort?: string;

  @ApiPropertyOptional({
    description: 'Der initiale Einsatzort',
    example: 'Musterstraße 123, 12345 Musterstadt',
    maxLength: 500,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  einsatzort?: string;

  @ApiPropertyOptional({
    description: 'Beschreibung des Einsatzes',
    example: 'Rauchentwicklung im 2. OG, keine Personen in Gefahr',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  beschreibung?: string;

  @ApiPropertyOptional({
    description: 'Zeitpunkt der Alarmierung',
    example: '2025-01-27T14:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  alarmierungszeit?: string;

  @ApiPropertyOptional({
    description: 'Name des Einsatzleiters',
    example: 'Max Mustermann',
    maxLength: 255,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  einsatzleiter?: string;
}
