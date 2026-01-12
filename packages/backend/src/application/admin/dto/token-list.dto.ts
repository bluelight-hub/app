import { ApiProperty } from '@nestjs/swagger';
import { TokenListItemDto } from './token-list-item.dto';

/**
 * Pagination Metadaten für Token-Listen.
 */
export class TokenListPaginationDto {
  @ApiProperty({ description: 'Aktuelle Seite', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Einträge pro Seite', example: 20 })
  pageSize!: number;

  @ApiProperty({ description: 'Gesamtanzahl der Tokens', example: 50 })
  total!: number;

  @ApiProperty({ description: 'Gesamtanzahl der Seiten', example: 3 })
  totalPages!: number;
}

/**
 * DTO für die paginierte Token-Liste.
 *
 * @example
 * ```json
 * {
 *   "data": [
 *     {
 *       "id": "blh_abc123...",
 *       "name": "CI/CD Pipeline",
 *       "prefix": "blh_abc12345",
 *       "createdAt": "2026-01-12T10:00:00.000Z",
 *       "status": "active",
 *       "lastUsedAt": "2026-01-12T12:30:00.000Z"
 *     }
 *   ],
 *   "meta": {
 *     "page": 1,
 *     "pageSize": 20,
 *     "total": 1,
 *     "totalPages": 1
 *   }
 * }
 * ```
 */
export class TokenListDto {
  @ApiProperty({
    description: 'Liste der Tokens',
    type: [TokenListItemDto],
  })
  data!: TokenListItemDto[];

  @ApiProperty({
    description: 'Pagination Metadaten',
    type: TokenListPaginationDto,
  })
  meta!: TokenListPaginationDto;
}
