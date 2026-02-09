import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Trigger rebuild
/**
 * Response DTO für Erinnerung API Responses.
 *
 * Wird verwendet für:
 * - POST /erinnerung (Create Response)
 * - GET /erinnerung/:id (Single Resource)
 * - GET /erinnerung (List Item)
 *
 * **Status Enum:**
 * - GEPLANT: Initial, wartet auf Fälligkeit
 * - AUSGELOEST: Alarm wurde ausgelöst
 * - ACKNOWLEDGED: User hat bestätigt
 * - SNOOZED: Temporär verschoben
 * - ESKALIERT: Zur Eskalation weitergeleitet
 * - ERLEDIGT: Abgeschlossen
 *
 * @example
 * ```json
 * {
 *   "id": "clw3h8x9y0000qwertyuiopas",
 *   "einsatzId": "clw3h8x9y0001abcdefghijkl",
 *   "titel": "Lagebesprechung",
 *   "beschreibung": "Im ELW 1",
 *   "faelligAm": "2026-01-19T15:30:00.000Z",
 *   "status": "GEPLANT",
 *   "erstelltVon": "clw3h8x9y0002mnopqrstuvwx",
 *   "createdAt": "2026-01-19T15:00:00.000Z",
 *   "updatedAt": "2026-01-19T15:00:00.000Z"
 * }
 * ```
 */
export class ErinnerungResponseDto {
  @ApiProperty({
    description: 'Eindeutige ID der Erinnerung (CUID2)',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  id!: string;

  @ApiProperty({
    description: 'ID des zugehörigen Einsatzes',
    example: 'clw3h8x9y0001abcdefghijkl',
  })
  einsatzId!: string;

  @ApiProperty({
    description: 'Titel der Erinnerung',
    example: 'Lagebesprechung',
  })
  titel!: string;

  @ApiProperty({
    description: 'Optionale Beschreibung',
    example: 'Im ELW 1 mit Einsatzleitung',
    nullable: true,
    type: String,
  })
  beschreibung!: string | null;

  @ApiProperty({
    description: 'Fälligkeitszeitpunkt (ISO-8601)',
    example: '2026-01-19T15:30:00.000Z',
  })
  faelligAm!: string;

  @ApiProperty({
    description: 'Aktueller Status der Erinnerung',
    example: 'GEPLANT',
    enum: ['GEPLANT', 'AUSGELOEST', 'ACKNOWLEDGED', 'SNOOZED', 'ESKALIERT', 'ERLEDIGT'],
  })
  status!: string;

  @ApiProperty({
    description: 'Zeitpunkt der letzten Auslösung/Intensivierung (Story 4.1 AC2)',
    example: '2026-01-19T15:30:00.000Z',
    nullable: true,
    required: false,
  })
  ausgeloestAm?: string | null;

  @ApiProperty({
    description: 'User-ID des Erstellers',
    example: 'clw3h8x9y0002mnopqrstuvwx',
  })
  erstelltVon!: string;

  @ApiProperty({
    description: 'Erstellungszeitpunkt (ISO-8601)',
    example: '2026-01-19T15:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Letztes Update (ISO-8601)',
    example: '2026-01-19T15:00:00.000Z',
  })
  updatedAt!: string;

  @ApiProperty({
    description: 'Anzahl der bisherigen Snooze-Vorgaenge (Story 2.2 AC2)',
    example: 0,
    minimum: 0,
  })
  snoozeCount!: number;

  @ApiProperty({
    description: 'Zeitpunkt der Erledigung (ISO-8601) (Story 2.5)',
    example: '2026-01-19T16:00:00.000Z',
    nullable: true,
    required: false,
  })
  erledigtAm?: string | null;

  @ApiProperty({
    description: 'User-ID der Person die erledigt hat (Story 2.5)',
    example: 'clw3h8x9y0003yzabcdefghij',
    nullable: true,
    required: false,
    type: String,
  })
  erledigtBy?: string | null;

  @ApiProperty({
    description: 'Optionale Notiz zur Erledigung (max 500 Zeichen) (Story 2.5)',
    example: 'Aufgabe erfolgreich abgeschlossen',
    nullable: true,
    required: false,
    maxLength: 500,
    type: String,
  })
  erledigungsNotiz?: string | null;

  @ApiProperty({
    description: 'Pflicht-Notiz bei Erledigung erforderlich (Story 2.6)',
    example: false,
  })
  requiresNote!: boolean;

  @ApiProperty({
    description: 'ID des zugewiesenen Users (Story 3.3/3.4)',
    example: 'clw3h8x9y0004abcdefghijkl',
    nullable: true,
    required: false,
    type: String,
  })
  assignedToId?: string | null;

  @ApiProperty({
    description: 'Name des zugewiesenen Users (Story 3.3/3.4)',
    example: 'Max Mustermann',
    nullable: true,
    required: false,
    type: String,
  })
  assignedToName?: string | null;

  @ApiProperty({
    description: 'Name des Erstellers (Story 3.1 AC3)',
    example: 'Max Mustermann',
    nullable: true,
    required: false,
    type: String,
  })
  erstellerName?: string | null;

  @ApiProperty({
    description: 'ID der Eskalationsperson (Story 4.1)',
    example: 'clw3h8x9y0005znopqrstuvw',
    nullable: true,
    required: false,
    type: String,
  })
  eskalationsPersonId?: string | null;

  @ApiProperty({
    description: 'Name der Eskalationsperson (Story 4.1)',
    example: 'Max Mustermann',
    nullable: true,
    required: false,
    type: String,
  })
  eskalationsPersonName?: string | null;

  @ApiProperty({
    description: 'Eskalation nur an Ersteller/Rückläufer aktiv (Story 4.10)',
    example: false,
    required: false,
  })
  eskalationNurAnErsteller?: boolean;

  @ApiProperty({
    description: 'Zeitpunkt der Eskalation (Story 4.5)',
    example: '2026-01-19T15:45:00.000Z',
    nullable: true,
    required: false,
  })
  escalatedAt?: string | null;

  @ApiProperty({
    description: 'ID des vorherigen Assignees (Story 4.5)',
    example: 'clw3h8x9y0004abcdefghijkl',
    nullable: true,
    required: false,
    type: String,
  })
  previousAssigneeId?: string | null;

  @ApiProperty({
    description: 'Name des vorherigen Assignees (Story 4.5)',
    example: 'Max Mustermann',
    nullable: true,
    required: false,
    type: String,
  })
  previousAssigneeName?: string | null;

  @ApiProperty({
    description: 'Referenz zu verknüpftem ETB-Eintrag (Story 5.4)',
    example: 'clw3h8x9y0006abcdefghijkl',
    nullable: true,
    required: false,
    type: String,
  })
  etbEntryId?: string | null;

  @ApiPropertyOptional({
    description: 'Referenz zur Quell-Notiz (Story 7.6 - Konvertierung)',
    example: 'clw3h8x9y0007abcdefghijkl',
    nullable: true,
    type: String,
  })
  notizId?: string | null;

  /**
   * Story 6.4: Ob die Erinnerung wiederkehrend ist.
   * @example false
   */
  @ApiProperty({
    description: 'Ob die Erinnerung wiederkehrend ist',
    example: false,
  })
  isRecurring!: boolean;

  /**
   * Story 6.4: Intervall in Minuten für wiederkehrende Erinnerungen.
   * Null wenn nicht wiederkehrend.
   * @example 30
   */
  @ApiPropertyOptional({
    description: 'Intervall in Minuten für wiederkehrende Erinnerungen',
    example: 30,
    nullable: true,
  })
  recurringIntervalMinutes!: number | null;

  /**
   * Story 6.4: Endzeitpunkt der wiederkehrenden Serie (ISO-8601).
   * Null wenn nicht wiederkehrend oder kein Endzeitpunkt gesetzt.
   * @example "2026-02-03T12:00:00.000Z"
   */
  @ApiPropertyOptional({
    description: 'Endzeitpunkt der wiederkehrenden Serie (ISO-8601)',
    example: '2026-02-03T12:00:00.000Z',
    nullable: true,
  })
  recurringEndDate!: string | null;

  /**
   * Story 6.4: Maximale Anzahl Wiederholungen.
   * Null wenn nicht wiederkehrend oder unbegrenzt.
   * @example 5
   */
  @ApiPropertyOptional({
    description: 'Maximale Anzahl Wiederholungen',
    example: 5,
    nullable: true,
  })
  recurringMaxCount!: number | null;

  /**
   * Story 6.4: Aktuelle Anzahl erstellter Instanzen der wiederkehrenden Serie.
   * @example 0
   */
  @ApiProperty({
    description: 'Aktuelle Anzahl erstellter Instanzen',
    example: 0,
  })
  recurringCurrentCount!: number;

  /**
   * Story 6.4: ID der Parent-Erinnerung (bei Kind-Instanzen einer wiederkehrenden Serie).
   * Null wenn keine Kind-Instanz.
   * @example null
   */
  @ApiPropertyOptional({
    description: 'ID der Parent-Erinnerung (bei Kind-Instanzen)',
    example: null,
    nullable: true,
  })
  parentErinnerungId!: string | null;

  /**
   * Story 6.4: Sequenznummer in der wiederkehrenden Serie.
   * Null wenn keine Kind-Instanz.
   * @example null
   */
  @ApiPropertyOptional({
    description: 'Sequenznummer in der wiederkehrenden Serie',
    example: null,
    nullable: true,
  })
  recurringSequenceNumber!: number | null;

  /**
   * Story 8.2: Kategorie-ID der Erinnerung.
   * @example "clw3h8x9y0008kategorie123"
   */
  @ApiPropertyOptional({ description: 'Kategorie-ID', nullable: true })
  kategorieId?: string | null;

  /**
   * Story 8.2: Kategorie-Name fuer die Anzeige.
   * @example "Dringend"
   */
  @ApiPropertyOptional({ description: 'Kategorie-Name für Anzeige', nullable: true })
  kategorieName?: string | null;

  /**
   * Story 8.2: Kategorie-Farbe (Hex-Code).
   * @example "#FF5733"
   */
  @ApiPropertyOptional({ description: 'Kategorie-Farbe (Hex-Code)', nullable: true })
  kategorieFarbe?: string | null;
}
