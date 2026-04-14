/**
 * Hook für die Abfrage des taktischen Zeichens eines Fahrzeugs.
 *
 * Lädt das zugewiesene taktische Zeichen eines Einsatzfahrzeugs
 * über den generierten API-Client. Gibt `null` zurück wenn noch
 * kein Zeichen zugewiesen ist (Backend gibt 200 mit null).
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import type { TaktischesZeichenResponseDto } from '@bluelight-hub/shared/client';
import { calculateRetryDelay, KRAEFTE_QUERY_KEYS } from './queries';

/**
 * Hook für die Abfrage des taktischen Zeichens eines Fahrzeugs.
 *
 * @param einsatzId - Die Einsatz-ID (optional — Query wird deaktiviert wenn undefined)
 * @param fahrzeugId - Die Fahrzeug-ID (optional — Query wird deaktiviert wenn undefined)
 * @returns TanStack Query Result mit TaktischesZeichenResponseDto oder null
 */
export function useFahrzeugZeichen(einsatzId: string | undefined, fahrzeugId: string | undefined) {
  return useQuery({
    queryKey: KRAEFTE_QUERY_KEYS.fahrzeugZeichen(einsatzId as string, fahrzeugId as string),
    queryFn: async (): Promise<TaktischesZeichenResponseDto | null> => {
      try {
        const response = await api.einsatzFahrzeuge().einsatzFahrzeugeControllerGetZeichenVAlpha({
          einsatzId: einsatzId as string,
          id: fahrzeugId as string,
        });
        return (response.data as TaktischesZeichenResponseDto | null) ?? null;
      } catch (error: unknown) {
        logger.error('Fehler beim Laden des Fahrzeug-Zeichens', error);
        throw error;
      }
    },
    enabled: !!einsatzId && !!fahrzeugId,
    staleTime: 30_000,
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
}
