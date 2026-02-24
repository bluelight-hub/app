/**
 * Query Hook fuer System-Health Metriken
 *
 * Laedt den aggregierten System-Gesundheitszustand vom Backend.
 * Erfordert Admin-Authentifizierung (JWT + ADMIN/SUPER_ADMIN Rolle).
 *
 * Auto-Refresh alle 10 Sekunden fuer nahezu Echtzeit-Updates.
 *
 * @remarks Story 5.6 AC4
 */

import { api } from '@/shared';
import type { SystemHealthDto } from '@bluelight-hub/shared/client';
import { useQuery } from '@tanstack/react-query';
import { MONITORING_QUERY_KEYS } from './queries';

/**
 * Hook zum Laden des System-Health-Status
 *
 * @param enabled - Ob der Query aktiv sein soll (default: true)
 * @returns TanStack Query Result mit SystemHealthDto
 */
export function useSystemHealth(enabled = true) {
  return useQuery<SystemHealthDto>({
    queryKey: MONITORING_QUERY_KEYS.systemHealth(),
    queryFn: async () => {
      const response = await api.health().healthControllerGetSystemHealth();
      return response.data;
    },
    enabled,
    refetchInterval: 10_000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10_000),
  });
}
