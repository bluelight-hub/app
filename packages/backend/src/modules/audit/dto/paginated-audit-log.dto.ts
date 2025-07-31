import { ApiProperty } from '@nestjs/swagger';
import { AuditLogEntity } from '../entities';
import { PaginationMeta } from '@/common/interfaces/paginated-response.interface';

/**
 * Paginierte Antwort für Audit-Logs
 *
 * Diese DTO-Klasse repräsentiert die strukturierte Antwort für paginierte
 * Audit-Log-Abfragen. Sie kapselt sowohl die eigentlichen Log-Einträge
 * als auch die Metadaten zur Paginierung, was eine effiziente Navigation
 * durch große Datenmengen ermöglicht.
 *
 * Die Klasse wird hauptsächlich von den Audit-Controller-Endpunkten
 * verwendet, um Audit-Logs mit Paginierungsinformationen zurückzugeben.
 *
 * @class PaginatedAuditLogResponse
 * @example
 * ```typescript
 * const response: PaginatedAuditLogResponse = {
 *   items: [
 *     {
 *       id: '123',
 *       action: 'USER_LOGIN',
 *       resource: 'auth',
 *       userId: 'user-456',
 *       timestamp: new Date('2024-01-15T10:30:00Z'),
 *       metadata: { ipAddress: '192.168.1.1' }
 *     }
 *   ],
 *   pagination: {
 *     page: 1,
 *     limit: 20,
 *     total: 150,
 *     totalPages: 8
 *   }
 * };
 * ```
 *
 * @see {@link AuditLogEntity} - Struktur der einzelnen Audit-Log-Einträge
 * @see {@link PaginationMeta} - Struktur der Paginierungs-Metadaten
 */
export class PaginatedAuditLogResponse {
  /**
   * Liste der Audit-Log-Einträge für die aktuelle Seite
   *
   * Enthält ein Array von AuditLogEntity-Objekten, die die Audit-Log-Einträge
   * für die angeforderte Seite darstellen. Die Anzahl der Einträge wird durch
   * den 'limit'-Parameter in den Paginierungs-Metadaten bestimmt.
   *
   * @property {AuditLogEntity[]} items - Array mit Audit-Log-Einträgen
   * @example
   * ```typescript
   * // Beispiel für items-Array
   * items: [
   *   { id: '1', action: 'CREATE', resource: 'user', ... },
   *   { id: '2', action: 'UPDATE', resource: 'role', ... }
   * ]
   * ```
   */
  @ApiProperty({
    type: [AuditLogEntity],
    description: 'Liste der Audit-Log-Einträge für die aktuelle Seite',
    example: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'CREATE',
        resource: 'user',
        userId: 'user-123',
        timestamp: '2024-01-15T10:30:00Z',
      },
    ],
  })
  items: AuditLogEntity[];

  /**
   * Metadaten zur Paginierung
   *
   * Enthält alle notwendigen Informationen zur Navigation durch die
   * paginierten Audit-Logs, einschließlich aktueller Seitennummer,
   * Anzahl der Einträge pro Seite, Gesamtanzahl der Einträge und
   * Gesamtanzahl der verfügbaren Seiten.
   *
   * @property {PaginationMeta} pagination - Objekt mit Paginierungs-Informationen
   * @example
   * ```typescript
   * // Beispiel für pagination-Objekt
   * pagination: {
   *   page: 2,
   *   limit: 50,
   *   total: 245,
   *   totalPages: 5
   * }
   * ```
   */
  @ApiProperty({
    type: PaginationMeta,
    description: 'Metadaten zur Paginierung mit Seiteninformationen',
    example: {
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
    },
  })
  pagination: PaginationMeta;
}
