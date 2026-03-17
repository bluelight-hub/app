import { useCurrentUser } from '@/features/auth/api/use-current-user';
import { einsatzStore } from '@/features/einsatz/stores/active-einsatz.store';
import { clearActiveEinsatz as clearPersistedActiveEinsatz } from '@/features/einsatz/stores/persistence/einsatz-persistence';
import { serverStore } from '@/features/server/stores/server.store';
import { api } from '@/shared';
import { resetTokenRefreshHandler } from '@/shared/lib/errors/error-handler';
import type { LogoutResponseDto } from '@/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-store';
import { AUTH_KEYS } from './queries';

/**
 * Hook für User-Logout
 *
 * Loggt den aktuellen Benutzer aus und löscht alle Queries.
 *
 * @returns Mutation für Logout
 *
 * @example
 * ```tsx
 * const { mutate: logout, isPending } = useLogout();
 *
 * const handleLogout = () => {
 *   logout(undefined, {
 *     onSuccess: () => {
 *       navigate('/auth');
 *       toast.success('Erfolgreich abgemeldet');
 *     },
 *   });
 * };
 * ```
 */
export const useLogout = () => {
  const queryClient = useQueryClient();
  const activeServerId = useStore(serverStore, (state) => state.activeServerId);
  const { authStatus, user } = useCurrentUser();

  return useMutation<LogoutResponseDto, Error, void>({
    mutationFn: () => api.auth().authControllerLogout(),
    onSuccess: async () => {
      // Reset Token-Refresh-Handler bei Logout
      resetTokenRefreshHandler();

      // Alle laufenden Queries abbrechen
      await queryClient.cancelQueries();

      if (authStatus === 'authenticated' && activeServerId && user?.id && user.role) {
        await clearPersistedActiveEinsatz({
          serverId: activeServerId,
          userId: user.id,
          role: user.role,
        });
      }

      einsatzStore.setState((state) => ({
        ...state,
        activeEinsatz: null,
        selectedEinsatzId: null,
        isLoadingActiveEinsatz: false,
        activeEinsatzError: null,
      }));

      // Alle Queries löschen (inkl. Cache)
      queryClient.clear();
    },
  });
};

/**
 * Hook für Admin-Logout
 *
 * Loggt den Admin aus, behält aber die User-Session.
 * Nur die erhöhten Admin-Rechte werden zurückgesetzt.
 *
 * @returns Mutation für Admin-Logout
 *
 * @example
 * ```tsx
 * const { mutate: logoutAdmin, isPending } = useAdminLogout();
 *
 * const handleAdminLogout = () => {
 *   logoutAdmin(undefined, {
 *     onSuccess: () => {
 *       navigate('/');
 *       toast.info('Admin-Session beendet');
 *     },
 *   });
 * };
 * ```
 */
export const useAdminLogout = () => {
  const queryClient = useQueryClient();

  return useMutation<LogoutResponseDto, Error, void>({
    mutationFn: () => api.auth().authControllerAdminLogout(),
    onSuccess: async () => {
      // Reset Token-Refresh-Handler auch bei Admin-Logout
      resetTokenRefreshHandler();

      // Nur Auth-Queries invalidieren (User-Session bleibt)
      await queryClient.invalidateQueries({
        queryKey: AUTH_KEYS.auth.queryKey,
      });
    },
  });
};
