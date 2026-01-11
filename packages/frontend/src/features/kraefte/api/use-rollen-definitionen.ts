/**
 * Hook fuer die Abfrage aller RollenDefinitionen (aktiv).
 *
 * Liefert die Liste aller konfigurierten RollenDefinitionen sortiert nach
 * sortOrder und Namen, damit sie im Rollen-Picker verwendet werden kann.
 *
 * Nutzt den oeffentlichen Endpunkt (nicht Admin), damit alle authentifizierten
 * User Zugriff haben (z.B. fuer den BesetzeRolleDialog).
 */

import { useQuery } from '@tanstack/react-query';
import type { ResponseError, RollenDefinitionDto } from '@/shared';

import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';

import { KRAEFTE_QUERY_KEYS, calculateRetryDelay } from './queries';

const sortRollenDefinitionen = (rollen: RollenDefinitionDto[]): RollenDefinitionDto[] =>
  [...rollen].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name, 'de');
  });

export const useRollenDefinitionen = (options?: { enabled?: boolean }) => {
  return useQuery<RollenDefinitionDto[], ResponseError>({
    queryKey: KRAEFTE_QUERY_KEYS.rollenDefinitionen(),
    queryFn: async () => {
      // Nutzt den oeffentlichen Endpunkt (nicht Admin) fuer alle authentifizierten User
      const response = await api.kraefteRollenDefinitionen().rollenDefinitionenControllerFindAllActiveVAlpha();
      const rollen = response.data ?? [];
      return sortRollenDefinitionen(rollen);
    },
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
    retry: 3,
    retryDelay: calculateRetryDelay,
    onError: (error) => {
      logger.error('Fehler beim Laden der RollenDefinitionen', error);
    },
  });
};
