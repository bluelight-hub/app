import type { PublicUserDto } from '@/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-store';
import { api } from '@/shared';
import { serverStore } from '@/features/server/stores/server.store';
import { AUTH_KEYS } from './queries';

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
  // Warte auf Server-Store-Hydration bevor API-Calls gemacht werden
  // Verhindert Race Condition: API-Call → 401 Token Error → Redirect zu /server/setup
  const isHydrated = useStore(serverStore, (state) => state.isHydrated);
  const activeServerId = useStore(serverStore, (state) => state.activeServerId);
  const isServerReady = isHydrated && activeServerId !== null;

  return useQuery({
    queryKey: AUTH_KEYS.publicUsers,
    queryFn: async () => {
      const response = await api.auth().authControllerGetPublicUsers();
      return response.users;
    },
    staleTime: 30000,
    retry: 1,
    // Nur Query ausfuehren wenn Server-Store hydriert und ein Server aktiv ist
    enabled: isServerReady,
  });
}
