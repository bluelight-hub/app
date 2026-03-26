/**
 * Query Key Factory für Geo-Queries (PLZ-Lookup).
 *
 * Lebt in shared/api/ (nicht in einem Feature), da die AddressInput-Komponente
 * Feature-unabhängig ist.
 */
export const GEO_QUERY_KEYS = {
  all: ['geo'] as const,
  plzLookup: (countryCode: string, plz: string) => ['geo', 'plz', countryCode, plz] as const,
  addressSearch: (query: string, lat?: string, lon?: string, lang?: string, limit?: string) => ['geo', 'address', query, lat, lon, lang, limit] as const,
} as const;
