import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO fuer den Ersteller eines Invite-Codes.
 *
 * Enthaelt die Basis-Informationen des Admins der den Code erstellt hat.
 *
 * @example
 * ```json
 * {
 *   "id": "user_abc123def456",
 *   "displayName": "Max Mustermann"
 * }
 * ```
 */
export class InviteCodeCreatorDto {
  /**
   * ID des Erstellers (Admin).
   */
  @ApiProperty({
    description: 'ID des Erstellers (Admin)',
    example: 'user_abc123def456',
  })
  id!: string;

  /**
   * Anzeigename des Erstellers.
   * Falls nicht verfuegbar, wird "Unbekannt" zurueckgegeben.
   */
  @ApiProperty({
    description: 'Anzeigename des Erstellers',
    example: 'Max Mustermann',
  })
  displayName!: string;
}
