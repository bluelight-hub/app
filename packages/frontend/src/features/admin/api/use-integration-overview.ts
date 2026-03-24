import { api } from '@/shared';
import type { ResponseError } from '@/shared';
import { useQuery } from '@tanstack/react-query';
import { ADMIN_QUERY_KEYS } from './queries';

/**
 * Hook fuer das Laden der Integrationsübersicht (alle externen Services).
 *
 * Polling alle 10 Sekunden als Fallback fuer WebSocket-Updates.
 * Smart Retry: 4xx = kein Retry, 5xx = bis zu 2x.
 *
 * @returns TanStack Query Result mit IntegrationOverview
 */
export function useIntegrationOverview() {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.integrations.overview(),
    queryFn: async () => {
      const response = await api.adminIntegrations().adminIntegrationsControllerGetOverviewVAlpha();
      return response.data;
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
    retry: (failureCount, error) => {
      const status = (error as ResponseError)?.response?.status;
      if (status && status >= 400 && status < 500) return false;
      return failureCount < 2;
    },
  });
}
