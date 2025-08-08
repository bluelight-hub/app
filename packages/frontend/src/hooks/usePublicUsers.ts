import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { PublicUserDto } from '@bluelight-hub/shared/client';
import { api } from '@/api/api';
import { logger } from '@/utils/logger';

// Query Key constant for public users
export const PUBLIC_USERS_QUERY_KEY = ['public-users'] as const;

/**
 * Hook zum Abrufen der öffentlichen Benutzerliste
 *
 * Ruft die Liste aller verfügbaren Benutzer ab,
 * die für die Anmeldung zur Verfügung stehen.
 * Dieser Endpoint ist öffentlich zugänglich.
 */
export function usePublicUsers(): UseQueryResult<Array<PublicUserDto>, Error> {
  return useQuery({
    queryKey: PUBLIC_USERS_QUERY_KEY,
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
