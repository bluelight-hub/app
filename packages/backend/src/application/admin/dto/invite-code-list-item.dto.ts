import { ApiProperty } from '@nestjs/swagger';
import { InviteCodeStatus } from '@domain/value-objects/invite-code-status';
import { InviteCodeCreatorDto } from './invite-code-creator.dto';

/**
 * DTO fuer ein einzelnes Invite-Code Element in der Liste.
 *
 * Der Code wird aus Sicherheitsgruenden maskiert zurueckgegeben (z.B. "ABC1****").
 * Der vollstaendige Code ist nur bei der Erstellung sichtbar.
 *
 * @example
 * ```json
 * {
 *   "id": "inv_abc123def456",
 *   "code": "ABC1****",
 *   "expiresAt": "2026-02-01T12:00:00.000Z",
 *   "maxUses": 5,
 *   "useCount": 2,
 *   "status": "active",
 *   "label": "Team Nord Onboarding",
 *   "createdAt": "2026-01-07T10:30:00.000Z",
 *   "createdBy": {
 *     "id": "user_abc123",
 *     "displayName": "Max Mustermann"
 *   },
 *   "revokedAt": null
 * }
 * ```
 */
export class InviteCodeListItemDto {
  /**
   * Eindeutige ID des Invite-Codes.
   */
  @ApiProperty({
    description: 'Eindeutige ID des Invite-Codes',
    example: 'inv_abc123def456',
  })
  id!: string;

  /**
   * Maskierter Code (z.B. "ABC1****").
   * Der vollstaendige Code ist nur bei der Erstellung sichtbar.
   */
  @ApiProperty({
    description: 'Maskierter Code (z.B. ABC1****)',
    example: 'ABC1****',
  })
  code!: string;

  /**
   * Ablaufdatum des Invite-Codes (ISO-8601).
   */
  @ApiProperty({
    description: 'Ablaufdatum des Invite-Codes (ISO-8601)',
    example: '2026-02-01T12:00:00.000Z',
  })
  expiresAt!: string;

  /**
   * Maximale Anzahl erlaubter Nutzungen.
   */
  @ApiProperty({
    description: 'Maximale Anzahl erlaubter Nutzungen',
    example: 5,
    minimum: 1,
    maximum: 100,
  })
  maxUses!: number;

  /**
   * Aktuelle Anzahl der Nutzungen.
   */
  @ApiProperty({
    description: 'Aktuelle Anzahl der Nutzungen',
    example: 2,
    minimum: 0,
  })
  useCount!: number;

  /**
   * Berechneter Status des Codes.
   * Moegliche Werte: active, used, expired, revoked
   */
  @ApiProperty({
    description: 'Berechneter Status des Codes',
    enum: InviteCodeStatus,
    example: InviteCodeStatus.ACTIVE,
  })
  status!: InviteCodeStatus;

  /**
   * Optionales Label zur Identifizierung.
   */
  @ApiProperty({
    description: 'Optionales Label zur Identifizierung',
    example: 'Team Nord Onboarding',
    required: false,
    nullable: true,
  })
  label?: string | null;

  /**
   * Erstellungszeitpunkt (ISO-8601).
   */
  @ApiProperty({
    description: 'Erstellungszeitpunkt (ISO-8601)',
    example: '2026-01-07T10:30:00.000Z',
  })
  createdAt!: string;

  /**
   * Informationen zum Ersteller des Codes.
   */
  @ApiProperty({
    description: 'Informationen zum Ersteller des Codes',
    type: () => InviteCodeCreatorDto,
  })
  createdBy!: InviteCodeCreatorDto;

  /**
   * Zeitpunkt des Widerrufs (null wenn nicht widerrufen).
   */
  @ApiProperty({
    description: 'Zeitpunkt des Widerrufs (null wenn nicht widerrufen)',
    example: null,
    required: false,
    nullable: true,
  })
  revokedAt?: string | null;
}
