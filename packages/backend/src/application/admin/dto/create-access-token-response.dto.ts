import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO nach erfolgreicher Access-Token Erstellung.
 *
 * Enthaelt alle Daten des erstellten Access-Tokens inklusive
 * des Klartext-Tokens. Das Klartext-Token wird NUR in dieser Response
 * zurueckgegeben und kann spaeter NICHT erneut abgerufen werden.
 *
 * **Wichtig:** Das `token` ist NUR hier sichtbar! Es wird in
 * der Datenbank nur als Hash gespeichert und kann daher spaeter
 * NICHT erneut angezeigt werden. Der Nutzer muss es sich notieren!
 *
 * @example
 * ```json
 * {
 *   "token": "blh_abc123def456ghi789...",
 *   "name": "CI/CD Pipeline Token",
 *   "prefix": "blh_abc1",
 *   "createdAt": "2026-01-12T10:30:00.000Z"
 * }
 * ```
 */
export class CreateAccessTokenResponseDto {
  /**
   * Das vollstaendige Access-Token im Klartext.
   * WICHTIG: Wird NUR hier zurueckgegeben, nicht erneut abrufbar!
   * Format: blh_<random-string>
   */
  @ApiProperty({
    description: 'Das vollstaendige Access-Token (NUR hier sichtbar!)',
    example: 'blh_abc123def456ghi789jkl012mno345pqr678stu901vwx234',
  })
  token!: string;

  /**
   * Name des Access-Tokens zur Identifizierung.
   */
  @ApiProperty({
    description: 'Name des Access-Tokens',
    example: 'CI/CD Pipeline Token',
  })
  name!: string;

  /**
   * Praefix des Tokens zur Identifizierung in Listen.
   * Die ersten 8 Zeichen des Tokens (z.B. "blh_abc1").
   */
  @ApiProperty({
    description: 'Praefix des Tokens zur Identifizierung (erste 8 Zeichen)',
    example: 'blh_abc1',
  })
  prefix!: string;

  /**
   * Erstellungszeitpunkt (ISO-8601).
   */
  @ApiProperty({
    description: 'Erstellungszeitpunkt',
    example: '2026-01-12T10:30:00.000Z',
  })
  createdAt!: string;
}
