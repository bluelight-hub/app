/**
 * Query Hook für "Meine Befehle"
 *
 * Lädt alle Befehle eines Einsatzes, bei denen der aktuelle User Empfänger ist.
 * Sortierung: Unquittierte zuerst, dann nach erteiltAm DESC.
 */

import { api } from '@/shared';
import type { BefehlDto } from '@/shared';
import { useQuery } from '@tanstack/react-query';
import { BEFEHL_QUERY_KEYS, calculateRetryDelay } from './queries';

/**
 * Sortiert Befehle: Unquittierte (eigene quittiertAm === null) zuerst, dann erteiltAm DESC
 */
export function sortMeineBefehle(befehle: BefehlDto[], userId: string): BefehlDto[] {
  return [...befehle].sort((a, b) => {
    const aEmpf = a.empfaenger.find((e) => e.empfaengerId === userId);
    const bEmpf = b.empfaenger.find((e) => e.empfaengerId === userId);
    const aQuittiert = !!aEmpf?.quittiertAm;
    const bQuittiert = !!bEmpf?.quittiertAm;

    // Unquittierte zuerst
    if (aQuittiert !== bQuittiert) return aQuittiert ? 1 : -1;

    // Dann nach erteiltAm DESC
    return new Date(b.erteiltAm).getTime() - new Date(a.erteiltAm).getTime();
  });
}

/**
 * Hook zum Laden der Befehle, bei denen der aktuelle User Empfaenger ist
 *
 * @param einsatzId - Einsatz-ID für die Abfrage
 * @param userId - User-ID des aktuellen Benutzers
 * @returns TanStack Query Result mit BefehlDto Array (gefiltert + sortiert)
 */
export function useMeineBefehle(einsatzId: string, userId: string | undefined) {
  return useQuery<BefehlDto[]>({
    queryKey: BEFEHL_QUERY_KEYS.meineBefehle(einsatzId, userId ?? ''),
    queryFn: async () => {
      const response = await api.befehle().befehlControllerFindByEinsatzVAlpha({
        einsatzId,
        empfaengerId: userId,
      });
      return sortMeineBefehle(response.data, userId ?? '');
    },
    enabled: !!einsatzId && !!userId,
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
}
