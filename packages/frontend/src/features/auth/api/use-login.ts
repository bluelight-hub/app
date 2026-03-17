import { api } from '@/shared';
import { AUTH_KEYS } from './queries';
import type { AdminLoginResponseDto, AdminPasswordDto, AuthRequestDto, AuthResponseDto } from '@/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-store';
import { normalizeServerBaseUrl } from '@/shared/api/server-scoped-clients';
import { serverStore } from '@/features/server/stores/server.store';

/**
 * Hook für Unified Authentication (Login/Register)
 *
 * Verwendet die Unified-Auth-API, die sowohl Login als auch Registrierung unterstützt.
 *
 * @returns Mutation für Unified Auth
 *
 * @example
 * ```tsx
 * const { mutate: login, isPending } = useUnifiedAuth();
 *
 * const handleLogin = (username: string, password: string) => {
 *   login({ username, password }, {
 *     onSuccess: () => navigate('/dashboard'),
 *     onError: (err) => toast.error(err.message),
 *   });
 * };
 * ```
 */
export const useUnifiedAuth = () => {
  const queryClient = useQueryClient();
  const activeServerUrl = useStore(serverStore, (state) => {
    if (!state.activeServerId) {
      return null;
    }

    const activeServer = state.servers.find((server) => server.id === state.activeServerId);
    return activeServer ? normalizeServerBaseUrl(activeServer.url) : null;
  });
  const serverScope = activeServerUrl ?? 'unconfigured';

  return useMutation<AuthResponseDto, Error, AuthRequestDto>({
    mutationFn: (authRequestDto: AuthRequestDto) => api.auth().authControllerUnifiedAuth({ authRequestDto }),
    onSuccess: async () => {
      if (!activeServerUrl) {
        return;
      }

      // Nur den exakten aktiven Server-Key refetchen, damit keine fremden Server-Caches überschrieben werden.
      await queryClient.refetchQueries({
        queryKey: AUTH_KEYS.auth.queries.authCheckScoped(serverScope),
      });
    },
  });
};

/**
 * Hook für Admin-Login
 *
 * Separate Admin-Authentifizierung mit erhöhten Rechten.
 *
 * @returns Mutation für Admin-Login
 *
 * @example
 * ```tsx
 * const { mutate: loginAdmin, isPending } = useAdminLogin();
 *
 * const handleAdminLogin = (password: string) => {
 *   loginAdmin({ password }, {
 *     onSuccess: () => navigate('/admin'),
 *     onError: (err) => toast.error('Falsches Admin-Passwort'),
 *   });
 * };
 * ```
 */
export const useAdminLogin = () => {
  const queryClient = useQueryClient();
  const activeServerUrl = useStore(serverStore, (state) => {
    if (!state.activeServerId) {
      return null;
    }

    const activeServer = state.servers.find((server) => server.id === state.activeServerId);
    return activeServer ? normalizeServerBaseUrl(activeServer.url) : null;
  });
  const serverScope = activeServerUrl ?? 'unconfigured';

  return useMutation<AdminLoginResponseDto, Error, AdminPasswordDto>({
    mutationFn: (adminPasswordDto: AdminPasswordDto) => api.auth().authControllerAdminLogin({ adminPasswordDto }),
    onSuccess: async () => {
      if (!activeServerUrl) {
        return;
      }

      // Nur den aktiven Auth-Check invalidieren.
      await queryClient.invalidateQueries({
        queryKey: AUTH_KEYS.auth.queries.authCheckScoped(serverScope),
      });
    },
  });
};
