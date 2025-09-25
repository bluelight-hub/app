import { ApiProperty } from '@nestjs/swagger';
import { EtbStatus } from '@prisma/client';
import { ApiResponse, ApiPagination } from '@/common/interfaces/api-response.interface';

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
    example: 'LAGE',
  })
  kategorie!: string;

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
    example: 'LAGE',
  })
  kategorie!: string;

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
  metadata?: any;

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
    type: [EtbEintragDto],
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
    type: [TextbausteinDto],
  })
  data!: TextbausteinDto[];
}
