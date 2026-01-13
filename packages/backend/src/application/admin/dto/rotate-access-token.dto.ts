import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

/**
 * Request DTO fuer Token-Rotation.
 *
 * Ermoeglicht optional einen neuen Namen fuer das rotierte Token anzugeben.
 * Wenn kein Name angegeben wird, behaelt das neue Token den alten Namen.
 *
 * @example
 * ```json
 * {
 *   "newName": "CI/CD Pipeline (rotated 2026-01)"
 * }
 * ```
 */
export class RotateAccessTokenRequestDto {
  /**
   * Optionaler neuer Name fuer das rotierte Token.
   * Wenn nicht angegeben, wird der alte Name beibehalten.
   */
  @ApiProperty({
    description: 'Neuer Token-Name (optional, 3-50 Zeichen)',
    required: false,
    example: 'CI/CD Pipeline (rotated)',
    minLength: 3,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(3, 50, { message: 'Der Token-Name muss zwischen 3 und 50 Zeichen lang sein' })
  newName?: string;
}

/**
 * Response DTO nach erfolgreicher Token-Rotation.
 *
 * Enthaelt das neue Klartext-Token sowie Metadaten zum rotierten Token.
 * Das Klartext-Token wird NUR in dieser Response zurueckgegeben!
 *
 * **WICHTIG:** Das `token` ist NUR hier sichtbar! Der Nutzer muss es
 * sich notieren, da es spaeter NICHT erneut angezeigt werden kann.
 *
 * @example
 * ```json
 * {
 *   "token": "blh_abc123def456ghi789jkl012mno345...",
 *   "name": "CI/CD Pipeline (rotated)",
 *   "prefix": "blh_abc12345",
 *   "createdAt": "2026-01-12T14:30:00.000Z",
 *   "rotatedFromId": "blh_old123456789012345678901234"
 * }
 * ```
 */
export class RotateAccessTokenResponseDto {
  /**
   * Das neue vollstaendige Access-Token im Klartext.
   * WICHTIG: Wird NUR hier zurueckgegeben, nicht erneut abrufbar!
   */
  @ApiProperty({
    description: 'Das neue Access-Token (NUR hier sichtbar!)',
    example: 'blh_abc123def456ghi789jkl012mno345pqr678stu901',
  })
  token!: string;

  /**
   * Name des rotierten Tokens.
   * Kann null sein wenn das Original-Token keinen Namen hatte.
   */
  @ApiProperty({
    description: 'Token-Name',
    nullable: true,
    example: 'CI/CD Pipeline (rotated)',
  })
  name!: string | null;

  /**
   * Praefix des neuen Tokens zur Identifizierung in Listen.
   * Die ersten 12 Zeichen des Tokens (z.B. "blh_abc12345").
   */
  @ApiProperty({
    description: 'Token-Prefix (erste 12 Zeichen)',
    example: 'blh_abc12345',
  })
  prefix!: string;

  /**
   * Erstellungszeitpunkt des neuen Tokens (ISO-8601 String).
   * WICHTIG: Wird als String zurueckgegeben fuer konsistente API-Serialisierung.
   */
  @ApiProperty({
    description: 'Erstellungszeitpunkt des neuen Tokens (ISO-8601)',
    example: '2026-01-12T14:30:00.000Z',
    type: String,
  })
  createdAt!: string;

  /**
   * ID des alten Tokens von dem rotiert wurde.
   * Ermoeglicht vollstaendige Audit-Trail-Nachverfolgung.
   */
  @ApiProperty({
    description: 'ID des rotierten (alten) Tokens',
    example: 'blh_old123456789012345678901234567890',
  })
  rotatedFromId!: string;
}
