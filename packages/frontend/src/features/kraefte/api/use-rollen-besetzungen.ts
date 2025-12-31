/**
 * Hook für die Abfrage der Rollen-Besetzungen eines Einsatzes.
 *
 * **Story 6.1c - Rollen-Übersicht:**
 * Lädt alle besetzten Rollen für das Dashboard mit Person-Zuordnung.
 */

import { useQuery } from '@tanstack/react-query';
import type { RollenBesetzungListItemDto } from '@bluelight-hub/shared/client';
import { api } from '@/shared/api/client';
import { logger } from '@/shared/lib/logger';
import { calculateRetryDelay, KRAEFTE_QUERY_KEYS } from './queries';

/**
 * Hook für die Abfrage der Rollen-Besetzungen.
 *
 * **Features:**
 * - Auto-Refresh alle 30 Sekunden (Live-Updates für Dashboard)
 * - Alphabetische Sortierung nach Rollenname (AC1)
 * - Disabled wenn keine einsatzId vorhanden
 * - Exponential Backoff bei Fehlern
 *
 * @param einsatzId - Die Einsatz-ID (optional)
 * @returns TanStack Query Result mit Rollen-Besetzungs-Daten
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useRollenBesetzungen(einsatzId);
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <ErrorMessage />;
 *
 * return <RollenListe rollen={data} />;
 * ```
 */
export const useRollenBesetzungen = (einsatzId: string | undefined) => {
  // einsatzId ist garantiert definiert wenn Query ausgeführt wird (enabled: !!einsatzId)
  const id = einsatzId as string;

  return useQuery({
    queryKey: KRAEFTE_QUERY_KEYS.rollen(id),
    queryFn: async (): Promise<RollenBesetzungListItemDto[]> => {
      try {
        const response = await api.rollenBesetzung().rollenBesetzungControllerFindAllVAlpha({
          einsatzId: id,
        });

        // API gibt nur besetzte Rollen zurück
        // Alphabetisch nach rollenName sortieren (AC1)
        const data = response.data ?? [];
        return data.sort((a, b) => a.rollenName.localeCompare(b.rollenName));
      } catch (error) {
        logger.error('Fehler beim Laden der Rollen-Besetzungen', error);
        throw error;
      }
    },
    enabled: !!einsatzId,
    staleTime: 30_000, // 30 Sekunden - Daten gelten als aktuell
    gcTime: 5 * 60 * 1000, // 5 Minuten - Cache-Retention für inaktive Queries
    refetchInterval: 30_000, // Auto-Refresh für Dashboard
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
};
