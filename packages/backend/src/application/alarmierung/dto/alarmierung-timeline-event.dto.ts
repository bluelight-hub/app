import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Diskriminator-Werte für ein einzelnes Timeline-Event einer Alarmierung.
 *
 * - `alarmierung_ausgeloest` — Alarmierung wurde ausgelöst (eine pro Alarmierung)
 * - `empfaenger_alarmiert`   — Empfänger wurde initial alarmiert
 * - `empfaenger_ausgerueckt` — Empfänger ist ausgerückt (FMS 3 oder manuell)
 * - `empfaenger_vor_ort`     — Empfänger am Einsatzort (FMS 4 oder manuell)
 * - `empfaenger_wieder_frei` — Empfänger ist wieder einsatzbereit (FMS 1/2 oder manuell)
 * - `etb_eintrag`            — Aus dem ETB stammender Eintrag der Kategorie ALARMIERUNG
 */
export const ALARMIERUNG_TIMELINE_EVENT_TYPES = ['alarmierung_ausgeloest', 'empfaenger_alarmiert', 'empfaenger_ausgerueckt', 'empfaenger_vor_ort', 'empfaenger_wieder_frei', 'etb_eintrag'] as const;

export type AlarmierungTimelineEventType = (typeof ALARMIERUNG_TIMELINE_EVENT_TYPES)[number];

/**
 * Datenanteil eines Timeline-Eintrags. Welche Felder belegt sind, hängt vom
 * `type` ab (siehe {@link AlarmierungTimelineEventType}).
 *
 * Für ETB-Einträge enthält `data` den ETB-Text (`text`) sowie Absender/Empfänger.
 * Für Empfänger-bezogene Events sind Empfänger-Daten gesetzt.
 */
export class AlarmierungTimelineEventDataDto {
  @ApiPropertyOptional({ description: 'Alarmierungs-ID, sofern relevant.', nullable: true })
  alarmierungId?: string | null;

  @ApiPropertyOptional({ description: 'Bezeichnung der Alarmierung (bei type=alarmierung_ausgeloest).', nullable: true })
  bezeichnung?: string | null;

  @ApiPropertyOptional({ description: 'Empfänger-ID, sofern relevant.', nullable: true })
  empfaengerId?: string | null;

  @ApiPropertyOptional({ description: 'Name-Snapshot des Empfängers, sofern relevant.', nullable: true })
  nameSnapshot?: string | null;

  @ApiPropertyOptional({ description: 'ETB-Eintrag-ID, sofern type=etb_eintrag.', nullable: true })
  eintragId?: string | null;

  @ApiPropertyOptional({ description: 'ETB-Text, sofern type=etb_eintrag.', nullable: true })
  text?: string | null;

  @ApiPropertyOptional({ description: 'Absender, sofern in ETB-Eintrag vorhanden.', nullable: true })
  absender?: string | null;
}

/**
 * Generischer Timeline-Eintrag der Alarmierungs-Timeline.
 *
 * Diskriminierung über `type`; `data` trägt die typ-spezifischen Felder.
 * Sortiert chronologisch nach `occurredAt` ASC.
 */
export class AlarmierungTimelineEventDto {
  @ApiProperty({ enum: ALARMIERUNG_TIMELINE_EVENT_TYPES, example: 'empfaenger_vor_ort' })
  type!: AlarmierungTimelineEventType;

  @ApiProperty({ type: 'string', format: 'date-time', description: 'Zeitpunkt des Ereignisses' })
  occurredAt!: Date;

  @ApiProperty({ type: () => AlarmierungTimelineEventDataDto, description: 'Typabhängige Detail-Daten' })
  data!: AlarmierungTimelineEventDataDto;
}
