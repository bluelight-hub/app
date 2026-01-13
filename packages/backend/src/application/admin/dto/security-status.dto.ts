import { ApiProperty } from '@nestjs/swagger';

/**
 * Security-Mode Status Response DTO.
 *
 * Zeigt den aktuellen Sicherheitsmodus des Servers an.
 * Wird vom GetSecurityStatusHandler zurueckgegeben.
 *
 * **Use Cases (Story 4.6):**
 * - AC1: INSECURE Mode Status pruefen
 * - AC5: Setup-Completion Status pruefen (activeTokenCount >= 1)
 * - AC6: Active Token Count fuer Migration-Entscheidung
 *
 * @example
 * ```json
 * {
 *   "insecureMode": true,
 *   "setupComplete": true,
 *   "activeTokenCount": 2,
 *   "migratedAt": null
 * }
 * ```
 */
export class SecurityStatusDto {
  /**
   * Server befindet sich im INSECURE Mode (kein Token erforderlich).
   * - true: Server akzeptiert Anfragen ohne Token
   * - false: Server erfordert gueltiges Access-Token
   */
  @ApiProperty({
    description: 'Server im INSECURE Mode (true = ohne Token-Authentifizierung)',
    example: true,
  })
  insecureMode!: boolean;

  /**
   * Gibt an, ob das Setup abgeschlossen ist.
   * True wenn mindestens 1 aktives Token existiert.
   */
  @ApiProperty({
    description: 'Setup abgeschlossen (mindestens 1 aktives Token)',
    example: true,
  })
  setupComplete!: boolean;

  /**
   * Anzahl aktiver Server-Access-Tokens.
   * Mindestens 1 aktives Token erforderlich fuer Migration.
   */
  @ApiProperty({
    description: 'Anzahl aktiver Server-Access-Tokens',
    example: 2,
  })
  activeTokenCount!: number;

  /**
   * Zeitpunkt der Migration zu SECURE Mode (ISO-8601).
   * Null wenn noch keine Migration stattgefunden hat.
   */
  @ApiProperty({
    description: 'Migrationszeitpunkt zu SECURE Mode (ISO-8601)',
    example: '2026-01-13T10:30:00.000Z',
    nullable: true,
  })
  migratedAt!: string | null;
}
