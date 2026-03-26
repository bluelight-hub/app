/**
 * TanStack Query Hook für PLZ-Lookup.
 *
 * Nutzt den generierten API-Client (GeoApi) für den Endpoint
 * GET /api/v-alpha/geo/plz/:countryCode/:plz
 *
 * @module shared/api
 */

import { useQuery } from '@tanstack/react-query';
import type { PlzLookupResponseDto } from '@bluelight-hub/shared/client';
import { GEO_QUERY_KEYS } from './geo-query-keys';
import { api } from './api';

/** Re-export für Konsumenten, die den Typ brauchen. */
export type { PlzLookupResponseDto };

/**
 * Hook für PLZ-Lookup.
 *
 * @param countryCode - ISO-3166-1 Alpha-2 Ländercode (z.B. "DE")
 * @param plz - Postleitzahl (z.B. "80331")
 * @param options - Optional: `enabled` steuert ob der Query feuert
 */
export function usePlzLookup(countryCode: string, plz: string, options?: { enabled?: boolean }) {
  return useQuery<PlzLookupResponseDto>({
    queryKey: GEO_QUERY_KEYS.plzLookup(countryCode, plz),
    queryFn: async () => {
      const response = await api.geo().plzLookupControllerLookupVAlpha({ countryCode, plz });
      return response.data;
    },
    enabled: plz.length >= 4 && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    gcTime: 10 * 60 * 1000,
  });
}
