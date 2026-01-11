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
import { type OnboardingErrorCode, parseOnboardingErrorCode } from '../constants/error-codes.constants';
import { addServer, setActiveServer } from '../stores/server.store';
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

    onSuccess: async (response, variables) => {
      try {
        // Extract data from wrapped response
        const { accessToken, serverInfo } = response.data;

        // Nutze den vom User angegebenen Server-Namen oder fallback auf serverInfo.name (AC5)
        const displayName = variables.serverName || serverInfo.name;

        logger.debug('Invite exchange successful', {
          serverName: displayName,
          serverUrl: serverInfo.baseUrl,
          customName: !!variables.serverName,
        });

        // Create new server config with optional custom name
        const newServer = {
          name: displayName,
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
          serverName: displayName,
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
