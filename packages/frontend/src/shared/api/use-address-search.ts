/**
 * TanStack Query Hook für Straßen-Autocomplete via Photon Geocoding.
 *
 * Nutzt den generierten API-Client (GeoApi).
 *
 * @module shared/api
 */

import { useQuery } from '@tanstack/react-query';
import type { AddressSucheErgebnisDto } from '@bluelight-hub/shared/client';
import { api } from './api';
import { GEO_QUERY_KEYS } from './geo-query-keys';

/** Re-export für Konsumenten. */
export type { AddressSucheErgebnisDto as AddressSearchResult };

/**
 * Hook für Straßen-Autocomplete (Photon Geocoding).
 *
 * @param query - Suchbegriff (min. 2 Zeichen für Aktivierung)
 * @param options - Optional: `lat`/`lon` für Proximity-Bias, `enabled` steuert ob der Query feuert
 */
export function useAddressSearch(query: string, options?: { lat?: string; lon?: string; enabled?: boolean }) {
  return useQuery<AddressSucheErgebnisDto[]>({
    queryKey: GEO_QUERY_KEYS.addressSearch(query, options?.lat, options?.lon),
    queryFn: async () => {
      const response = await api.geo().addressSucheControllerSearchVAlpha({
        q: query,
        lang: 'de',
        limit: '5',
        lat: options?.lat,
        lon: options?.lon,
      });
      return response.data;
    },
    enabled: query.length >= 2 && (options?.enabled ?? true),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}
