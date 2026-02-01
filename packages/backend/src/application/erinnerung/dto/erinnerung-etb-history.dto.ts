import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO für User-Informationen in der ETB-History.
 *
 * Enthält nur die für die Anzeige relevanten User-Daten.
 * Wird verwendet für createdBy-Auflösung in ETB-Einträgen.
 */
export class EtbHistoryUserDto {
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
}

/**
 * DTO für einen einzelnen ETB-Eintrag in der Erinnerungs-History.
 *
 * Repräsentiert einen ETB-Eintrag, der zu einer Erinnerung gehört.
 * Die Einträge werden aus der EtbEintrag-Tabelle geladen und nach
 * metadata.erinnerungId gefiltert.
 *
 * **Event-Typen (aus metadata.eventType):**
 * - ErinnerungErstellt: Erinnerung wurde angelegt
 * - ErinnerungAktualisiert: Erinnerung wurde bearbeitet
 * - ErinnerungAusgeloest: Erinnerung ist fällig geworden
 * - ErinnerungAcknowledged: Erinnerung wurde bestätigt
 * - ErinnerungSnoozed: Erinnerung wurde verzögert
 * - ErinnerungRetriggered: Erinnerung wurde erneut ausgelöst
 * - ErinnerungErledigt: Erinnerung wurde abgeschlossen
 * - ErinnerungGeloescht: Erinnerung wurde gelöscht
 * - ErinnerungAssigned: Erinnerung wurde zugewiesen
 * - ErinnerungEskaliert: Erinnerung wurde eskaliert
 * - ErinnerungIntensiviert: Erinnerungsbenachrichtigung wurde intensiviert
 */
export class EtbEntryPreviewDto {
  @ApiProperty({
    description: 'Eindeutige ETB-Eintrag-ID (CUID)',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  id!: string;

  @ApiProperty({
    description: 'Sequenznummer des ETB-Eintrags',
    example: 42,
    minimum: 1,
  })
  sequenceNumber!: number;

  @ApiProperty({
    description: 'Text des ETB-Eintrags (Beschreibung der Aktion)',
    example: "Erinnerung 'Follow-up Leitstelle' erstellt, fällig um 15.01.2024, 14:00",
  })
  text!: string;

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
    description: 'User der das Event ausgelöst hat',
    type: EtbHistoryUserDto,
  })
  createdBy!: EtbHistoryUserDto;
}

/**
 * DTO für die Erinnerungs-ETB-History Response.
 *
 * Enthält alle ETB-Einträge, die zu einer Erinnerung gehören,
 * chronologisch sortiert (älteste zuerst).
 *
 * **Story 5.7: Bidirektionale Verknüpfung - Erinnerung zu ETB-Einträgen Query**
 *
 * **Use Cases:**
 * - Erinnerungs-Detail-Ansicht mit ETB-Historie
 * - Audit-Trail für Erinnerungsaktionen
 * - Nachvollziehbarkeit des Erinnerungslebenszyklus
 */
export class ErinnerungEtbHistoryDto {
  @ApiProperty({
    description: 'Chronologisch sortierte Liste der ETB-Einträge (älteste zuerst)',
    type: [EtbEntryPreviewDto],
  })
  entries!: EtbEntryPreviewDto[];

  @ApiProperty({
    description: 'Gesamtanzahl der ETB-Einträge in der History',
    example: 5,
    minimum: 0,
  })
  totalCount!: number;
}
