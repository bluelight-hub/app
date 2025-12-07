import type { PublicUserDto } from '@bluelight-hub/shared/client';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { AUTH_KEYS } from './queries';
import { logger } from '@/shared/utils/logger';

/**
 * Hook zum Abrufen der öffentlichen Benutzerliste
 *
 * Ruft die Liste aller verfügbaren Benutzer ab,
 * die für die Anmeldung zur Verfügung stehen.
 * Dieser Endpoint ist öffentlich zugänglich.
 *
 * @returns Query mit öffentlicher Benutzer-Liste
 *
 * @example
 * ```tsx
 * const { data: users, isLoading } = usePublicUsers();
 *
 * return (
 *   <UserSelect users={users} />
 * );
 * ```
 */
export function usePublicUsers(): UseQueryResult<Array<PublicUserDto>, Error> {
  return useQuery({
    queryKey: AUTH_KEYS.publicUsers,
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
