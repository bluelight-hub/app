import { api } from '@bluelight-hub/shared/client';
import { AUTH_KEYS } from './queries';
import { SYSTEM_QUERY_KEYS } from '@/features/system/api/queries';
import { setServerAccessToken } from '@/shared/lib/server-access-token';
import type { AdminSetupControllerCompleteSetupVAlpha201Response, CompleteSetupDto } from '@bluelight-hub/shared/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Hook für initialen Admin-Setup
 *
 * Erstellt den ersten Admin-User und generiert einen Server-Access-Token.
 * Kann nur EINMAL aufgerufen werden (beim ersten Server-Start).
 *
 * @returns Mutation für Admin-Setup mit Token in der Response
 *
 * @example
 * ```tsx
 * const { mutate: setupAdmin, isPending } = useAdminSetup();
 *
 * const handleSetup = (username: string, password: string) => {
 *   setupAdmin({ username, password }, {
 *     onSuccess: (response) => {
 *       // Token anzeigen: response.data.accessToken.token
 *       console.log('Token:', response.data.accessToken.token);
 *     },
 *     onError: (err) => toast.error(err.message),
 *   });
 * };
 * ```
 */
export const useAdminSetup = () => {
  const queryClient = useQueryClient();

  return useMutation<AdminSetupControllerCompleteSetupVAlpha201Response, Error, CompleteSetupDto>({
    mutationFn: (completeSetupDto: CompleteSetupDto) => api.admin().adminSetupControllerCompleteSetupVAlpha({ completeSetupDto }),
    onSuccess: async (response) => {
      // Fix 6.3 & 6.4: Token ZUERST speichern (vor Query Invalidation)
      try {
        setServerAccessToken(response.data.accessToken.token);
      } catch (error) {
        // Fix 6.3: Error Handling wenn localStorage voll/disabled ist
        console.error('Failed to store access token in localStorage:', error);
        // Token ist trotzdem in response.data verfuegbar
      }

      // Fix 6.4: Query Invalidation NACH Token-Speicherung
      // Health-Check invalidieren (setupComplete wird true)
      await queryClient.invalidateQueries({
        queryKey: SYSTEM_QUERY_KEYS.health(),
      });
      // Admin-Status invalidieren
      await queryClient.invalidateQueries({
        queryKey: AUTH_KEYS.auth.queries.adminStatus,
      });
    },
  });
};
