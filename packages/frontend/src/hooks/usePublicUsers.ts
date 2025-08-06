import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/api';

/**
 * Hook zum Abrufen der öffentlichen Benutzerliste
 *
 * Ruft die Liste aller verfügbaren Benutzer ab,
 * die für die Anmeldung zur Verfügung stehen.
 * Dieser Endpoint ist öffentlich zugänglich.
 */
export function usePublicUsers() {
  return useQuery({
    queryKey: ['public-users'],
    queryFn: async () => {
      const response = await api.auth().authControllerGetPublicUsers();
      return response.users;
    },
    staleTime: 30000,
    retry: 1,
  });
}
