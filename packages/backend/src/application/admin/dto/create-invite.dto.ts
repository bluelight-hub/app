import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Request DTO zum Erstellen eines neuen Invite-Codes.
 *
 * Validiert die Eingabedaten für die Invite-Code Erstellung.
 * Die eigentliche Business-Validierung (z.B. expiresAt in Zukunft)
 * erfolgt im CreateInviteCommand.
 *
 * **Felder:**
 * - expiresAt: Ablaufdatum als ISO-8601 String (Pflicht)
 * - maxUses: Maximale Anzahl Einlösungen, 1-100 (Optional, default: 1)
 * - label: Optionale Beschreibung, max 100 Zeichen
 *
 * @example
 * ```json
 * {
 *   "expiresAt": "2026-02-01T12:00:00.000Z",
 *   "maxUses": 5,
 *   "label": "Team Süd Onboarding"
 * }
 * ```
 */
export class CreateInviteDto {
  /**
   * Ablaufdatum des Invite-Codes.
   * Muss in der Zukunft liegen (validiert im Command).
   */
  @ApiProperty({
    description: 'Ablaufdatum des Invite-Codes (ISO-8601 Format)',
    example: '2026-02-01T12:00:00.000Z',
  })
  @IsDateString({}, { message: 'expiresAt muss ein gültiges ISO-8601 Datum sein' })
  expiresAt!: string;

  /**
   * Maximale Anzahl Einlösungen des Codes.
   * Optional, default: 1, Bereich: 1-100.
   */
  @ApiProperty({
    description: 'Maximale Anzahl Einlösungen (1-100, default: 1)',
    example: 5,
    required: false,
    default: 1,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt({ message: 'maxUses muss eine Ganzzahl sein' })
  @Min(1, { message: 'maxUses muss mindestens 1 sein' })
  @Max(100, { message: 'maxUses darf maximal 100 sein' })
  maxUses?: number;

  /**
   * Optionales Label zur Identifizierung des Codes.
   * Max 100 Zeichen.
   */
  @ApiProperty({
    description: 'Optionales Label zur Identifizierung (max 100 Zeichen)',
    example: 'Team Süd Onboarding',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'label muss ein String sein' })
  @MaxLength(100, { message: 'label darf maximal 100 Zeichen lang sein' })
  label?: string;
}
