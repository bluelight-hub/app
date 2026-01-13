import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Request DTO fuer Migration zu SECURE_MODE.
 *
 * Optionaler Token-Name fuer das primaere Access-Token
 * das bei der Migration erstellt wird.
 *
 * @example
 * ```json
 * {
 *   "tokenName": "Primary Server Token"
 * }
 * ```
 */
export class MigrateToSecureModeRequestDto {
  /**
   * Optionaler Name fuer das primaere Token das bei Migration erstellt wird.
   * Falls nicht angegeben, wird "Primary Access Token" verwendet.
   */
  @ApiProperty({
    description: 'Optionaler Name fuer das Migrations-Token',
    example: 'Primary Server Token',
    required: false,
    minLength: 3,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  tokenName?: string;
}

/**
 * Response DTO nach erfolgreicher Migration zu SECURE_MODE.
 *
 * Enthaelt alle Daten des erstellten primaeren Access-Tokens
 * inklusive des Klartext-Tokens. Das Klartext-Token wird NUR
 * in dieser Response zurueckgegeben!
 *
 * **Wichtig:** Das `token` ist NUR hier sichtbar! Es wird in
 * der Datenbank nur als Hash gespeichert und kann daher spaeter
 * NICHT erneut angezeigt werden.
 *
 * @example
 * ```json
 * {
 *   "success": true,
 *   "previousMode": "INSECURE",
 *   "newMode": "SECURE",
 *   "token": "blh_abc123def456ghi789...",
 *   "tokenName": "Primary Server Token",
 *   "tokenPrefix": "blh_abc1",
 *   "migratedAt": "2026-01-13T10:30:00.000Z"
 * }
 * ```
 */
export class MigrateToSecureModeResponseDto {
  /**
   * Migration erfolgreich abgeschlossen.
   */
  @ApiProperty({
    description: 'Migration erfolgreich',
    example: true,
  })
  success!: boolean;

  /**
   * Security-Mode vor der Migration.
   */
  @ApiProperty({
    description: 'Vorheriger Security-Mode',
    enum: ['INSECURE', 'SECURE'],
    example: 'INSECURE',
  })
  previousMode!: 'INSECURE' | 'SECURE';

  /**
   * Security-Mode nach der Migration.
   */
  @ApiProperty({
    description: 'Neuer Security-Mode',
    enum: ['INSECURE', 'SECURE'],
    example: 'SECURE',
  })
  newMode!: 'INSECURE' | 'SECURE';

  /**
   * Das vollstaendige primaere Access-Token im Klartext.
   * WICHTIG: Wird NUR hier zurueckgegeben, nicht erneut abrufbar!
   * Kann null sein wenn kein neues Token erstellt wurde.
   */
  @ApiProperty({
    description: 'Das vollstaendige Access-Token (NUR hier sichtbar!)',
    example: 'blh_abc123def456ghi789jkl012mno345pqr678stu901vwx234',
    nullable: true,
  })
  token!: string | null;

  /**
   * Name des erstellten primaeren Tokens.
   */
  @ApiProperty({
    description: 'Name des erstellten Tokens',
    example: 'Primary Server Token',
    nullable: true,
  })
  tokenName!: string | null;

  /**
   * Praefix des erstellten Tokens zur Identifizierung.
   */
  @ApiProperty({
    description: 'Praefix des Tokens',
    example: 'blh_abc1',
    nullable: true,
  })
  tokenPrefix!: string | null;

  /**
   * Zeitpunkt der Migration (ISO-8601).
   */
  @ApiProperty({
    description: 'Migrationszeitpunkt',
    example: '2026-01-13T10:30:00.000Z',
  })
  migratedAt!: string;
}
