import { ApiProperty } from '@nestjs/swagger';

/**
 * Pagination Metadaten für paginierte API-Antworten.
 */
export class PaginationMeta {
    @ApiProperty({ description: 'Aktuelle Seitennummer', type: Number })
    currentPage: number;

    @ApiProperty({ description: 'Anzahl der Einträge pro Seite', type: Number })
    itemsPerPage: number;

    @ApiProperty({ description: 'Gesamtzahl der Einträge', type: Number })
    totalItems: number;

    @ApiProperty({ description: 'Gesamtzahl der Seiten', type: Number })
    totalPages: number;

    @ApiProperty({ description: 'Gibt an, ob es eine nächste Seite gibt', type: Boolean })
    hasNextPage: boolean;

    @ApiProperty({ description: 'Gibt an, ob es eine vorherige Seite gibt', type: Boolean })
    hasPreviousPage: boolean;
}

/**
 * Generische Schnittstelle für paginierte API-Antworten.
 * 
 * @template T Typ der Elemente in der Items-Liste
 */
export class PaginatedResponse<T> {
    @ApiProperty({ description: 'Liste der Elemente für die aktuelle Seite', isArray: true })
    items: T[];

    @ApiProperty({ type: PaginationMeta })
    pagination: PaginationMeta;

    /**
     * Statische Methode zum Erstellen einer paginierten Antwort.
     * 
     * @param items Die Elemente für die aktuelle Seite
     * @param totalItems Gesamtzahl aller Elemente
     * @param page Aktuelle Seitennummer
     * @param limit Anzahl der Elemente pro Seite
     * @returns Eine paginierte Antwort
     */
    static create<T>(items: T[], totalItems: number, page: number, limit: number): PaginatedResponse<T> {
        const totalPages = Math.ceil(totalItems / limit);

        return {
            items,
            pagination: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        };
    }
} 