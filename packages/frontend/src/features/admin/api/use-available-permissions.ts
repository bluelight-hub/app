import { api } from '@/shared';
import type { ResponseError } from '@/shared';
import { useQuery } from '@tanstack/react-query';
import { ADMIN_QUERY_KEYS } from './queries';

/**
 * Hook fuer das Laden aller verfuegbaren Permission-Patterns.
 *
 * Statische Daten die sich waehrend der Session nicht aendern.
 *
 * @returns TanStack Query Result mit Available Permissions Liste
 */
export function useAvailablePermissions() {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.permissions.available(),
    queryFn: async () => {
      const response = await api.permissions().adminPermissionsControllerGetAvailablePermissionsVAlpha();
      return response.data;
    },
    staleTime: Number.POSITIVE_INFINITY, // Statische Daten - aendern sich nicht
    retry: (failureCount, error) => {
      const status = (error as ResponseError)?.response?.status;
      if (status && status >= 400 && status < 500) return false;
      return failureCount < 2;
    },
  });
}
