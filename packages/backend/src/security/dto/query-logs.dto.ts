import { IsOptional, IsString, IsISO8601, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO für die Abfrage von Security Logs mit Filteroptionen und Pagination.
 * Validiert eingehende Query-Parameter für die Admin API.
 */
export class QueryLogsDto {
  /**
   * Optionaler Filter für den Event-Typ
   * @example "LOGIN_FAILED"
   */
  @ApiPropertyOptional({
    description: 'Filter logs by event type',
    example: 'LOGIN_FAILED',
  })
  @IsOptional()
  @IsString()
  eventType?: string;

  /**
   * Optionaler Filter für die Benutzer-ID
   * @example "user_abc123def456"
   */
  @ApiPropertyOptional({
    description: 'Filter logs by user ID',
    example: 'user_abc123def456',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  /**
   * Startdatum für Zeitbereichsfilter (ISO 8601)
   * @example "2024-01-01T00:00:00.000Z"
   */
  @ApiPropertyOptional({
    description: 'Start date for time range filter (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  /**
   * Enddatum für Zeitbereichsfilter (ISO 8601)
   * @example "2024-12-31T23:59:59.999Z"
   */
  @ApiPropertyOptional({
    description: 'End date for time range filter (ISO 8601)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;

  /**
   * Seitenzahl für Pagination (beginnt bei 1)
   * @default 1
   * @example 1
   */
  @ApiPropertyOptional({
    description: 'Page number for pagination (starts at 1)',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  /**
   * Anzahl der Einträge pro Seite
   * @default 20
   * @minimum 1
   * @maximum 100
   * @example 20
   */
  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
