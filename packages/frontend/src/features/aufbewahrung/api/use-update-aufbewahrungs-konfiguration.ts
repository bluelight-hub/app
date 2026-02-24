/**
 * Mutation Hook fuer Aufbewahrungskonfiguration aktualisieren
 *
 * Aktualisiert die DSGVO-Aufbewahrungskonfiguration und invalidiert
 * automatisch Config- und Vorschau-Queries nach Erfolg.
 */

import { api } from '@/shared';
import type { AufbewahrungsKonfigurationDto, UpdateAufbewahrungsKonfigurationDto, ResponseError } from '@/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AUFBEWAHRUNG_QUERY_KEYS, calculateRetryDelay } from './queries';

/**
 * Hook zum Aktualisieren der Aufbewahrungskonfiguration
 *
 * Invalidiert nach Erfolg sowohl die Config- als auch die Vorschau-Query,
 * da sich bei Konfigurationsaenderungen die Vorschau aendert.
 *
 * @returns TanStack Mutation Result mit mutate/mutateAsync
 */
export function useUpdateAufbewahrungsKonfiguration() {
  const queryClient = useQueryClient();

  return useMutation<AufbewahrungsKonfigurationDto, ResponseError, UpdateAufbewahrungsKonfigurationDto>({
    mutationKey: ['aufbewahrung', 'update-config'],
    mutationFn: async (data) => {
      const response = await api.aufbewahrung().aufbewahrungControllerUpdateConfigVAlpha({
        updateAufbewahrungsKonfigurationDto: data,
      });
      return response.data;
    },
    onSuccess: async () => {
      // Config und Vorschau invalidieren da Aenderungen beide betreffen
      await Promise.all([queryClient.invalidateQueries({ queryKey: AUFBEWAHRUNG_QUERY_KEYS.config() }), queryClient.invalidateQueries({ queryKey: AUFBEWAHRUNG_QUERY_KEYS.vorschau() })]);
    },
    retry: 1,
    retryDelay: calculateRetryDelay,
  });
}
