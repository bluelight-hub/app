import { api } from '@/shared';
import type { ResponseError } from '@/shared';
import { useQuery } from '@tanstack/react-query';
import { ADMIN_QUERY_KEYS } from './queries';

/**
 * Hook fuer das Laden der Custom Permissions eines Users.
 *
 * @param userId - ID des Users dessen Permissions geladen werden sollen
 * @returns TanStack Query Result mit Permission-Liste
 */
export function useUserPermissions(userId: string | undefined) {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.permissions.byUser(userId ?? ''),
    queryFn: async () => {
      const response = await api.userManagement().userManagementControllerGetUserPermissionsVAlpha({ id: userId as string });
      return response.data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 Minuten - Admin-Daten aendern sich selten
    retry: (failureCount, error) => {
      const status = (error as ResponseError)?.response?.status;
      if (status && status >= 400 && status < 500) return false;
      return failureCount < 2;
    },
  });
}
