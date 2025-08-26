import type { PublicUserDto } from '@bluelight-hub/shared/client';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { QUERY_KEYS } from '@/queryKeys';
import { logger } from '@/utils/logger';

/**
 * Hook zum Abrufen der öffentlichen Benutzerliste
 *
 * Ruft die Liste aller verfügbaren Benutzer ab,
 * die für die Anmeldung zur Verfügung stehen.
 * Dieser Endpoint ist öffentlich zugänglich.
 */
export function usePublicUsers(): UseQueryResult<Array<PublicUserDto>, Error> {
  return useQuery({
    queryKey: QUERY_KEYS.user.publicUsers,
    queryFn: async () => {
      try {
        const response = await api.auth().authControllerGetPublicUsers();
        return response.users;
      } catch (error) {
        logger.error('Failed to fetch public users', error);
        throw error;
      }
    },
    staleTime: 30000,
    retry: 1,
  });
}
