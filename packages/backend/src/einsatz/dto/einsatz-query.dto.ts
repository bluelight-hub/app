import { ApiPropertyOptional } from '@nestjs/swagger';
import { EinsatzStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Enum für Sortierfelder
 */
export enum EinsatzOrderByField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  alarmstichwort = 'alarmstichwort',
  status = 'status',
  name = 'name',
}

/**
 * Enum für Sortierrichtung
 */
export enum OrderDirection {
  asc = 'asc',
  desc = 'desc',
}

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
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === '1' || value === 1) return true;
    if (value === 'false' || value === false || value === '0' || value === 0) return false;
    return undefined; // Keep undefined for optional field
  })
  @IsBoolean()
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

  @ApiPropertyOptional({
    description: 'Archivierte Einsätze einschließen (Standard: false - gemäß No-Delete Policy)',
    example: false,
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === '1' || value === 1) return true;
    if (value === 'false' || value === false || value === '0' || value === 0) return false;
    return false; // Default to false for includeArchived
  })
  @IsBoolean()
  includeArchived?: boolean = false;

  @ApiPropertyOptional({
    description: 'Sortierfeld',
    example: 'createdAt',
    enum: EinsatzOrderByField,
  })
  @IsOptional()
  @IsEnum(EinsatzOrderByField, { message: 'orderBy muss eines der definierten Felder sein' })
  orderBy?: EinsatzOrderByField;

  @ApiPropertyOptional({
    description: 'Sortierrichtung',
    example: 'desc',
    enum: OrderDirection,
  })
  @IsOptional()
  @IsEnum(OrderDirection, { message: 'orderDirection muss "asc" oder "desc" sein' })
  orderDirection?: OrderDirection;
}
