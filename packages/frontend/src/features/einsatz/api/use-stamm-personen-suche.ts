/**
 * Query Hook für StammPersonen Suche (Autocomplete)
 *
 * Lädt alle nicht-archivierten StammPersonen und filtert sie client-seitig
 * für die Autocomplete-Funktionalität.
 *
 * Nutzt den öffentlichen KraefteStammPersonenApi Endpoint, der für alle
 * authentifizierten User zugänglich ist (nicht nur Admins).
 * Analog zu KraefteStammFahrzeugeApi (Story 3.2).
 *
 * @module features/einsatz/api
 */

import { getBaseUrl } from '@/shared/api/api';
import { fetchWithRefresh } from '@/shared/api/fetchWithRefresh';
import { logger } from '@/shared/lib/logger';
import type { ResponseError, StammPersonDto } from '@/shared';
import { Configuration, KraefteStammPersonenApi } from '@/shared';
import { useQuery } from '@tanstack/react-query';
import { calculateRetryDelay, EINSATZ_QUERY_KEYS } from './queries';

/**
 * Hook zum Suchen von StammPersonen für Autocomplete
 *
 * Wird für den "Person registrieren" Dialog verwendet,
 * um Personen aus den Stammdaten zu finden und zu verknüpfen.
 *
 * Client-seitige Filterung nach:
 * - Vorname (case-insensitive)
 * - Nachname (case-insensitive)
 * - Personalausweisnummer (exact match)
 *
 * @param query - Suchbegriff (min. 1 Zeichen für aktivierte Query)
 * @param options - Query-Optionen (enabled)
 * @returns TanStack Query Result mit gefiltertem StammPersonDto Array
 *
 * @example
 * ```tsx
 * const { data: personen, isLoading, error } = useStammPersonenSuche(searchQuery);
 *
 * if (isLoading) return <Loading />;
 *
 * return (
 *   <Combobox
 *     items={personen?.map((person) => ({
 *       value: person.id,
 *       label: `${person.vorname} ${person.nachname}`,
 *     }))}
 *   />
 * );
 * ```
 */
export const useStammPersonenSuche = (query: string, options?: { enabled?: boolean }) => {
  // Öffentlicher Endpoint für alle authentifizierten User
  const stammPersonenApi = new KraefteStammPersonenApi(
    new Configuration({
      basePath: getBaseUrl(),
      fetchApi: fetchWithRefresh,
      credentials: 'include',
    }),
  );

  return useQuery<StammPersonDto[], ResponseError>({
    queryKey: EINSATZ_QUERY_KEYS.stammPersonen.suche(query),
    queryFn: async () => {
      logger.debug('Searching StammPersonen', { query });

      // Lade alle nicht-archivierten Personen über den öffentlichen Endpoint
      const response = await stammPersonenApi.stammPersonenControllerFindAllVAlpha({
        includeArchived: false,
      });
      const allPersonen = response.data ?? [];

      // Client-seitige Filterung
      if (!query || query.trim() === '') {
        return allPersonen;
      }

      const normalizedQuery = query.toLowerCase().trim();

      return allPersonen.filter((person) => {
        const vornameMatch = person.vorname?.toLowerCase().includes(normalizedQuery);
        const nachnameMatch = person.nachname?.toLowerCase().includes(normalizedQuery);
        const fullNameMatch = `${person.vorname} ${person.nachname}`.toLowerCase().includes(normalizedQuery);
        const personalausweisnummerMatch = person.personalausweisnummer === query.trim();

        return vornameMatch || nachnameMatch || fullNameMatch || personalausweisnummerMatch;
      });
    },
    enabled: query?.length >= 1 && (options?.enabled ?? true),
    staleTime: 30_000, // 30 Sekunden - Cache für Autocomplete
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};
