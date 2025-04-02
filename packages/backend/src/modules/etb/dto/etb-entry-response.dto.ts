import { ApiResponse } from '@/common/interfaces/api-response.interface';
import { ApiProperty } from '@nestjs/swagger';
import { EtbAttachment } from '../entities/etb-attachment.entity';

/**
 * DTO für ETB-Eintrag
 */
export class EtbEntryDto {
    @ApiProperty({
        description: 'ID des ETB-Eintrags',
        type: 'string',
        format: 'uuid',
    })
    id: string;

    @ApiProperty({
        description: 'Fortlaufende Nummer des ETB-Eintrags',
        type: 'number',
    })
    laufendeNummer: number;

    @ApiProperty({
        description: 'Zeitpunkt der Erstellung',
        type: 'string',
        format: 'date-time',
    })
    timestampErstellung: Date;

    @ApiProperty({
        description: 'Zeitpunkt des Ereignisses',
        type: 'string',
        format: 'date-time',
    })
    timestampEreignis: Date;

    @ApiProperty({
        description: 'ID des Autors',
        type: 'string',
    })
    autorId: string;

    @ApiProperty({
        description: 'Name des Autors',
        type: 'string',
        nullable: true,
    })
    autorName: string;

    @ApiProperty({
        description: 'Rolle des Autors',
        type: 'string',
        nullable: true,
    })
    autorRolle: string;

    @ApiProperty({
        description: 'Kategorie des Eintrags',
        type: 'string',
    })
    kategorie: string;

    @ApiProperty({
        description: 'Titel des Eintrags',
        type: 'string',
        nullable: true,
    })
    titel: string;

    @ApiProperty({
        description: 'Beschreibung des Eintrags',
        type: 'string',
    })
    beschreibung: string;

    @ApiProperty({
        description: 'Referenz zur Einsatz-ID',
        type: 'string',
        nullable: true,
    })
    referenzEinsatzId: string;

    @ApiProperty({
        description: 'Referenz zur Patienten-ID',
        type: 'string',
        nullable: true,
    })
    referenzPatientId: string;

    @ApiProperty({
        description: 'Referenz zur Einsatzmittel-ID',
        type: 'string',
        nullable: true,
    })
    referenzEinsatzmittelId: string;

    @ApiProperty({
        description: 'Quelle des Eintrags',
        type: 'string',
        nullable: true,
    })
    systemQuelle: string;

    @ApiProperty({
        description: 'Version des Eintrags',
        type: 'number',
    })
    version: number;

    @ApiProperty({
        description: 'Gibt an, ob der Eintrag abgeschlossen ist',
        type: 'boolean',
    })
    istAbgeschlossen: boolean;

    @ApiProperty({
        description: 'Zeitpunkt des Abschlusses',
        type: 'string',
        format: 'date-time',
        nullable: true,
    })
    timestampAbschluss: Date;

    @ApiProperty({
        description: 'ID der Person, die den Eintrag abgeschlossen hat',
        type: 'string',
        nullable: true,
    })
    abgeschlossenVon: string;
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
 * DTO für ETB-Einträge mit Gesamtzahl
 */
export class EtbEntriesData {
    @ApiProperty({
        description: 'ETB-Einträge',
        type: [EtbEntryDto],
    })
    entries: EtbEntryDto[];

    @ApiProperty({
        description: 'Gesamtzahl der ETB-Einträge',
        type: 'number',
    })
    total: number;
}

/**
 * DTO für die Antwort einer Liste von ETB-Einträgen
 */
export class EtbEntriesResponse extends ApiResponse<EtbEntriesData> {
    /**
     * Liste von ETB-Einträgen und Gesamtzahl
     */
    @ApiProperty({
        description: 'ETB-Einträge und Gesamtzahl',
        type: EtbEntriesData,
    })
    data: EtbEntriesData;
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