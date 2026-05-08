import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AmpelWarnBadgeDto } from '@bluelight-hub/shared/client';
import { api } from '@/shared';
import { EIGENSCHUTZ_QUERY_KEYS, eigenschutzRetry } from './queries';

const FIFTEEN_SECONDS = 15 * 1000;

export function useAmpelWarnBadges(einsatzId: string | undefined): UseQueryResult<AmpelWarnBadgeDto[]> {
  return useQuery<AmpelWarnBadgeDto[]>({
    queryKey: EIGENSCHUTZ_QUERY_KEYS.ampelWarnBadges(einsatzId ?? ''),
    queryFn: async (): Promise<AmpelWarnBadgeDto[]> => {
      const response = await api.eigenschutz().eigenschutzAmpelControllerListWarnBadgesVAlpha({
        einsatzId: einsatzId!,
      });
      return response.data ?? [];
    },
    enabled: typeof einsatzId === 'string' && einsatzId.trim().length > 0,
    retry: eigenschutzRetry,
    staleTime: FIFTEEN_SECONDS,
    meta: { silentError: true },
  });
}
