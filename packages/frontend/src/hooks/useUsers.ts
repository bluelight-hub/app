import { api } from '@/api';
import { QUERY_KEYS } from '@/queryKeys';
import type { UserBasicDto, UserResponse } from '@bluelight-hub/shared/client';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

/**
 * Hook zum Abrufen aller Benutzer (Basis-Informationen)
 */
export const useUsers = () => {
  return useQuery<UserBasicDto[]>({
    queryKey: QUERY_KEYS.users.all,
    queryFn: async () => {
      const usersApi = api.users();
      const response = await usersApi.userControllerFindAllBasicVAlpha();
      // Die API gibt korrekt ein UserBasicListResponse mit data und meta zurück
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
};

/**
 * Hook zum Abrufen eines einzelnen Benutzers
 */
export const useUser = (userId?: string) => {
  return useQuery<UserResponse>({
    queryKey: QUERY_KEYS.users.byId(userId),
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
 * @returns Helper functions and userMap
 */
export const useUserNames = () => {
  const { data: users } = useUsers();

  const userMap = useMemo(() => {
    const m = new Map<string, string>();
    if (users && Array.isArray(users)) {
      for (const user of users) {
        if (user.id && user.username) {
          m.set(user.id, user.username);
        }
      }
    }
    return m;
  }, [users]);

  const getUserName = useCallback(
    (userId: string) => {
      // Direkte Übereinstimmung
      const username = userMap.get(userId);
      if (username) {
        return username;
      }

      // Suche nach Benutzer, dessen ID mit der gegebenen userId beginnt
      // (für den Fall, dass nur ein Teil der ID übergeben wird)
      for (const [id, name] of userMap.entries()) {
        if (id.startsWith(userId)) {
          return name;
        }
      }

      // Fallback
      return `User #${userId.slice(0, 8)}`;
    },
    [userMap],
  );

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
    userMap,
    getUserName,
    getUserNames,
  };
};
