import { ApiProperty } from '@nestjs/swagger';
import { AuditLogEntity } from '../entities';
import { PaginationMeta } from '@/common/interfaces/paginated-response.interface';

/**
 * Paginierte Antwort für Audit-Logs
 */
export class PaginatedAuditLogResponse {
  @ApiProperty({ 
    type: [AuditLogEntity], 
    description: 'Liste der Audit-Log-Einträge' 
  })
  items: AuditLogEntity[];

  @ApiProperty({ 
    type: PaginationMeta,
    description: 'Paginierungs-Metadaten' 
  })
  pagination: PaginationMeta;
}