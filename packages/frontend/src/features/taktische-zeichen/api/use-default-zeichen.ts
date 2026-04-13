/**
 * Hooks zum Laden der Default-Zeichen-Konfiguration (Fahrzeugtypen und Einheitentypen).
 *
 * Nutzt die GET-Endpoints `/taktische-zeichen/defaults/fahrzeugtypen` und
 * `/taktische-zeichen/defaults/einheitentypen` für typisierte Responses.
 */

import { useQuery } from '@tanstack/react-query';
import type { DefaultZeichenResponseDto } from '@bluelight-hub/shared/client';
import { api } from '@/shared/api/api';
import type { ResponseError } from '@/shared/api/errors';
import { TAKTISCHE_ZEICHEN_QUERY_KEYS, calculateRetryDelay } from './queries';

/**
 * Lädt alle Default-Zeichen für Fahrzeugtypen.
 * StaleTime: 5 Minuten (Defaults ändern sich selten).
 */
export function useDefaultZeichenFahrzeugtypen() {
  return useQuery<DefaultZeichenResponseDto[], ResponseError>({
    queryKey: TAKTISCHE_ZEICHEN_QUERY_KEYS.defaultsFahrzeugtypen(),
    queryFn: async () => {
      const response = await api.taktischeZeichen().taktischeZeichenControllerGetDefaultsFahrzeugtypenVAlpha();
      return response.data;
    },
    staleTime: 5 * 60_000,
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
}

/**
 * Lädt alle Default-Zeichen für Einheitentypen.
 * StaleTime: 5 Minuten (Defaults ändern sich selten).
 */
export function useDefaultZeichenEinheitentypen() {
  return useQuery<DefaultZeichenResponseDto[], ResponseError>({
    queryKey: TAKTISCHE_ZEICHEN_QUERY_KEYS.defaultsEinheitentypen(),
    queryFn: async () => {
      const response = await api.taktischeZeichen().taktischeZeichenControllerGetDefaultsEinheitentypenVAlpha();
      return response.data;
    },
    staleTime: 5 * 60_000,
    retry: 3,
    retryDelay: calculateRetryDelay,
  });
}
