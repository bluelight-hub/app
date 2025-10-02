import { ApiPagination, ApiResponse } from '@/common/interfaces/api-response.interface';
import { ApiProperty } from '@nestjs/swagger';
import { EtbKategorie, EtbStatus } from '@prisma/client';

/**
 * DTO für einen ETB-Textbaustein
 */
export class TextbausteinDto {
  @ApiProperty({
    description: 'Eindeutige ID des Textbausteins',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Kategorie des Textbausteins',
    enum: EtbKategorie,
    example: EtbKategorie.LAGE,
  })
  kategorie!: EtbKategorie;

  @ApiProperty({
    description: 'Kurzbeschreibung des Textbausteins',
    example: 'Brand unter Kontrolle',
  })
  kurztext!: string;

  @ApiProperty({
    description: 'Vollständiger Text des Bausteins',
    example: 'Brand ist unter Kontrolle, keine Gefahr für Nachbargebäude',
  })
  volltext!: string;

  @ApiProperty({
    description: 'Aktiv-Status des Textbausteins',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Sortierreihenfolge',
    example: 0,
  })
  sortOrder!: number;

  @ApiProperty({
    description: 'Anzahl der Verwendungen',
    example: 42,
  })
  verwendungen!: number;

  @ApiProperty({
    description: 'Datum der letzten Nutzung',
    example: '2024-01-01T12:00:00.000Z',
    required: false,
  })
  letztGenutzt?: Date | null;
}

/**
 * DTO für einen ETB-Eintrag
 */
export class EtbEintragDto {
  @ApiProperty({
    description: 'Eindeutige ID des Eintrags',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'ID des ETB',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  etbId!: string;

  @ApiProperty({
    description: 'Zeitstempel des Eintrags',
    example: '2024-01-01T12:00:00.000Z',
  })
  timestamp!: Date;

  @ApiProperty({
    description: 'Fortlaufende Nummer des Eintrags',
    example: 1,
  })
  sequenceNumber!: number;

  @ApiProperty({
    description: 'Kategorie des Eintrags',
    enum: EtbKategorie,
    example: EtbKategorie.LAGE,
  })
  kategorie!: EtbKategorie;

  @ApiProperty({
    description: 'Text des Eintrags',
    example: 'Erste Erkundung abgeschlossen',
  })
  text!: string;

  @ApiProperty({
    description: 'Version des Eintrags',
    example: 1,
  })
  version!: number;

  @ApiProperty({
    description: 'Optionaler Funkrufname',
    example: 'Florian Hamburg 1',
    required: false,
    nullable: true,
  })
  funkrufname?: string | null;

  @ApiProperty({
    description: 'Optionaler Standort',
    example: 'Einsatzstelle',
    required: false,
    nullable: true,
  })
  standort?: string | null;

  @ApiProperty({
    description: 'Automatisch generierter Eintrag',
    example: false,
  })
  isAutomatic!: boolean;

  @ApiProperty({
    description: 'Zusätzliche strukturierte Daten',
    required: false,
    nullable: true,
  })
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'ID des Erstellers',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  createdBy!: string;

  @ApiProperty({
    description: 'Erstellungsdatum',
    example: '2024-01-01T12:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'ID des letzten Bearbeiters',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
    nullable: true,
    type: 'string',
  })
  updatedBy?: string | null;

  @ApiProperty({
    description: 'Datum der letzten Aktualisierung',
    example: '2024-01-01T12:00:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Löschzeitpunkt (Soft Delete)',
    example: '2024-01-01T12:00:00.000Z',
    required: false,
    nullable: true,
  })
  deletedAt?: Date | null;

  @ApiProperty({
    description: 'ID des Löschenden',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
    nullable: true,
  })
  deletedBy?: string | null;

  @ApiProperty({
    description: 'Username des Löschenden',
    example: 'max.mustermann',
    required: false,
  })
  deleterUsername?: string;
}

/**
 * DTO für ein ETB (Einsatztagebuch)
 */
export class EtbDto {
  @ApiProperty({
    description: 'Eindeutige ID des ETB',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'ID des zugehörigen Einsatzes',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  einsatzId!: string;

  @ApiProperty({
    description: 'Status des ETB',
    enum: EtbStatus,
    example: EtbStatus.DRAFT,
  })
  status!: EtbStatus;

  @ApiProperty({
    description: 'ID des Erstellers',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  createdBy!: string;

  @ApiProperty({
    description: 'Erstellungsdatum',
    example: '2024-01-01T12:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Datum der letzten Aktualisierung',
    example: '2024-01-01T12:00:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Einträge des ETB',
    type: () => EtbEintragDto,
    isArray: true,
    required: false,
  })
  eintraege?: EtbEintragDto[];
}

/**
 * Response-DTO für die Erstellung eines ETB
 */
export class CreateEtbResponse extends ApiResponse<EtbDto> {
  @ApiProperty({
    description: 'Erstelltes ETB',
    type: EtbDto,
  })
  data!: EtbDto;
}

/**
 * Response-DTO für die Abfrage eines ETB mit Paginierung
 */
export class GetEtbResponse extends ApiResponse<EtbDto> {
  @ApiProperty({
    description: 'ETB mit Einträgen',
    type: EtbDto,
  })
  data!: EtbDto;

  @ApiProperty({
    description: 'Paginierungs-Informationen',
    type: ApiPagination,
    required: false,
  })
  declare pagination?: ApiPagination;
}

/**
 * Response-DTO für die Erstellung eines ETB-Eintrags
 */
export class CreateEtbEintragResponse extends ApiResponse<EtbEintragDto> {
  @ApiProperty({
    description: 'Erstellter ETB-Eintrag',
    type: EtbEintragDto,
  })
  data!: EtbEintragDto;
}

/**
 * Response-DTO für die Aktualisierung eines ETB-Eintrags
 */
export class UpdateEtbEintragResponse extends ApiResponse<EtbEintragDto> {
  @ApiProperty({
    description: 'Aktualisierter ETB-Eintrag',
    type: EtbEintragDto,
  })
  data!: EtbEintragDto;
}

/**
 * Response-DTO für die Textbaustein-Liste
 */
export class TextbausteinListResponse extends ApiResponse<TextbausteinDto[]> {
  @ApiProperty({
    description: 'Liste der verfügbaren Textbausteine',
    type: () => TextbausteinDto,
    isArray: true,
  })
  data!: TextbausteinDto[];
}

/**
 * DTO für einen Eintrag in der ETB-Versionshistorie
 */
export class EtbHistoryEntryDto {
  @ApiProperty({
    description: 'Eindeutige ID des Historie-Eintrags',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'ID des zugehörigen ETB-Eintrags',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  eintragId!: string;

  @ApiProperty({
    description: 'Versionsnummer',
    example: 1,
  })
  version!: number;

  @ApiProperty({
    description: 'Zeitstempel des Eintrags (Snapshot)',
    example: '2024-01-01T12:00:00.000Z',
  })
  timestamp!: Date;

  @ApiProperty({
    description: 'Fortlaufende Nummer (Snapshot)',
    example: 1,
  })
  sequenceNumber!: number;

  @ApiProperty({
    description: 'Kategorie (Snapshot)',
    enum: EtbKategorie,
    example: EtbKategorie.LAGE,
  })
  kategorie!: EtbKategorie;

  @ApiProperty({
    description: 'Text (Snapshot)',
    example: 'Erste Erkundung abgeschlossen',
  })
  text!: string;

  @ApiProperty({
    description: 'Optionaler Funkrufname (Snapshot)',
    example: 'Florian Hamburg 1',
    required: false,
    nullable: true,
  })
  funkrufname?: string | null;

  @ApiProperty({
    description: 'Optionaler Standort (Snapshot)',
    example: 'Einsatzstelle',
    required: false,
    nullable: true,
  })
  standort?: string | null;

  @ApiProperty({
    description: 'Zusätzliche Metadaten (Snapshot)',
    required: false,
    nullable: true,
  })
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Grund der Änderung',
    example: 'Rechtschreibkorrektur',
    required: false,
    nullable: true,
    type: 'string',
  })
  changeReason?: string | null;

  @ApiProperty({
    description: 'Zeitpunkt der Änderung',
    example: '2024-01-01T12:00:00.000Z',
  })
  changedAt!: Date;

  @ApiProperty({
    description: 'ID des Bearbeiters',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  changedBy!: string;

  @ApiProperty({
    description: 'Username des Bearbeiters',
    example: 'max.mustermann',
    required: false,
  })
  changedByUsername?: string;
}

/**
 * Response-DTO für die Versionshistorie eines ETB-Eintrags
 */
export class EtbHistoryListResponse extends ApiResponse<EtbHistoryEntryDto[]> {
  @ApiProperty({
    description: 'Liste der Historie-Einträge',
    type: () => EtbHistoryEntryDto,
    isArray: true,
  })
  data!: EtbHistoryEntryDto[];

  @ApiProperty({
    description: 'Paginierungs-Informationen',
    type: ApiPagination,
    required: false,
  })
  declare pagination?: ApiPagination;
}
