/**
 * Server API Mutations
 *
 * TanStack Query Mutation Hooks für Server-Operationen.
 * Integriert mit Server Store und Query Cache.
 */

import type { AuthControllerExchangeInvite200Response } from '@/shared';
import type { ResponseError } from '@bluelight-hub/shared/client';
import { AuthApi, Configuration } from '@bluelight-hub/shared/client';
import { api } from '@/shared/api/api';
import { logger } from '@/shared/lib/logger';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addServer, setActiveServer } from '../stores/server.store';
import { SERVER_QUERY_KEYS } from './query-keys';

/**
 * Input-Parameter für die Exchange Invite Mutation.
 *
 * Erlaubt optional eine Server-URL anzugeben, falls der Exchange
 * gegen einen anderen Server als den aktuell aktiven gehen soll
 * (z.B. bei Deep Links mit ?server=...&invite=... Parametern).
 */
export interface ExchangeInviteInput {
  /** Der Invite-Code zum Eintauschen */
  inviteCode: string;
  /**
   * Optionale Server-URL für den Exchange.
   * Falls angegeben, wird eine temporäre API-Instanz für diesen Server erstellt.
   * Falls nicht angegeben, wird der aktuell aktive Server verwendet.
   */
  serverUrl?: string;
}

/**
 * Hook für Invite-Code Exchange
 *
 * Tauscht einen zeitlich begrenzten Invite-Code gegen ein dauerhaftes
 * Server-Access-Token ein. Bei Erfolg wird der neue Server automatisch
 * zur Server-Liste hinzugefügt und als aktiver Server gesetzt.
 *
 * Integration:
 * - Ruft Backend API `/auth/exchange-invite` auf
 * - Speichert neuen Server im Server Store (persistiert in Storage)
 * - Setzt neuen Server als aktiv
 * - Invalidiert Server-Liste Query für Cache-Refresh
 *
 * @returns TanStack Mutation Result mit mutate/mutateAsync
 *
 * @example
 * ```tsx
 * const exchangeInvite = useExchangeInvite();
 *
 * const handleDeepLink = (inviteCode: string) => {
 *   exchangeInvite.mutate(inviteCode, {
 *     onSuccess: () => {
 *       toast.success('Server erfolgreich hinzugefügt');
 *       navigate('/dashboard');
 *     },
 *     onError: (error) => {
 *       toast.error('Invite-Code ungültig oder abgelaufen');
 *     },
 *   });
 * };
 * ```
 */
export const useExchangeInvite = () => {
  const queryClient = useQueryClient();

  return useMutation<AuthControllerExchangeInvite200Response, ResponseError, ExchangeInviteInput>({
    mutationFn: async ({ inviteCode, serverUrl }: ExchangeInviteInput) => {
      logger.debug('Exchanging invite code', { inviteCode, serverUrl: serverUrl ?? '(active server)' });

      // Falls serverUrl angegeben, temporäre API-Instanz erstellen
      // Wichtig für Deep Links: ?server=https://...&invite=INV_xxx
      // Der Exchange muss gegen den Ziel-Server gehen, nicht den aktiven
      let authApi: AuthApi;

      if (serverUrl) {
        // Temporäre Configuration für den Ziel-Server
        const tempConfig = new Configuration({
          basePath: serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl,
          credentials: 'include',
        });
        authApi = new AuthApi(tempConfig);
        logger.debug('Using temporary AuthApi for target server', { serverUrl });
      } else {
        // Fallback auf den aktuell aktiven Server
        authApi = api.auth();
      }

      // API gibt wrapped response zurück: { data: { accessToken, serverInfo }, meta }
      const response = await authApi.authControllerExchangeInvite({
        exchangeInviteDto: { inviteCode },
      });

      return response;
    },

    onSuccess: async (response) => {
      try {
        // Extract data from wrapped response
        const { accessToken, serverInfo } = response.data;

        logger.debug('Invite exchange successful', {
          serverName: serverInfo.name,
          serverUrl: serverInfo.baseUrl,
        });

        // Create new server config
        const newServer = {
          name: serverInfo.name,
          url: serverInfo.baseUrl,
          accessToken,
          isDefault: false,
          lastUsedAt: new Date().toISOString(),
        };

        // Add to store (automatically persists to storage)
        // Returns the generated server ID to avoid race condition
        const newServerId = await addServer(newServer);

        // Set as active server using the returned ID (updates lastUsedAt and isDefault)
        await setActiveServer(newServerId);

        // Invalidate server list query to refresh cache
        await queryClient.invalidateQueries({ queryKey: SERVER_QUERY_KEYS.list() });

        logger.info('Server added and activated successfully', {
          serverName: serverInfo.name,
        });
      } catch (error) {
        // Log error but don't re-throw - mutation was successful at API level
        // We don't want to trigger onError callback for store errors
        logger.error('Failed to add server to store after successful API call', error);
        // Note: User should see toast notification about partial success
      }
    },

    onError: (error: ResponseError) => {
      // Extract error message from ResponseError
      const errorMessage = error.message || 'Unknown error during invite exchange';

      logger.error('Failed to exchange invite code', {
        error: errorMessage,
        status: error.response?.status,
      });

      // Error handling (toast notification in component layer)
    },

    retry: 2, // Retry twice on network errors
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });
};
