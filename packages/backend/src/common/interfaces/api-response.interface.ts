import { ApiProperty } from '@nestjs/swagger';

/**
 * Klasse für Paginierungsinformationen in API-Antworten
 */
export class ApiPagination {
    /**
     * Aktuelle Seite
     */
    @ApiProperty({
        description: 'Aktuelle Seite',
        example: 1,
    })
    page: number;

    /**
     * Anzahl der Elemente pro Seite
     */
    @ApiProperty({
        description: 'Anzahl der Elemente pro Seite',
        example: 10,
    })
    limit: number;

    /**
     * Gesamtanzahl der Elemente
     */
    @ApiProperty({
        description: 'Gesamtanzahl der Elemente',
        example: 100,
    })
    total: number;

    /**
     * Gesamtanzahl der Seiten
     */
    @ApiProperty({
        description: 'Gesamtanzahl der Seiten',
        example: 10,
    })
    totalPages: number;
}

/**
 * Klasse für Metadaten in API-Antworten
 */
export class ApiMeta {
    /**
     * Zeitstempel der Antwort im ISO-Format
     */
    @ApiProperty({
        description: 'Zeitstempel der Antwort',
        example: '2023-01-01T12:00:00.000Z',
    })
    timestamp: string;

    /**
     * Optionale Paginierungsinformationen
     */
    @ApiProperty({
        description: 'Paginierungsinformationen',
        type: ApiPagination,
        required: false,
    })
    pagination?: ApiPagination;
}

/**
 * Abstrakte Basisklasse für alle API-Antworten
 * @template T Typ der Antwortdaten
 */
export abstract class ApiResponse<T> {
    /**
     * Die eigentlichen Antwortdaten
     */
    abstract data: T;

    /**
     * Metadaten zur Antwort
     */
    @ApiProperty({
        description: 'Metadaten zur Antwort',
        type: ApiMeta,
    })
    meta: ApiMeta;

    /**
     * Optionale Nachricht
     */
    @ApiProperty({
        description: 'Optionale Nachricht',
        required: false,
        example: 'Operation erfolgreich durchgeführt',
    })
    message?: string;
} 