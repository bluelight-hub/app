/**
 * Query Hook fuer Aufbewahrungsvorschau
 *
 * Laedt die Vorschau der betroffenen Einsaetze bei aktueller Konfiguration.
 */

import { api } from '@/shared';
import type { AufbewahrungsVorschauDto } from '@/shared';
import { useQuery } from '@tanstack/react-query';
import { AUFBEWAHRUNG_QUERY_KEYS, calculateRetryDelay } from './queries';

/**
 * Hook zum Laden der Aufbewahrungsvorschau
 *
 * Zeigt welche Einsaetze bei der aktuellen Konfiguration
 * von einer Anonymisierung/Loeschung betroffen waeren.
 *
 * @returns TanStack Query Result mit AufbewahrungsVorschauDto
 */
export function useAufbewahrungsVorschau() {
  return useQuery<AufbewahrungsVorschauDto>({
    queryKey: AUFBEWAHRUNG_QUERY_KEYS.vorschau(),
    queryFn: async () => {
      const response = await api.aufbewahrung().aufbewahrungControllerGetVorschauVAlpha();
      return response.data;
    },
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
}
