import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO nach erfolgreicher Invite-Code Erstellung.
 *
 * Enthält alle Daten des erstellten Invite-Codes inklusive
 * des Klartext-Codes und der Einladungs-Links. Der Klartext-Code
 * wird NUR in dieser Response zurückgegeben und kann später
 * NICHT erneut abgerufen werden.
 *
 * **Wichtig:** Der `code` ist NUR hier sichtbar! Er wird in
 * der Datenbank im Klartext gespeichert, aber aus Sicherheitsgründen
 * in späteren Abfragen nur maskiert (ABC1****) zurückgegeben.
 *
 * **Links:**
 * - `deepLink`: Für Tauri Desktop App (bluelight://connect?...)
 * - `webLink`: Für Browser-basierte Registrierung
 *
 * @example
 * ```json
 * {
 *   "id": "cm123...",
 *   "code": "ABC12345",
 *   "expiresAt": "2026-02-01T12:00:00.000Z",
 *   "maxUses": 5,
 *   "useCount": 0,
 *   "label": "Team Süd Onboarding",
 *   "createdAt": "2026-01-07T10:30:00.000Z",
 *   "deepLink": "bluelight://connect?url=...",
 *   "webLink": "https://app.example.de?server=..."
 * }
 * ```
 */
export class CreateInviteResponseDto {
  /**
   * Eindeutige ID des Invite-Codes (CUID).
   */
  @ApiProperty({
    description: 'Eindeutige ID des Invite-Codes',
    example: 'cm4abc123def456',
  })
  id!: string;

  /**
   * Der 8-stellige Invite-Code im Klartext.
   * WICHTIG: Wird NUR hier zurückgegeben, nicht erneut abrufbar!
   */
  @ApiProperty({
    description: 'Der 8-stellige Invite-Code (NUR hier sichtbar!)',
    example: 'ABC12345',
  })
  code!: string;

  /**
   * Ablaufdatum des Invite-Codes (ISO-8601).
   */
  @ApiProperty({
    description: 'Ablaufdatum des Invite-Codes',
    example: '2026-02-01T12:00:00.000Z',
  })
  expiresAt!: string;

  /**
   * Maximale Anzahl Einlösungen.
   */
  @ApiProperty({
    description: 'Maximale Anzahl Einlösungen',
    example: 5,
  })
  maxUses!: number;

  /**
   * Aktuelle Anzahl der Einlösungen.
   * Bei Erstellung immer 0.
   */
  @ApiProperty({
    description: 'Aktuelle Anzahl der Einlösungen',
    example: 0,
  })
  useCount!: number;

  /**
   * Optionales Label zur Identifizierung.
   */
  @ApiProperty({
    description: 'Optionales Label',
    example: 'Team Süd Onboarding',
    required: false,
  })
  label?: string;

  /**
   * Erstellungszeitpunkt (ISO-8601).
   */
  @ApiProperty({
    description: 'Erstellungszeitpunkt',
    example: '2026-01-07T10:30:00.000Z',
  })
  createdAt!: string;

  /**
   * Deep Link für Tauri Desktop App.
   * Format: bluelight://connect?url=<server>&invite=<code>&expires=<iso>
   *
   * Der Link kann direkt an Nutzer gesendet werden.
   * Bei Klick öffnet sich die Desktop App mit den vorausgefüllten Daten.
   */
  @ApiProperty({
    description: 'Deep Link für Tauri Desktop App',
    example: 'bluelight://connect?url=https%3A%2F%2Fapi.example.de&invite=ABC12345&expires=2026-02-01T12%3A00%3A00.000Z',
  })
  deepLink!: string;

  /**
   * Web Link für Browser-basierte Registrierung.
   * Format: <frontend>?server=<server>&invite=<code>
   *
   * Für Nutzer die noch keine Desktop App installiert haben.
   */
  @ApiProperty({
    description: 'Web Link für Browser',
    example: 'https://app.example.de?server=https%3A%2F%2Fapi.example.de&invite=ABC12345',
  })
  webLink!: string;
}
