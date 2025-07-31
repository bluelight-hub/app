import { ApiResponse } from '@/common/interfaces/api-response.interface';
import { PaginationMeta } from '@/common/interfaces/paginated-response.interface';
import { ApiProperty } from '@nestjs/swagger';
import { EtbEntryStatus } from '@prisma/generated/prisma/enums';
import { EtbKategorie } from './etb-kategorie.enum';

/**
 * Data Transfer Object für ETB-Anlagen
 *
 * Repräsentiert eine Dateianlage zu einem Einsatztagebuch-Eintrag
 * @class EtbAttachment
 */
export class EtbAttachment {
  /**
   * Eindeutige ID der Anlage
   * @example '123e4567-e89b-12d3-a456-426614174000'
   */
  @ApiProperty({ description: 'ID der Anlage', type: 'string', format: 'uuid' })
  id: string;

  /**
   * ID des zugehörigen ETB-Eintrags
   * @example '456e7890-e89b-12d3-a456-426614174000'
   */
  @ApiProperty({ description: 'ID des ETB-Eintrags', type: 'string', format: 'uuid' })
  etbEntryId: string;

  /**
   * Name der angehängten Datei
   * @example 'einsatzplan_2024.pdf'
   */
  @ApiProperty({ description: 'Dateiname der Anlage', type: 'string' })
  dateiname: string;

  /**
   * MIME-Type der Datei
   * @example 'application/pdf'
   */
  @ApiProperty({ description: 'Dateityp der Anlage', type: 'string' })
  dateityp: string;

  /**
   * Pfad oder URL zum Speicherort der Datei
   * @example '/uploads/etb/2024/01/einsatzplan_2024.pdf'
   */
  @ApiProperty({ description: 'Speicherort der Anlage', type: 'string' })
  speicherOrt: string;

  /**
   * Optionale Beschreibung der Anlage
   * @example 'Detaillierter Einsatzplan mit Anfahrtswegen'
   */
  @ApiProperty({ description: 'Beschreibung der Anlage', type: 'string', nullable: true })
  beschreibung?: string;
}

/**
 * Data Transfer Object für Einsatztagebuch-Einträge.
 * Enthält alle Felder eines Einsatztagebuch-Eintrags für die API-Kommunikation.
 * Wird verwendet, um ETB-Einträge aus der Datenbank in einem API-freundlichen Format zu übertragen.
 * Enthält Metadaten, Inhalte und Beziehungsinformationen des Eintrags.
 */
export class EtbEntryDto {
  /**
   * Eindeutige Identifikation des ETB-Eintrags in Form einer UUID
   */
  @ApiProperty({
    description: 'ID des ETB-Eintrags',
    type: 'string',
    format: 'uuid',
  })
  id: string;

  /**
   * Fortlaufende Nummer des ETB-Eintrags für einfache Referenzierung durch Benutzer
   */
  @ApiProperty({
    description: 'Fortlaufende Nummer des ETB-Eintrags',
    type: 'number',
  })
  laufendeNummer: number;

  /**
   * Zeitpunkt, zu dem der ETB-Eintrag erstellt wurde
   */
  @ApiProperty({
    description: 'Zeitpunkt der Erstellung',
    type: 'string',
    format: 'date-time',
  })
  timestampErstellung: Date;

  /**
   * Zeitpunkt, zu dem das dokumentierte Ereignis stattgefunden hat
   */
  @ApiProperty({
    description: 'Zeitpunkt des Ereignisses',
    type: 'string',
    format: 'date-time',
  })
  timestampEreignis: Date;

  /**
   * Eindeutige ID des Autors, der den Eintrag erstellt hat
   */
  @ApiProperty({
    description: 'ID des Autors',
    type: 'string',
  })
  autorId: string;

  /**
   * Name des Autors für die Anzeige
   */
  @ApiProperty({
    description: 'Name des Autors',
    type: 'string',
    nullable: true,
  })
  autorName: string;

  /**
   * Rolle oder Position des Autors in der Organisation
   */
  @ApiProperty({
    description: 'Rolle des Autors',
    type: 'string',
    nullable: true,
  })
  autorRolle: string;

  /**
   * Kategorie des Eintrags zur Klassifizierung
   */
  @ApiProperty({
    description: 'Kategorie des Eintrags',
    enum: EtbKategorie,
    enumName: 'EtbKategorie',
  })
  kategorie: EtbKategorie;

  /**
   * Inhalt des Eintrags
   */
  @ApiProperty({
    description: 'Inhalt des Eintrags',
    type: 'string',
  })
  inhalt: string;

  /**
   * Referenz zur zugehörigen Einsatz-ID, falls der Eintrag einem bestimmten Einsatz zugeordnet ist
   */
  @ApiProperty({
    description: 'Referenz zur Einsatz-ID',
    type: 'string',
    nullable: true,
  })
  referenzEinsatzId: string;

  /**
   * Referenz zur zugehörigen Patienten-ID, falls der Eintrag einem bestimmten Patienten zugeordnet ist
   */
  @ApiProperty({
    description: 'Referenz zur Patienten-ID',
    type: 'string',
    nullable: true,
  })
  referenzPatientId: string;

  /**
   * Referenz zum zugehörigen Einsatzmittel, falls der Eintrag einem bestimmten Einsatzmittel zugeordnet ist
   */
  @ApiProperty({
    description: 'Referenz zur Einsatzmittel-ID',
    type: 'string',
    nullable: true,
  })
  referenzEinsatzmittelId: string;

  /**
   * Quelle des Eintrags, falls automatisch generiert (z.B. "EinsatzSystem", "PatientenMonitoring")
   */
  @ApiProperty({
    description: 'Quelle des Eintrags',
    type: 'string',
    nullable: true,
  })
  systemQuelle: string;

  /**
   * Versionsnummer des Eintrags, erhöht sich bei jeder Aktualisierung
   */
  @ApiProperty({
    description: 'Version des Eintrags',
    type: 'number',
  })
  version: number;

  /**
   * Flag, das angibt, ob der Eintrag abgeschlossen ist und nicht mehr bearbeitet werden kann
   */
  @ApiProperty({
    description: 'Gibt an, ob der Eintrag abgeschlossen ist',
    type: 'boolean',
  })
  istAbgeschlossen: boolean;

  /**
   * Zeitpunkt, zu dem der Eintrag abgeschlossen wurde
   */
  @ApiProperty({
    description: 'Zeitpunkt des Abschlusses',
    type: 'string',
    format: 'date-time',
    nullable: true,
  })
  timestampAbschluss: Date;

  /**
   * ID der Person, die den Eintrag abgeschlossen hat
   */
  @ApiProperty({
    description: 'ID der Person, die den Eintrag abgeschlossen hat',
    type: 'string',
    nullable: true,
  })
  abgeschlossenVon: string;

  /**
   * Status des Eintrags (aktiv oder überschrieben)
   */
  @ApiProperty({
    description: 'Status des Eintrags',
    type: 'string',
    nullable: true,
    enum: EtbEntryStatus,
    example: EtbEntryStatus.AKTIV,
  })
  status: EtbEntryStatus;

  /**
   * Liste der Anlagen, die diesem ETB-Eintrag zugeordnet sind
   */
  @ApiProperty({ type: [EtbAttachment], description: 'Anlagen zum ETB-Eintrag', required: false })
  anlagen?: EtbAttachment[];

  /**
   * Absender des Eintrags (OPTA-Nummer)
   */
  @ApiProperty({
    description: 'Absender des Eintrags (OPTA-Nummer)',
    type: 'string',
    nullable: true,
  })
  sender: string;

  /**
   * Empfänger des Eintrags (OPTA-Nummer)
   */
  @ApiProperty({
    description: 'Empfänger des Eintrags (OPTA-Nummer)',
    type: 'string',
    example: 'OPTA-123456',
  })
  receiver: string;
}

/**
 * DTO für die Antwort eines einzelnen ETB-Eintrags
 */
export class EtbEntryResponse extends ApiResponse<EtbEntryDto> {
  /**
   * Der ETB-Eintrag
   */
  @ApiProperty({
    description: 'ETB-Eintrag',
    type: EtbEntryDto,
  })
  data: EtbEntryDto;
}

/**
 * Data Transfer Object für eine Menge von ETB-Einträgen mit Paginierungsinformationen.
 * Enthält sowohl die Daten der ETB-Einträge als auch die Gesamtzahl für Paginierungszwecke.
 * Wird verwendet für API-Endpunkte, die mehrere ETB-Einträge zurückgeben.
 */
export class EtbEntriesData {
  /**
   * Liste von ETB-Einträgen
   */
  @ApiProperty({
    description: 'ETB-Einträge',
    type: EtbEntryDto,
    isArray: true,
  })
  items: EtbEntryDto[];

  /**
   * Gesamtzahl der verfügbaren ETB-Einträge (für Paginierung)
   */
  @ApiProperty({
    description: 'Gesamtzahl der ETB-Einträge',
    type: 'number',
    example: 42,
  })
  total: number;
}

/**
 * DTO für die Antwort einer Liste von ETB-Einträgen
 */
export class EtbEntriesResponse {
  /**
   * Liste von ETB-Einträgen
   */
  @ApiProperty({
    description: 'Liste von ETB-Einträgen',
    type: EtbEntryDto,
    isArray: true,
  })
  items: EtbEntryDto[];

  /**
   * Metainformationen zur Paginierung
   */
  @ApiProperty({
    type: PaginationMeta,
    description: 'Metainformationen zur Paginierung',
  })
  pagination: PaginationMeta;
}

/**
 * DTO für die Antwort einer ETB-Anlage
 */
export class EtbAttachmentResponse extends ApiResponse<EtbAttachment> {
  /**
   * Die ETB-Anlage
   */
  @ApiProperty({
    description: 'ETB-Anlage',
    type: EtbAttachment,
  })
  data: EtbAttachment;
}

/**
 * DTO für die Antwort einer Liste von ETB-Anlagen
 */
export class EtbAttachmentsResponse extends ApiResponse<EtbAttachment[]> {
  /**
   * Liste von ETB-Anlagen
   */
  @ApiProperty({
    description: 'Liste von ETB-Anlagen',
    type: EtbAttachment,
    isArray: true,
  })
  data: EtbAttachment[];
}
