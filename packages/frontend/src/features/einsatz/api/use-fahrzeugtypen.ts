/**
 * Query Hook für Fahrzeugtypen
 *
 * Lädt alle aktiven Fahrzeugtypen für die Auswahl bei temporären Fahrzeugen.
 *
 * @module features/einsatz/api
 */

import { api } from '@bluelight-hub/shared/client';
import { logger } from '@/shared/lib/logger';
import type { FahrzeugtypDto, ResponseError } from '@bluelight-hub/shared/client';
import { useQuery } from '@tanstack/react-query';

/**
 * Query Keys für Fahrzeugtypen
 */
export const FAHRZEUGTYP_QUERY_KEYS = {
  all: ['fahrzeugtypen'] as const,
  aktiv: () => [...FAHRZEUGTYP_QUERY_KEYS.all, 'aktiv'] as const,
} as const;

/**
 * Hook zum Laden aller aktiven Fahrzeugtypen
 *
 * Lädt Fahrzeugtypen sortiert nach `sortOrder` ASC für konsistente Darstellung
 * in Auswahl-Komponenten (z.B. Select, Combobox).
 *
 * @param options - Optionale Query-Optionen (enabled, staleTime, etc.)
 * @returns TanStack Query Result mit FahrzeugtypDto Array
 *
 * @example
 * ```tsx
 * const { data: fahrzeugtypen, isLoading } = useFahrzeugtypen();
 *
 * if (isLoading) return <Loading />;
 *
 * return (
 *   <select>
 *     {fahrzeugtypen?.map((typ) => (
 *       <option key={typ.id} value={typ.id}>
 *         {typ.code} - {typ.bezeichnung}
 *       </option>
 *     ))}
 *   </select>
 * );
 * ```
 */
export const useFahrzeugtypen = (options?: { enabled?: boolean }) => {
  return useQuery<FahrzeugtypDto[], ResponseError>({
    queryKey: FAHRZEUGTYP_QUERY_KEYS.aktiv(),
    queryFn: async () => {
      logger.debug('Fetching aktive Fahrzeugtypen');
      // Nutzt öffentlichen Endpoint (JwtAuthGuard statt AdminJwtAuthGuard)
      // Der Endpoint gibt bereits nur aktive Fahrzeugtypen zurück
      // WrappedResponse: { data: [...], meta: {...} }
      const response = await api.kraefteFahrzeugtypen().fahrzeugtypenControllerFindAllActiveVAlpha();
      return response.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 Minuten (Stammdaten ändern selten)
    retry: 2,
  });
};
