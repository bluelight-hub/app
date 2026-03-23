import { useQuery } from '@tanstack/react-query';
import { ResponseError } from '@bluelight-hub/shared/client';
import { api } from '@/shared';

/**
 * Query Key fuer die eigene Einsatz-Rolle.
 * Separater Key (nicht unter BEFEHL_QUERY_KEYS) da Einsatz-Kontext.
 */
export const MEINE_EINSATZ_ROLLE_KEY = (einsatzId: string) => ['einsatz', einsatzId, 'meine-rolle'] as const;

/**
 * TanStack Query Hook fuer GET /api/v-alpha/einsaetze/:id/meine-rolle.
 *
 * Story 4.2 AC1: Laedt die eigene Rolle und abgeleitete Permissions.
 *
 * @param einsatzId - Aktiver Einsatz
 * @returns Query Result mit MeineEinsatzRolleDto
 */
export function useMyEinsatzRolle(einsatzId: string) {
  return useQuery({
    queryKey: MEINE_EINSATZ_ROLLE_KEY(einsatzId),
    queryFn: async () => {
      const response = await api.einsatz().einsatzControllerGetMeineRolleVAlpha({ id: einsatzId });
      return response.data;
    },
    enabled: !!einsatzId,
    staleTime: 5 * 60 * 1000, // 5 Minuten — Rolle aendert sich selten
    retry: (failureCount, error) => {
      if (error instanceof ResponseError && error.response.status < 500) return false;
      return failureCount < 2;
    },
  });
}
