import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '@application/common/dto/pagination-meta.dto';
import { InviteCodeListItemDto } from './invite-code-list-item.dto';

/**
 * Response DTO fuer die Invite-Code Liste.
 *
 * Enthaelt die paginierte Liste der Invite-Codes sowie Pagination-Metadaten.
 *
 * @example
 * ```json
 * {
 *   "data": [
 *     {
 *       "id": "inv_abc123",
 *       "code": "ABC1****",
 *       "status": "active",
 *       ...
 *     }
 *   ],
 *   "meta": {
 *     "page": 1,
 *     "pageSize": 20,
 *     "total": 45,
 *     "totalPages": 3
 *   }
 * }
 * ```
 */
export class InviteCodeListDto {
  /**
   * Liste der Invite-Codes.
   */
  @ApiProperty({
    description: 'Liste der Invite-Codes',
    type: [InviteCodeListItemDto],
  })
  data!: InviteCodeListItemDto[];

  /**
   * Pagination-Metadaten.
   */
  @ApiProperty({
    description: 'Pagination-Metadaten',
    type: PaginationMetaDto,
  })
  meta!: PaginationMetaDto;
}
