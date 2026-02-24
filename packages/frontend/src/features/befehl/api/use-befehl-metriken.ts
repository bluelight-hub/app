/**
 * Query Hook fuer Befehl-Metriken (Adoptionsmetriken & Dokumentationsqualitaet)
 *
 * Laedt aggregierte Metriken ueber alle Einsaetze eines Zeitraums.
 * Standard: letzte 30 Tage.
 *
 * **Story 4.5: Adoptionsmetriken & Dokumentationsqualitaet-Dashboard**
 */

import { api } from '@/shared';
import type { BefehlMetrikenDto } from '@/shared';
import { useQuery } from '@tanstack/react-query';
import { BEFEHL_QUERY_KEYS, calculateRetryDelay } from './queries';

interface UseBefehlMetrikenOptions {
  von?: string;
  bis?: string;
}

interface UseBefehlMetrikenConfig {
  enabled?: boolean;
  retry?: number | false;
}

/**
 * Hook zum Laden aggregierter Befehl-Metriken
 *
 * @param options - Optionale Zeitraum-Parameter (ISO-Strings)
 * @param config - Optionale Query-Konfiguration (z.B. enabled)
 * @returns TanStack Query Result mit BefehlMetrikenDto
 */
export function useBefehlMetriken(options: UseBefehlMetrikenOptions = {}, config: UseBefehlMetrikenConfig = {}) {
  return useQuery<BefehlMetrikenDto>({
    queryKey: BEFEHL_QUERY_KEYS.metriken(options.von, options.bis),
    queryFn: async () => {
      const response = await api.befehle().befehlControllerGetMetrikenVAlpha({
        von: options.von,
        bis: options.bis,
      });
      return response.data;
    },
    enabled: config.enabled,
    retry: config.retry ?? 3,
    retryDelay: calculateRetryDelay,
  });
}
