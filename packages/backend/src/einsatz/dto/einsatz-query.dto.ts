import { ApiPropertyOptional } from '@nestjs/swagger';
import { EinsatzStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * DTO für Query-Parameter beim Abrufen von Einsätzen
 */
export class EinsatzQueryDto {
  @ApiPropertyOptional({
    enum: EinsatzStatus,
    description: 'Filter nach Einsatz-Status',
    example: EinsatzStatus.ANGELEGT,
  })
  @IsOptional()
  @IsEnum(EinsatzStatus)
  status?: EinsatzStatus;

  @ApiPropertyOptional({
    description: 'Vollständigkeits-Information einschließen',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeCompleteness?: boolean;

  @ApiPropertyOptional({
    description: 'Seitennummer für Pagination (startet bei 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  page?: number;

  @ApiPropertyOptional({
    description: 'Anzahl Einträge pro Seite',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  limit?: number;

  @ApiPropertyOptional({
    description: 'Suchbegriff für Alarmstichwort oder ID (durchsucht auch den generierten Namen)',
    example: 'Wohnungsbrand',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
