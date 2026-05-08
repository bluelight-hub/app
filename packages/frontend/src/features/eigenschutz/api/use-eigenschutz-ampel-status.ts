import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AmpelProjectionDto } from '@bluelight-hub/shared/client';
import { api } from '@/shared';
import { EIGENSCHUTZ_QUERY_KEYS } from './queries';

const FIFTEEN_SECONDS = 15 * 1000;

export function useEigenschutzAmpelStatus(einsatzId: string | undefined): UseQueryResult<AmpelProjectionDto[]> {
  return useQuery<AmpelProjectionDto[]>({
    queryKey: EIGENSCHUTZ_QUERY_KEYS.ampelStatus(einsatzId ?? ''),
    queryFn: async (): Promise<AmpelProjectionDto[]> => {
      const response = await api.eigenschutz().eigenschutzAmpelControllerGetAmpelVAlpha({
        einsatzId: einsatzId!,
      });
      return response.data ?? [];
    },
    enabled: typeof einsatzId === 'string' && einsatzId.trim().length > 0,
    staleTime: FIFTEEN_SECONDS,
    meta: { silentError: true },
  });
}
