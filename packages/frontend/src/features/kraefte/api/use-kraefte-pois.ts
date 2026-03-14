/**
 * Hook fuer die Abfrage der Kraefte-POIs eines Einsatzes.
 *
 * **Story 8.1 - Fahrzeuge als POIs auf Lagekarte:**
 * Laedt alle Fahrzeuge mit Positionsdaten als GeoJSON FeatureCollection
 * fuer die Darstellung auf der Lagekarte.
 *
 * **Features:**
 * - GeoJSON FeatureCollection Format (RFC 7946)
 * - Auto-Refresh alle 30 Sekunden (AC4)
 * - Exponential Backoff bei Fehlern
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared';
import type { KraeftePoisFeatureCollectionDto } from '@/shared';
import { calculateRetryDelay, KRAEFTE_QUERY_KEYS } from './queries';

/**
 * Options fuer useKraeftePois Hook.
 */
export interface UseKraeftePoisOptions {
  /** Auto-Refresh Interval in ms. false = deaktiviert. Default: 30000ms */
  refetchInterval?: number | false;
}

/**
 * Hook fuer die Abfrage der Kraefte-POIs als GeoJSON.
 *
 * **Features:**
 * - Auto-Refresh alle 30s (AC4: Echtzeit-Positionsaktualisierung)
 * - Disabled wenn keine einsatzId vorhanden
 * - Exponential Backoff bei Fehlern
 * - GeoJSON FeatureCollection mit Fahrzeug-Metadaten
 *
 * @param einsatzId - Die Einsatz-ID (optional)
 * @param options - Konfigurationsoptionen (refetchInterval)
 * @returns TanStack Query Result mit GeoJSON FeatureCollection
 *
 * @example
 * ```tsx
 * // Standard (Auto-Refresh alle 30s)
 * const { data: geojson } = useKraeftePois(einsatzId);
 *
 * // Mit deaktiviertem Auto-Refresh
 * const { data: geojson } = useKraeftePois(einsatzId, { refetchInterval: false });
 * ```
 */
export const useKraeftePois = (einsatzId: string | undefined, options?: UseKraeftePoisOptions) => {
  // einsatzId ist garantiert definiert wenn Query ausgefuehrt wird (enabled: !!einsatzId)
  const id = einsatzId as string;

  return useQuery({
    queryKey: KRAEFTE_QUERY_KEYS.pois(id),
    queryFn: async (): Promise<KraeftePoisFeatureCollectionDto> => {
      const response = await api.einsatzFahrzeuge().einsatzFahrzeugeControllerGetKraeftePoisVAlpha({
        einsatzId: id,
      });

      // Extract data from wrapped response
      return response.data;
    },
    // Hinweis: Fehler werden vom globalen QueryCache.onError Handler
    // im zentralen QueryClient behandelt.
    enabled: !!einsatzId,
    staleTime: 10_000, // 10 Sekunden
    refetchInterval: options?.refetchInterval ?? 30_000, // AC4: 30s Polling
    retry: 3,
    retryDelay: calculateRetryDelay, // Exponential Backoff
  });
};
