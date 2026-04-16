import { api } from '@/shared';
import type { ResponseError } from '@/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { broadcastInvalidation } from '@/shared/lib/cross-window-sync';
import { ADMIN_QUERY_KEYS } from './queries';

/**
 * Mutation Hook fuer das Gewaehren einer Custom Permission.
 *
 * Kein Toast - Caller steuert Inline-Feedback.
 */
export function useGrantPermission() {
  const queryClient = useQueryClient();

  return useMutation<unknown, ResponseError, { userId: string; permission: string }>({
    mutationFn: async ({ userId, permission }) => {
      return await api.userManagement().userManagementControllerGrantPermissionVAlpha({
        id: userId,
        grantPermissionDto: { permission },
      });
    },
    onSuccess: async (_data, { userId }) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.permissions.byUser(userId) }), queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users })]);
      broadcastInvalidation('admin.users');
    },
  });
}
