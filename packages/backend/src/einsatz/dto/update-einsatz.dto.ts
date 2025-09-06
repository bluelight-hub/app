import { ApiPropertyOptional } from '@nestjs/swagger';
import { EinsatzStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateEinsatzDto {
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
    description: 'Der Einsatzort',
    example: 'Musterstraße 123, 12345 Musterstadt',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  einsatzort?: string;

  @ApiPropertyOptional({
    description: 'Beschreibung des Einsatzes',
    example: 'Rauchentwicklung im 2. OG, keine Personen in Gefahr',
  })
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
  @IsOptional()
  @IsString()
  @MaxLength(255)
  einsatzleiter?: string;

  @ApiPropertyOptional({
    description: 'Status des Einsatzes',
    enum: EinsatzStatus,
    example: EinsatzStatus.IN_BEARBEITUNG,
  })
  @IsOptional()
  @IsEnum(EinsatzStatus)
  status?: EinsatzStatus;

  @ApiPropertyOptional({
    description: 'Zusätzliche Metadaten als JSON',
    example: { notizen: 'Wichtiger Hinweis', prioritaet: 'hoch' },
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
