import { ApiProperty } from '@nestjs/swagger';
import { InviteCodeStatus } from '@domain/value-objects/invite-code-status';

/**
 * Response DTO nach erfolgreichem Widerruf eines Invite-Codes.
 *
 * Gibt den neuen Status des Codes zurück inklusive
 * des Zeitpunkts des Widerrufs (falls vorhanden).
 *
 * **Hinweis:**
 * - Der Code wird maskiert zurueckgegeben (z.B. "ABC1****")
 * - Status ist entweder REVOKED (erfolgreich widerrufen) oder USED (war bereits aufgebraucht)
 * - revokedAt ist null wenn der Code nicht explizit widerrufen wurde (z.B. USED Status)
 *
 * @example
 * ```json
 * {
 *   "id": "inv_abc123def456ghi789jkl012",
 *   "code": "ABC1****",
 *   "status": "revoked",
 *   "revokedAt": "2026-01-07T12:00:00.000Z"
 * }
 * ```
 */
export class RevokeInviteResponseDto {
  /**
   * Eindeutige ID des Invite-Codes.
   */
  @ApiProperty({
    description: 'Eindeutige ID des Invite-Codes',
    example: 'inv_abc123def456ghi789jkl012',
  })
  id!: string;

  /**
   * Maskierter Invite-Code.
   * Aus Sicherheitsgruenden wird nur der maskierte Code zurueckgegeben.
   */
  @ApiProperty({
    description: 'Maskierter Invite-Code',
    example: 'ABC1****',
  })
  code!: string;

  /**
   * Aktueller Status des Invite-Codes.
   */
  @ApiProperty({
    description: 'Status des Invite-Codes nach dem Widerruf',
    enum: InviteCodeStatus,
    example: InviteCodeStatus.REVOKED,
  })
  status!: InviteCodeStatus;

  /**
   * Zeitpunkt des Widerrufs (ISO-8601).
   * Null wenn der Code nicht explizit widerrufen wurde (z.B. bei USED Status).
   */
  @ApiProperty({
    description: 'Zeitpunkt des Widerrufs',
    example: '2026-01-07T12:00:00.000Z',
    required: false,
    nullable: true,
  })
  revokedAt?: string | null;
}
