/**
 * Alarmierungs-Query-Hooks (Issue #408).
 *
 * Liefern Liste, Detail und Timeline einer Einsatz-Alarmierung. Die Hooks
 * wrappen die generierte `AlarmierungApi` und liefern die Response im
 * Rohformat zurück (Wrapper mit `.data`, `.meta`). UI-Komponenten packen
 * `.data` bei Bedarf selbst aus — das entspricht dem Funkverkehr-Vorbild.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared';
import type { AlarmierungControllerCreateVAlpha201Response, AlarmierungControllerListVAlpha200Response, AlarmierungControllerTimelineVAlpha200Response } from '@bluelight-hub/shared/client';
import { AlarmierungControllerListVAlphaStatusEnum } from '@bluelight-hub/shared/client';
import type { AlarmierungStatusFilter } from '../stores/alarmierung.store';

/**
 * Query-Key-Factory für Alarmierungs-Queries.
 *
 * Hierarchische Struktur für granulare Cache-Invalidierung:
 * - `alarmierung` → alles (Notfall-Hammer)
 * - `alarmierung.list(einsatzId, filter)` → Alarmierungs-Liste pro Einsatz
 * - `alarmierung.detail(einsatzId, alarmierungId)` → einzelne Alarmierung
 * - `alarmierung.timeline(einsatzId)` → chronologische Timeline
 */
export const ALARMIERUNG_QUERY_KEYS = {
  all: ['alarmierung'] as const,
  list: (einsatzId: string, filter?: { status?: AlarmierungStatusFilter }) => ['alarmierung', 'list', einsatzId, filter ?? {}] as const,
  detail: (einsatzId: string, alarmierungId: string) => ['alarmierung', 'detail', einsatzId, alarmierungId] as const,
  timeline: (einsatzId: string) => ['alarmierung', 'timeline', einsatzId] as const,
};

export interface UseAlarmierungenOptions {
  einsatzId: string;
  filter?: { status?: AlarmierungStatusFilter };
  enabled?: boolean;
}

/**
 * Mappt den UI-Status-Filter auf das Backend-Enum.
 * `'alle'` → kein Filter (Backend liefert alles).
 */
function mapStatusFilter(status?: AlarmierungStatusFilter): AlarmierungControllerListVAlphaStatusEnum | undefined {
  if (!status || status === 'alle') return undefined;
  return status === 'aktiv' ? AlarmierungControllerListVAlphaStatusEnum.Aktiv : AlarmierungControllerListVAlphaStatusEnum.Abgeschlossen;
}

/**
 * Lädt alle Alarmierungen eines Einsatzes.
 */
export function useAlarmierungen({ einsatzId, filter, enabled = true }: UseAlarmierungenOptions) {
  const status = mapStatusFilter(filter?.status);
  return useQuery<AlarmierungControllerListVAlpha200Response>({
    enabled: enabled && Boolean(einsatzId),
    queryKey: ALARMIERUNG_QUERY_KEYS.list(einsatzId, filter),
    queryFn: () => api.alarmierung().alarmierungControllerListVAlpha({ einsatzId, status }),
    staleTime: 15_000,
  });
}

export interface UseAlarmierungOptions {
  einsatzId: string;
  alarmierungId: string;
  enabled?: boolean;
}

/**
 * Lädt eine einzelne Alarmierung inkl. Empfänger.
 */
export function useAlarmierung({ einsatzId, alarmierungId, enabled = true }: UseAlarmierungOptions) {
  return useQuery<AlarmierungControllerCreateVAlpha201Response>({
    enabled: enabled && Boolean(einsatzId) && Boolean(alarmierungId),
    queryKey: ALARMIERUNG_QUERY_KEYS.detail(einsatzId, alarmierungId),
    queryFn: () => api.alarmierung().alarmierungControllerGetByIdVAlpha({ einsatzId, alarmierungId }),
    staleTime: 15_000,
  });
}

export interface UseAlarmierungTimelineOptions {
  einsatzId: string;
  enabled?: boolean;
}

/**
 * Lädt die chronologische Timeline aller Alarmierungs-Events eines Einsatzes.
 */
export function useAlarmierungTimeline({ einsatzId, enabled = true }: UseAlarmierungTimelineOptions) {
  return useQuery<AlarmierungControllerTimelineVAlpha200Response>({
    enabled: enabled && Boolean(einsatzId),
    queryKey: ALARMIERUNG_QUERY_KEYS.timeline(einsatzId),
    queryFn: () => api.alarmierung().alarmierungControllerTimelineVAlpha({ einsatzId }),
    staleTime: 10_000,
  });
}
