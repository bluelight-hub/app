import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO fuer User-Informationen in der Timeline.
 *
 * Enthaelt nur die fuer die Timeline-Anzeige relevanten User-Daten.
 * Wird verwendet fuer createdBy-Aufloesung in Timeline-Events.
 */
export class TimelineUserDto {
  @ApiProperty({
    description: 'Eindeutige User-ID (CUID)',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  id!: string;

  @ApiProperty({
    description: 'Benutzername (Login-Name)',
    example: 'max.mustermann',
  })
  username!: string;

  @ApiPropertyOptional({
    description: 'Anzeigename des Users (falls gesetzt)',
    example: 'Max Mustermann',
    nullable: true,
    type: 'string',
  })
  displayName?: string | null;
}

/**
 * DTO fuer ein einzelnes Event in der Erinnerungs-Timeline.
 *
 * Repraesentiert einen ETB-Eintrag, der zu einer Erinnerung gehoert.
 * Die Eintraege werden aus der EtbEintrag-Tabelle geladen und nach
 * metadata.erinnerungId gefiltert.
 *
 * **Event-Typen (aus metadata.eventType):**
 * - ErinnerungErstellt: Erinnerung wurde angelegt
 * - ErinnerungAktualisiert: Erinnerung wurde bearbeitet
 * - ErinnerungAusgeloest: Erinnerung ist faellig geworden
 * - ErinnerungAcknowledged: Erinnerung wurde bestaetigt
 * - ErinnerungSnoozed: Erinnerung wurde verzoegert
 * - ErinnerungRetriggered: Erinnerung wurde erneut ausgeloest
 * - ErinnerungErledigt: Erinnerung wurde abgeschlossen
 * - ErinnerungGeloescht: Erinnerung wurde geloescht
 * - ErinnerungAssigned: Erinnerung wurde zugewiesen
 * - ErinnerungEskaliert: Erinnerung wurde eskaliert
 * - ErinnerungIntensiviert: Erinnerungsbenachrichtigung wurde intensiviert
 */
export class ErinnerungTimelineEventDto {
  @ApiProperty({
    description: 'Eindeutige ETB-Eintrag-ID (CUID)',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  id!: string;

  @ApiProperty({
    description: 'Typ des Events (aus metadata.eventType)',
    example: 'ErinnerungErstellt',
  })
  eventType!: string;

  @ApiProperty({
    description: 'Zeitstempel des Events (createdAt des ETB-Eintrags)',
    example: '2024-01-15T12:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  timestamp!: Date;

  @ApiProperty({
    description: 'Sequenznummer des ETB-Eintrags',
    example: 42,
    minimum: 1,
  })
  sequenceNumber!: number;

  @ApiProperty({
    description: 'User der das Event ausgeloest hat',
    type: TimelineUserDto,
  })
  createdBy!: TimelineUserDto;

  @ApiProperty({
    description: 'Text des ETB-Eintrags (Beschreibung der Aktion)',
    example: "Erinnerung 'Follow-up Leitstelle' erstellt, fällig um 15.01.2024, 14:00",
  })
  text!: string;

  @ApiPropertyOptional({
    description: 'Zusaetzliche Metadaten des Events (eventspezifisch)',
    example: {
      eventType: 'ErinnerungErstellt',
      erinnerungId: 'clw3h8x9y0000qwertyuiopas',
      faelligAm: '2024-01-15T14:00:00.000Z',
    },
    nullable: true,
  })
  metadata?: Record<string, unknown>;
}

/**
 * DTO fuer die Erinnerungs-Timeline Response.
 *
 * Enthaelt alle ETB-Eintraege, die zu einer Erinnerung gehoeren,
 * chronologisch sortiert (aelteste zuerst).
 *
 * **Story 5.5: ETB zeigt Erinnerungsverlauf (Timeline Widget)**
 *
 * **Use Cases:**
 * - Timeline-Widget in der Erinnerungsansicht
 * - Audit-Trail fuer Erinnerungsaktionen
 * - Nachvollziehbarkeit des Erinnerungslebenszyklus
 */
export class ErinnerungTimelineDto {
  @ApiProperty({
    description: 'ID der Erinnerung',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  erinnerungId!: string;

  @ApiProperty({
    description: 'Titel der Erinnerung',
    example: 'Follow-up Leitstelle',
  })
  titel!: string;

  @ApiProperty({
    description: 'Chronologisch sortierte Liste der Timeline-Events (aelteste zuerst)',
    type: [ErinnerungTimelineEventDto],
  })
  events!: ErinnerungTimelineEventDto[];

  @ApiProperty({
    description: 'Gesamtanzahl der Events in der Timeline',
    example: 5,
    minimum: 0,
  })
  totalCount!: number;
}
