import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Request DTO zum Erstellen einer neuen Erinnerung (Quick-Create).
 *
 * Validiert die Eingabedaten für die Erinnerung-Erstellung.
 * Die eigentliche Business-Validierung erfolgt im CreateErinnerungCommand.
 *
 * **Story 1.1 AC2:**
 * - Titel eingeben
 * - Zeit-Preset wählen (Frontend berechnet faelligAm)
 * - Speichern mit Enter
 *
 * @example
 * ```json
 * {
 *   "titel": "Lagebesprechung",
 *   "faelligAm": "2026-01-19T15:30:00.000Z",
 *   "beschreibung": "Im ELW 1"
 * }
 * ```
 */
export class CreateErinnerungDto {
  /**
   * Titel der Erinnerung.
   * Erforderlich, maximal 100 Zeichen.
   *
   * @example "Lagebesprechung"
   */
  @ApiProperty({
    description: 'Titel der Erinnerung (erforderlich, max 100 Zeichen)',
    example: 'Lagebesprechung',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Titel ist erforderlich' })
  @IsString({ message: 'Titel muss ein String sein' })
  @MaxLength(100, { message: 'Titel darf maximal 100 Zeichen lang sein' })
  titel!: string;

  /**
   * Fälligkeitszeitpunkt der Erinnerung (ISO-8601 Format).
   * Muss in der Zukunft liegen.
   *
   * **Frontend Berechnung:**
   * ```typescript
   * const faelligAm = addMinutes(new Date(), selectedPreset);
   * // selectedPreset: 5, 10, 15, 30, 60 Minuten
   * ```
   *
   * @example "2026-01-19T15:30:00.000Z"
   */
  @ApiProperty({
    description: 'Fälligkeitszeitpunkt der Erinnerung (ISO-8601). Muss in der Zukunft liegen.',
    example: '2026-01-19T15:30:00.000Z',
  })
  @IsNotEmpty({ message: 'Fälligkeitszeitpunkt ist erforderlich' })
  @IsDateString({}, { message: 'faelligAm muss ein gültiges ISO-8601 Datum sein' })
  faelligAm!: string;

  /**
   * Optionale Beschreibung der Erinnerung.
   * Maximal 500 Zeichen.
   *
   * @example "Im ELW 1 mit Einsatzleitung"
   */
  @ApiProperty({
    description: 'Optionale Beschreibung (max 500 Zeichen)',
    example: 'Im ELW 1 mit Einsatzleitung',
    type: String,
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Beschreibung muss ein String sein' })
  @MaxLength(500, { message: 'Beschreibung darf maximal 500 Zeichen lang sein' })
  beschreibung?: string;

  /**
   * Story 2.6: Pflicht-Notiz bei Erledigung erforderlich.
   * Wenn true, muss bei Erledigung eine Notiz eingegeben werden.
   *
   * @default false
   * @example false
   */
  @ApiProperty({
    description: 'Pflicht-Notiz bei Erledigung erforderlich (Story 2.6)',
    example: false,
    required: false,
    default: false, // Sync mit Erinnerung.DEFAULT_REQUIRES_NOTE
  })
  @IsOptional()
  @IsBoolean({ message: 'requiresNote muss ein Boolean sein' })
  requiresNote?: boolean;

  /**
   * Optionale initiale Zuweisung an einen User (Story 3.3).
   * Wenn gesetzt, wird die Erinnerung direkt bei Erstellung zugewiesen.
   *
   * @example "clw3h8x9y0004abcdefghijkl"
   */
  @ApiProperty({
    description: 'Optionale initiale Zuweisung an User (Story 3.3)',
    example: 'clw3h8x9y0004abcdefghijkl',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'assignedToId muss ein String sein' })
  assignedToId?: string;

  /**
   * Optionale Eskalationsperson (Story 4.1).
   * Wenn gesetzt, ist diese Person für Eskalationen zuständig.
   *
   * @example "clw3h8x9y0005znopqrstuvw"
   */
  @ApiProperty({
    description: 'Optionale Eskalationsperson (Story 4.1)',
    example: 'clw3h8x9y0005znopqrstuvw',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'eskalationsPersonId muss ein String sein' })
  eskalationsPersonId?: string;

  /**
   * Story 4.10: Eskalation nur an Ersteller (Rückläufer).
   * Wenn true, werden Eskalationen immer an den Ersteller zurückgeleitet.
   *
   * @default false
   * @example false
   */
  @ApiProperty({
    description: 'Eskalation nur an Ersteller (Story 4.10)',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'eskalationNurAnErsteller muss ein Boolean sein' })
  eskalationNurAnErsteller?: boolean;

  /**
   * Story 5.4: Optionale Referenz zu einem ETB-Eintrag.
   * Wenn gesetzt, wird die Erinnerung mit dem ETB-Eintrag verknüpft.
   *
   * @example "clw3h8x9y0006abcdefghijkl"
   */
  @ApiProperty({
    description: 'Optionale ETB-Eintrag Referenz (Story 5.4)',
    example: 'clw3h8x9y0006abcdefghijkl',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'etbEntryId muss ein String sein' })
  etbEntryId?: string;

  /**
   * Story 6.4: Ob die Erinnerung wiederkehrend ist.
   *
   * @default false
   * @example false
   */
  @ApiPropertyOptional({
    description: 'Ob die Erinnerung wiederkehrend ist (Story 6.4)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  /**
   * Story 6.4: Intervall in Minuten für wiederkehrende Erinnerungen.
   * Wertebereich: 1-1440 (1 Minute bis 24 Stunden).
   *
   * @example 30
   */
  @ApiPropertyOptional({
    description: 'Intervall in Minuten für wiederkehrende Erinnerungen (1-1440)',
    example: 30,
    minimum: 1,
    maximum: 1440,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  recurringIntervalMinutes?: number;

  /**
   * Story 6.4: Endzeitpunkt der wiederkehrenden Serie.
   * ISO-8601 Format. Muss in der Zukunft liegen.
   *
   * @example "2026-02-03T12:00:00.000Z"
   */
  @ApiPropertyOptional({
    description: 'Endzeitpunkt der wiederkehrenden Serie (ISO-8601)',
    example: '2026-02-03T12:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  recurringEndDate?: string;

  /**
   * Story 6.4: Maximale Anzahl Wiederholungen.
   * Wertebereich: 1-100.
   *
   * @example 5
   */
  @ApiPropertyOptional({
    description: 'Maximale Anzahl Wiederholungen (1-100)',
    example: 5,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  recurringMaxCount?: number;
}
