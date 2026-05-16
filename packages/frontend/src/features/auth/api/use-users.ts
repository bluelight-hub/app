import { api } from '@/shared';
import { AUTH_KEYS } from './queries';
import type { UserBasicDto, UserControllerFindOneVAlpha200Response } from '@/shared';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

/**
 * Hook zum Abrufen aller Benutzer (Basis-Informationen)
 *
 * Lädt eine Liste aller Benutzer mit ID, Username und Basis-Infos.
 * Wird für User-Auswahl, Zuweisungen, etc. verwendet.
 *
 * @returns Query mit Benutzer-Liste
 *
 * @example
 * ```tsx
 * const { data: users, isLoading } = useUsers();
 *
 * return (
 *   <UserList users={users} />
 * );
 * ```
 */
export const useUsers = () => {
  return useQuery<UserBasicDto[]>({
    queryKey: AUTH_KEYS.users.all,
    queryFn: async () => {
      const usersApi = api.users();
      const response = await usersApi.userControllerFindAllBasicVAlpha();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
};

/**
 * Hook zum Abrufen eines einzelnen Benutzers
 *
 * Lädt vollständige Informationen zu einem Benutzer.
 *
 * @param userId - Die ID des Benutzers
 * @returns Query mit Benutzer-Details
 *
 * @example
 * ```tsx
 * const { data: user, isLoading } = useUser(userId);
 *
 * if (isLoading) return <Spinner />;
 * return <UserProfile user={user} />;
 * ```
 */
export const useUser = (userId?: string) => {
  return useQuery<UserControllerFindOneVAlpha200Response>({
    queryKey: AUTH_KEYS.users.byId(userId),
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      const usersApi = api.users();
      return await usersApi.userControllerFindOneVAlpha({ id: userId });
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
};

/**
 * Hook zum Auflösen mehrerer Benutzer-IDs zu Namen
 *
 * Bietet Helper-Funktionen um User-IDs in lesbare Benutzernamen zu konvertieren.
 * Nutzt den User-Cache aus useUsers().
 *
 * @returns Helper-Funktionen und User-Map
 *
 * @example
 * ```tsx
 * const { getUserName, getUserNames } = useUserNames();
 *
 * // Single User
 * const name = getUserName('user-id-123'); // "Max Mustermann"
 *
 * // Multiple Users
 * const names = getUserNames(['user-1', 'user-2']); // ["Max", "Maria"]
 *
 * // In Komponente
 * <span>Erstellt von: {getUserName(createdBy)}</span>
 * ```
 */
export const useUserNames = () => {
  const { data: users } = useUsers();

  /**
   * Map von User-ID zu Anzeigename. Bevorzugt den aus der Stammperson
   * aufgelösten `displayName` (z. B. "Max Mustermann") und fällt auf den
   * technischen `username` zurück, wenn keine Stammperson verknüpft ist.
   */
  const userMap = useMemo(() => {
    const m = new Map<string, string>();
    if (users && Array.isArray(users)) {
      for (const user of users) {
        if (user.id && user.username) {
          const displayName = user.displayName?.trim();
          m.set(user.id, displayName && displayName.length > 0 ? displayName : user.username);
        }
      }
    }
    return m;
  }, [users]);

  /**
   * Konvertiert eine User-ID zu einem Anzeigenamen (Personalname bevorzugt,
   * sonst Benutzername).
   *
   * Unterstützt auch partielle IDs (z.B. nur die ersten 8 Zeichen).
   *
   * @param userId - Die User-ID
   * @returns Anzeigename oder Fallback `User #<prefix>`
   */
  const getUserName = useCallback(
    (userId: string) => {
      // Direkte Übereinstimmung
      const name = userMap.get(userId);
      if (name) {
        return name;
      }

      // Suche nach Benutzer, dessen ID mit der gegebenen userId beginnt
      // (für den Fall, dass nur ein Teil der ID übergeben wird)
      for (const [id, mappedName] of userMap.entries()) {
        if (id.startsWith(userId)) {
          return mappedName;
        }
      }

      // Fallback
      return `User #${userId.slice(0, 8)}`;
    },
    [userMap],
  );

  /**
   * Konvertiert eine oder mehrere User-IDs zu Benutzernamen
   *
   * @param ids - Einzelne ID oder Array von IDs
   * @returns Einzelner Name oder Array von Namen
   */
  const getUserNames = useCallback(
    (ids: string | string[]) => {
      if (typeof ids === 'string') {
        return getUserName(ids);
      }
      return ids.map((id) => getUserName(id));
    },
    [getUserName],
  );

  return {
    /**
     * Map von User-ID zu Username
     */
    userMap,

    /**
     * Einzelnen User-Namen abrufen
     */
    getUserName,

    /**
     * Mehrere User-Namen abrufen
     */
    getUserNames,
  };
};
