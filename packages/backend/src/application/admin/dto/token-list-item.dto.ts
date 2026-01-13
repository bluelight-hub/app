import { ApiProperty } from '@nestjs/swagger';

// Importiere und re-exportiere TokenStatus aus dem Aggregate fuer Konsistenz
import type { TokenStatus } from '@domain/aggregates/server-access-token.aggregate';
export type { TokenStatus };

/**
 * Rotations-Status eines Tokens.
 *
 * - `'replacement'`: Dieses Token wurde durch Rotation erstellt (rotatedFromId ist gesetzt)
 * - `'rotated'`: Dieses Token wurde durch Rotation ersetzt (isRevoked && ein anderes Token hat rotatedFromId = this.id)
 * - `null`: Normales Token (weder rotiert noch Replacement)
 */
export type TokenRotatedStatus = 'rotated' | 'replacement' | null;

/**
 * DTO für ein einzelnes Token-Element in der Liste.
 *
 * WICHTIG: Der Token-Hash wird NIEMALS in der Response zurückgegeben!
 * Der Prefix zeigt nur die ersten Zeichen des ursprünglichen Tokens.
 *
 * @example
 * ```json
 * {
 *   "id": "blh_abc123def456...",
 *   "name": "CI/CD Pipeline",
 *   "prefix": "blh_abc12345",
 *   "createdAt": "2026-01-12T10:00:00.000Z",
 *   "status": "active",
 *   "lastUsedAt": "2026-01-12T12:30:00.000Z"
 * }
 * ```
 */
export class TokenListItemDto {
  /**
   * Eindeutige ID des Tokens (AccessTokenId).
   */
  @ApiProperty({
    description: 'Eindeutige Token ID',
    example: 'blh_clxyz123abc456def789',
  })
  id!: string;

  /**
   * Name/Label des Tokens.
   */
  @ApiProperty({
    description: 'Token-Name/Label',
    example: 'CI/CD Pipeline',
  })
  name!: string;

  /**
   * Token-Prefix (die ersten 12 Zeichen des Tokens, maskiert).
   * Format: blh_ + erste 8 Zeichen
   */
  @ApiProperty({
    description: 'Token-Prefix (maskiert)',
    example: 'blh_abc12345',
  })
  prefix!: string;

  /**
   * Erstellungsdatum des Tokens (ISO-8601).
   */
  @ApiProperty({
    description: 'Erstellungsdatum (ISO-8601)',
    example: '2026-01-12T10:00:00.000Z',
  })
  createdAt!: string;

  /**
   * Aktueller Status des Tokens.
   * - active: Token ist gültig und kann verwendet werden
   * - revoked: Token wurde widerrufen
   * - expired: Token ist abgelaufen
   */
  @ApiProperty({
    description: 'Token-Status',
    enum: ['active', 'revoked', 'expired'],
    example: 'active',
  })
  status!: TokenStatus;

  /**
   * Zeitpunkt der letzten Verwendung (null wenn nie genutzt).
   */
  @ApiProperty({
    description: 'Letzte Verwendung (ISO-8601)',
    example: '2026-01-12T12:30:00.000Z',
    nullable: true,
  })
  lastUsedAt!: string | null;

  /**
   * Ablaufdatum des Tokens (null wenn kein Ablauf).
   */
  @ApiProperty({
    description: 'Ablaufdatum (ISO-8601)',
    example: '2027-01-12T00:00:00.000Z',
    nullable: true,
  })
  expiresAt!: string | null;

  /**
   * Zeitpunkt der Widerrufung (null wenn nicht widerrufen).
   */
  @ApiProperty({
    description: 'Widerrufungsdatum (ISO-8601)',
    example: '2026-01-12T14:30:00.000Z',
    nullable: true,
  })
  revokedAt!: string | null;

  /**
   * ID des ursprünglichen Tokens bei Rotation.
   * Gesetzt wenn dieses Token durch Rotation eines anderen Tokens erstellt wurde.
   */
  @ApiProperty({
    description: 'ID des ursprünglichen Tokens bei Rotation',
    example: 'blh_clxyz999abc456def789',
    required: false,
    nullable: true,
  })
  rotatedFromId?: string | null;

  /**
   * Rotations-Status des Tokens.
   * - `replacement`: Token wurde durch Rotation erstellt (rotatedFromId ist gesetzt)
   * - `rotated`: Token wurde durch Rotation ersetzt (widerrufen mit Nachfolger)
   * - `null`: Normales Token ohne Rotation
   */
  @ApiProperty({
    description: 'Rotations-Status des Tokens',
    enum: ['rotated', 'replacement'],
    required: false,
    nullable: true,
    example: null,
  })
  rotatedStatus?: TokenRotatedStatus;
}
