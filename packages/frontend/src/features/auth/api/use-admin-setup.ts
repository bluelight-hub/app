import { api } from '@/shared';
import { AUTH_KEYS } from './queries';
import { SYSTEM_QUERY_KEYS } from '@/features/system/api/queries';
import type { AuthControllerAdminSetup200Response, AdminSetupDto } from '@/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-store';
import { normalizeServerBaseUrl } from '@/shared/api/server-scoped-clients';
import { serverStore } from '@/features/server/stores/server.store';

/**
 * Hook für Admin-Passwort-Setup
 *
 * Setzt das Passwort für einen existierenden Admin-User.
 * Wird verwendet wenn `adminSetupAvailable: true` (Admin hat noch kein Passwort).
 *
 * HINWEIS: Dies ist NICHT der initiale Server-Setup (POST /admin/setup),
 * sondern das Admin-Passwort-Setup für existierende User (POST /auth/admin/setup).
 *
 * @returns Mutation für Admin-Passwort-Setup
 *
 * @example
 * ```tsx
 * const { mutate: setupAdmin, isPending } = useAdminSetup();
 *
 * const handleSetup = (password: string) => {
 *   setupAdmin({ password }, {
 *     onSuccess: () => navigate('/admin/dashboard'),
 *     onError: (err) => toast.error(err.message),
 *   });
 * };
 * ```
 */
export const useAdminSetup = () => {
  const queryClient = useQueryClient();
  const activeServerUrl = useStore(serverStore, (state) => {
    if (!state.activeServerId) {
      return null;
    }

    const activeServer = state.servers.find((server) => server.id === state.activeServerId);
    return activeServer ? normalizeServerBaseUrl(activeServer.url) : null;
  });
  const serverScope = activeServerUrl ?? 'unconfigured';

  return useMutation<AuthControllerAdminSetup200Response, Error, AdminSetupDto>({
    mutationFn: (adminSetupDto: AdminSetupDto) => api.auth().authControllerAdminSetup({ adminSetupDto }),
    onSuccess: async () => {
      if (!activeServerUrl) {
        return;
      }

      // Admin-Status invalidieren (adminSetupAvailable wird false)
      await queryClient.invalidateQueries({
        queryKey: AUTH_KEYS.auth.queries.adminStatusScoped(serverScope),
      });
      // Auth-Check invalidieren (für isAdminAuthenticated)
      await queryClient.invalidateQueries({
        queryKey: AUTH_KEYS.auth.queries.authCheckScoped(serverScope),
      });
      // Health-Check invalidieren
      await queryClient.invalidateQueries({
        queryKey: SYSTEM_QUERY_KEYS.health(serverScope),
      });
    },
  });
};
