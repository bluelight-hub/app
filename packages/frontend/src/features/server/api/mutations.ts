/**
 * Server API Mutations
 *
 * TanStack Query Mutation Hooks für Server-Operationen.
 * Integriert mit Server Store und Query Cache.
 */

import type { AuthControllerExchangeInvite200Response } from '@/shared';
import type { AuthApi, ResponseError } from '@bluelight-hub/shared/client';
import { api } from '@/shared/api/api';
import { createServerScopedAuthApi, normalizeServerBaseUrl } from '@/shared/api/server-scoped-clients';
import { logger } from '@/shared/lib/logger';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type OnboardingErrorCode, parseOnboardingErrorCode } from '../constants/error-codes.constants';
import { addServer, removeServer, setActiveServer } from '../stores/server.store';
import { SERVER_QUERY_KEYS } from './query-keys';

/**
 * HTTP Status Codes die NICHT erneut versucht werden sollen.
 *
 * Diese Status Codes repräsentieren Business-Logic-Fehler,
 * bei denen ein erneuter Versuch das gleiche Ergebnis liefern würde:
 * - 400: Bad Request (ungültige Eingabe)
 * - 401: Unauthorized (Authentifizierung fehlgeschlagen)
 * - 403: Forbidden (keine Berechtigung)
 * - 404: Not Found (Ressource existiert nicht)
 * - 409: Conflict (z.B. Invite bereits verwendet)
 * - 410: Gone (Ressource nicht mehr verfügbar, z.B. abgelaufener Invite)
 * - 422: Unprocessable Entity (Validierungsfehler)
 */
const NON_RETRYABLE_STATUS_CODES = [400, 401, 403, 404, 409, 410, 422];

export class ExchangeInvitePersistenceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ExchangeInvitePersistenceError';
  }
}

/**
 * Extrahiert den Onboarding-Fehlercode aus einem Exchange-Fehler.
 *
 * Diese Hilfsfunktion kann von Komponenten verwendet werden, um
 * den strukturierten Fehlercode aus einem Mutation-Fehler zu extrahieren.
 * Der Fehlercode kann dann mit `getOnboardingErrorDetails()` in
 * benutzerfreundliche Fehlermeldungen umgewandelt werden.
 *
 * @param error - Der Fehler aus der Mutation (mutation.error)
 * @returns Promise mit dem ermittelten OnboardingErrorCode
 *
 * @example
 * ```tsx
 * const exchangeInvite = useExchangeInvite();
 *
 * useEffect(() => {
 *   if (exchangeInvite.error) {
 *     getExchangeErrorCode(exchangeInvite.error).then((code) => {
 *       const details = getOnboardingErrorDetails(code);
 *       showErrorNotification(details.title, details.message);
 *     });
 *   }
 * }, [exchangeInvite.error]);
 * ```
 */
export async function getExchangeErrorCode(error: unknown): Promise<OnboardingErrorCode> {
  return parseOnboardingErrorCode(error);
}

/**
 * Input-Parameter für die Exchange Invite Mutation.
 *
 * Erlaubt optional eine Server-URL und einen Server-Namen anzugeben,
 * falls der Exchange gegen einen anderen Server als den aktuell aktiven gehen soll
 * (z.B. bei Deep Links mit ?server=...&invite=... Parametern oder manuellem Setup).
 *
 * **AC5: Erfolgreicher Setup**
 * - Der serverName wird im Toast verwendet: "Server '[Name]' hinzugefügt"
 * - Falls nicht angegeben, wird serverInfo.name aus der API Response verwendet
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
  /**
   * Optionaler Server-Name (Display-Name).
   * Falls angegeben, wird dieser statt serverInfo.name verwendet.
   * Ermöglicht dem User einen benutzerdefinierten Namen zu vergeben.
   */
  serverName?: string;
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
 * const handleDeepLink = (inviteCode: string, serverName?: string) => {
 *   exchangeInvite.mutate({ inviteCode, serverName }, {
 *     onSuccess: (response) => {
 *       const displayName = serverName || response.data.serverInfo.name;
 *       toast.success(`Server '${displayName}' hinzugefügt`);
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

  return useMutation<AuthControllerExchangeInvite200Response, ResponseError | ExchangeInvitePersistenceError, ExchangeInviteInput>({
    mutationFn: async ({ inviteCode, serverUrl, serverName }: ExchangeInviteInput) => {
      logger.debug('Exchanging invite code', { inviteCode, serverUrl: serverUrl ?? '(active server)' });

      // Falls serverUrl angegeben, temporäre API-Instanz erstellen
      // Wichtig für Deep Links: ?server=https://...&invite=INV_xxx
      // Der Exchange muss gegen den Ziel-Server gehen, nicht den aktiven
      let authApi: AuthApi;

      if (serverUrl) {
        authApi = createServerScopedAuthApi(serverUrl);
        logger.debug('Using temporary AuthApi for target server', { serverUrl });
      } else {
        // Fallback auf den aktuell aktiven Server
        authApi = api.auth();
      }

      // API gibt wrapped response zurück: { data: { accessToken, serverInfo }, meta }
      const response = await authApi.authControllerExchangeInvite({
        exchangeInviteDto: { inviteCode },
      });

      const { accessToken, serverInfo } = response.data;
      const displayName = serverName || serverInfo.name;
      const resolvedServerUrl = serverUrl ? normalizeServerBaseUrl(serverUrl) : serverInfo.baseUrl;

      let newServerId: string | null = null;

      try {
        newServerId = await addServer({
          name: displayName,
          url: resolvedServerUrl,
          accessToken,
          isDefault: false,
          lastUsedAt: new Date().toISOString(),
        });

        await setActiveServer(newServerId);
      } catch (error) {
        if (newServerId) {
          try {
            await removeServer(newServerId);
          } catch (rollbackError) {
            logger.error('Rollback after exchange invite persistence failure failed', {
              rollbackError,
              serverId: newServerId,
            });
          }
        }

        logger.error('Failed to persist exchanged server locally', {
          error,
          serverName: displayName,
          serverUrl: resolvedServerUrl,
        });

        throw new ExchangeInvitePersistenceError(`Server '${displayName}' konnte lokal nicht gespeichert werden.`, {
          cause: error instanceof Error ? error : undefined,
        });
      }

      return response;
    },

    onSuccess: async (response, variables) => {
      const displayName = variables.serverName || response.data.serverInfo.name;
      const resolvedServerUrl = variables.serverUrl ? normalizeServerBaseUrl(variables.serverUrl) : response.data.serverInfo.baseUrl;

      logger.debug('Invite exchange successful', {
        serverName: displayName,
        serverUrl: resolvedServerUrl,
        originalServerUrl: response.data.serverInfo.baseUrl,
        customName: !!variables.serverName,
        customUrl: !!variables.serverUrl,
      });

      await queryClient.invalidateQueries({ queryKey: SERVER_QUERY_KEYS.list() });

      logger.info('Server added and activated successfully', {
        serverName: displayName,
      });
    },

    onError: (error) => {
      // Extract error message from ResponseError
      const errorMessage = error.message || 'Unknown error during invite exchange';
      const status = error instanceof ExchangeInvitePersistenceError ? undefined : error.response?.status;

      logger.error('Failed to exchange invite code', {
        error: errorMessage,
        status,
      });

      // Error handling (toast notification in component layer)
    },

    // Retry-Logik: Nicht bei Business-Logic-Fehlern wiederholen
    retry: (failureCount, error) => {
      // Bei ResponseError prüfen ob der Status Code ein Business-Logic-Fehler ist
      if (error && typeof error === 'object' && 'response' in error) {
        const responseError = error as ResponseError;
        const status = responseError.response?.status ?? 0;

        // Business-Logic-Fehler nicht wiederholen
        if (NON_RETRYABLE_STATUS_CODES.includes(status)) {
          logger.debug('Not retrying due to business logic error', { status });
          return false;
        }
      }

      // Netzwerkfehler bis zu 2x wiederholen
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });
};
