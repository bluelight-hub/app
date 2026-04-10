/**
 * Hook für die Abfrage des Zeichen-Katalogs.
 *
 * Lädt alle Standard-Zeichen aus dem Katalog mit optionaler
 * Filterung nach Kategorie und Suchbegriff.
 *
 * Hinweis: Der Katalog ist einsatz-spezifisch (für zukünftige
 * einsatz-individuelle Katalog-Erweiterungen).
 */

import { useQuery } from '@tanstack/react-query';
import { logger } from '@/shared/lib/logger';
import type { ZeichenKatalogEintragResponseDto } from '@bluelight-hub/shared/client';
import { apiFindKatalogEintraege } from './taktische-zeichen-api';
import { calculateRetryDelay, TAKTISCHE_ZEICHEN_QUERY_KEYS } from './queries';

export interface UseZeichenKatalogOptions {
  /** Kategorie-Filter (z.B. 'FUEHRUNG', 'FAHRZEUGE') */
  kategorie?: string;
  /** Suchbegriff für Freitextsuche */
  suche?: string;
}

/**
 * Hook für die Abfrage des Zeichen-Katalogs.
 *
 * Der Katalog enthält alle Standard-Zeichen nach DV 102.
 *
 * @param einsatzId - Die Einsatz-ID
 * @param options - Optionale Filter (kategorie, suche)
 * @returns TanStack Query Result mit Katalog-Einträgen
 *
 * @example
 * ```tsx
 * const { data: eintraege = [] } = useZeichenKatalog(einsatzId, { kategorie: 'FAHRZEUGE' });
 * ```
 */
export const useZeichenKatalog = (einsatzId: string | undefined, options?: UseZeichenKatalogOptions) => {
  const id = einsatzId as string;
  const filter = { kategorie: options?.kategorie, suche: options?.suche };

  return useQuery({
    queryKey: TAKTISCHE_ZEICHEN_QUERY_KEYS.katalogFiltered(filter),
    queryFn: async (): Promise<ZeichenKatalogEintragResponseDto[]> => {
      try {
        return await apiFindKatalogEintraege(id, filter);
      } catch (error) {
        logger.error('Fehler beim Laden des Zeichen-Katalogs', error);
        throw error;
      }
    },
    enabled: !!einsatzId,
    staleTime: 5 * 60_000, // Katalog ändert sich selten — 5 Minuten
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};
