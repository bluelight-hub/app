import { ApiProperty } from '@nestjs/swagger';

/**
 * Metadaten-Klasse für Paginierung in API-Antworten.
 * Enthält alle notwendigen Informationen über den Paginierungsstatus einer Anfrage.
 */
export class PaginationMeta {
  /** Aktuelle Seitennummer (1-basiert) */
  @ApiProperty({ description: 'Aktuelle Seitennummer', type: Number })
  currentPage: number;

  /** Anzahl der Einträge pro Seite */
  @ApiProperty({ description: 'Anzahl der Einträge pro Seite', type: Number })
  itemsPerPage: number;

  /** Gesamtzahl aller verfügbaren Einträge */
  @ApiProperty({ description: 'Gesamtzahl der Einträge', type: Number })
  totalItems: number;

  /** Gesamtzahl der verfügbaren Seiten */
  @ApiProperty({ description: 'Gesamtzahl der Seiten', type: Number })
  totalPages: number;

  /** Indikator, ob eine nächste Seite verfügbar ist */
  @ApiProperty({ description: 'Gibt an, ob es eine nächste Seite gibt', type: Boolean })
  hasNextPage: boolean;

  /** Indikator, ob eine vorherige Seite verfügbar ist */
  @ApiProperty({ description: 'Gibt an, ob es eine vorherige Seite gibt', type: Boolean })
  hasPreviousPage: boolean;
}

/**
 * Generische Antwort-Klasse für paginierte API-Endpunkte.
 * Kombiniert Daten mit Paginierungs-Metadaten für konsistente API-Antworten.
 *
 * @template T Typ der Elemente in der Items-Liste
 */
export class PaginatedResponse<T> {
  /** Liste der Datensätze für die aktuelle Seite */
  @ApiProperty({ description: 'Liste der Elemente für die aktuelle Seite', isArray: true })
  items: T[];

  /** Metadaten über den Paginierungsstatus */
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
  static create<T>(
    items: T[],
    totalItems: number,
    page: number,
    limit: number,
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(totalItems / limit);

    return {
      items,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
}
