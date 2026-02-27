/**
 * Hook fuer Anzahl unquittierter Befehle des aktuellen Users
 *
 * Liest aus dem Befehle-Query-Cache und zaehlt Befehle, bei denen
 * der aktuelle User als Empfaenger eingetragen und noch nicht quittiert hat.
 * Wird fuer den Badge-Counter in der Sidebar verwendet.
 */

import { useCurrentUser } from '@/features/auth';
import type { BefehlDto } from '@bluelight-hub/shared/client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';
import { BEFEHL_QUERY_KEYS } from '../api/queries';

/**
 * Zaehlt unquittierte Befehle fuer den aktuellen User aus dem Query-Cache.
 *
 * @param einsatzId - Einsatz-ID
 * @returns Anzahl unquittierter Befehle (0 wenn keine)
 */
export function useUnquittierteBefehleCount(einsatzId: string): number {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const subscribe = useCallback(
    (callback: () => void) => {
      const unsubscribe = queryClient.getQueryCache().subscribe(callback);
      return unsubscribe;
    },
    [queryClient],
  );

  const getSnapshot = useCallback(() => {
    if (!userId || !einsatzId) return 0;

    const befehle = queryClient.getQueryData<BefehlDto[]>(BEFEHL_QUERY_KEYS.list(einsatzId));
    if (!Array.isArray(befehle)) return 0;

    return befehle.filter((befehl) => befehl.empfaenger.some((e) => e.empfaengerId === userId && !e.quittiertAm)).length;
  }, [queryClient, userId, einsatzId]);

  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
