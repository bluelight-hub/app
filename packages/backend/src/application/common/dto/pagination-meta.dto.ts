import { ApiProperty } from '@nestjs/swagger';

/**
 * Meta-DTO fuer Pagination Informationen.
 *
 * Enthaelt alle Pagination-relevanten Metadaten fuer paginierte API-Responses.
 * Wird von der TransformInterceptor automatisch hinzugefuegt wenn PaginatedData
 * zurueckgegeben wird.
 *
 * @example
 * ```json
 * {
 *   "page": 1,
 *   "pageSize": 20,
 *   "total": 150,
 *   "totalPages": 8
 * }
 * ```
 */
export class PaginationMetaDto {
  /**
   * Aktuelle Seitennummer (1-basiert).
   */
  @ApiProperty({
    description: 'Aktuelle Seitennummer (1-basiert)',
    example: 1,
    minimum: 1,
  })
  page!: number;

  /**
   * Anzahl der Eintraege pro Seite.
   */
  @ApiProperty({
    description: 'Anzahl der Eintraege pro Seite',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  pageSize!: number;

  /**
   * Gesamtanzahl aller Eintraege (ueber alle Seiten).
   */
  @ApiProperty({
    description: 'Gesamtanzahl aller Eintraege',
    example: 150,
    minimum: 0,
  })
  total!: number;

  /**
   * Gesamtanzahl der Seiten.
   * Berechnet als: Math.ceil(total / pageSize)
   */
  @ApiProperty({
    description: 'Gesamtanzahl der Seiten',
    example: 8,
    minimum: 0,
  })
  totalPages!: number;
}
