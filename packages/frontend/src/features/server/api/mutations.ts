/**
 * Server API Mutations
 *
 * TanStack Query Mutation Hooks für Server-Operationen.
 * Integriert mit Server Store und Query Cache.
 */

import { api, type AuthControllerExchangeInvite200Response, type ResponseError } from '@bluelight-hub/shared/client';
import { logger } from '@/shared/lib/logger';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addServer, setActiveServer } from '../stores/server.store';
import { SERVER_QUERY_KEYS } from './query-keys';

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

  return useMutation<AuthControllerExchangeInvite200Response, ResponseError, string>({
    mutationFn: async (inviteCode: string) => {
      logger.debug('Exchanging invite code', { inviteCode });

      // API gibt wrapped response zurück: { data: { accessToken, serverInfo }, meta }
      const response = await api.auth().authControllerExchangeInvite({
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
        await addServer(newServer);

        // Set as active server (updates lastUsedAt and isDefault)
        const servers = queryClient.getQueryData<Array<{ id: string }>>(SERVER_QUERY_KEYS.list());
        if (servers && servers.length > 0) {
          const addedServer = servers[servers.length - 1];
          await setActiveServer(addedServer.id);
        }

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
