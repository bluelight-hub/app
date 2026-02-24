/**
 * TanStack Query Hook fuer Integration Health Status.
 *
 * Ruft den Circuit Breaker Status aller externen Integrationen
 * vom `/health/integrations` Endpoint ab.
 *
 * **Hinweis:** Der Endpoint nutzt `@ApiWrappedResponse` (TransformInterceptor),
 * daher kommt die Antwort als `{ data: IntegrationHealthResponse, meta: ... }`.
 * Authentifizierung via X-Server-Access-Token Header.
 *
 * @see Story 5.3 AC4
 * @module features/befehl/api
 */

import { useQuery } from '@tanstack/react-query';
import { fetchWithRefresh } from '@/shared/api/fetchWithRefresh';
import type { CircuitState } from './use-integration-status';

/** Status eines einzelnen Circuit Breakers */
export interface IntegrationStatusEntry {
  serviceName: string;
  state: CircuitState;
  failureCount: number;
  lastFailure: string | null;
  lastSuccess: string | null;
}

/** Response des Integration Health Endpoints */
export interface IntegrationHealthResponse {
  integrations: IntegrationStatusEntry[];
}

/** Query Key fuer Integration Health */
export const INTEGRATION_HEALTH_KEY = ['integration-health'] as const;

/**
 * Hook zum Abfragen des Integration Health Status.
 *
 * Pollt den Health Endpoint alle 30 Sekunden.
 *
 * @param options.enabled - Ob der Query aktiv sein soll (default: true)
 * @returns TanStack Query Result mit IntegrationHealthResponse
 */
export function useIntegrationHealth(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: INTEGRATION_HEALTH_KEY,
    queryFn: async (): Promise<IntegrationHealthResponse> => {
      const response = await fetchWithRefresh('/health/integrations');

      if (!response.ok) {
        throw new Error(`Health endpoint returned ${response.status}`);
      }

      const json = await response.json();
      // Response ist jetzt gewrappt durch TransformInterceptor: { data: ..., meta: ... }
      return json.data ?? json;
    },
    enabled: options?.enabled ?? true,
    refetchInterval: 30_000, // 30s Polling
    staleTime: 10_000, // 10s Cache
    retry: 0, // Kein Retry bei Health-Checks
  });
}
