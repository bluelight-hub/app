import { api } from '@/shared';
import { serverStore } from '@/features/server/stores/server.store';
import { resetActiveEinsatzRuntime } from '@/features/einsatz/stores/active-einsatz.store';
import { invalidateActiveEinsatzRuntime } from '@/features/einsatz/hooks/active-einsatz-runtime';
import { resetTokenRefreshHandler } from '@/shared/lib/errors/error-handler';
import { AUTH_KEYS } from './queries';
import type { LogoutResponseDto } from '@/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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

  return useMutation<LogoutResponseDto, Error, void>({
    mutationFn: () => api.auth().authControllerLogout(),
    onSuccess: async () => {
      // Reset Token-Refresh-Handler bei Logout
      resetTokenRefreshHandler();
      invalidateActiveEinsatzRuntime();
      resetActiveEinsatzRuntime(serverStore.state.activeServerId);

      // Alle laufenden Queries abbrechen
      await queryClient.cancelQueries();

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
