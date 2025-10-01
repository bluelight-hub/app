/**
 * Erlaubte Sortierfelder für ETB-Einträge
 *
 * @remarks
 * - timestamp: Empfohlenes Standard-Sortierfeld mit DB-Index
 * - sequenceNumber: Laufende Nummer, unique pro ETB, hat DB-Index
 * - kategorie: ETB-Kategorie, hat DB-Index
 * - text: **ACHTUNG**: Hat KEINEN DB-Index, kann bei großen Datenmengen langsam sein
 *
 * @see {@link EtbPaginationDto}
 */
export const ETB_SORT_FIELDS = ['timestamp', 'sequenceNumber', 'kategorie', 'text'] as const;

/**
 * Type für erlaubte Sortierfelder in ETB-Abfragen
 *
 * @example
 * ```typescript
 * const sortBy: EtbSortBy = 'timestamp'; // ✅
 * const invalid: EtbSortBy = 'invalid'; // ❌ Type error
 * ```
 */
export type EtbSortBy = (typeof ETB_SORT_FIELDS)[number];
