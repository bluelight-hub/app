/**
 * TanStack-Query-Hook für die Export-Audit-Timeline eines Eigenschutz-Vorfalls
 * (Story 5.6).
 *
 * Konsumiert den generierten Client-Aufruf
 * `eigenschutzVorfallControllerGetVorfallAuditTimelineVAlpha`.
 */

import { useQuery } from '@tanstack/react-query';
import type { VorfallAuditTimelineEintragDto } from '@bluelight-hub/shared/client';
import { api } from '@/shared';
import { vorfallQueryKeys } from './use-report-vorfall';

const FIVE_SECONDS = 5 * 1000;

export type VorfallAuditTimelineEntry = VorfallAuditTimelineEintragDto;

export const vorfallAuditTimelineQueryKey = (einsatzId: string, vorfallId: string) => vorfallQueryKeys.auditTimeline(einsatzId, vorfallId);

export function useVorfallAuditTimeline(einsatzId: string | undefined, vorfallId: string | undefined) {
  return useQuery({
    queryKey: vorfallAuditTimelineQueryKey(einsatzId ?? '', vorfallId ?? ''),
    queryFn: async (): Promise<VorfallAuditTimelineEntry[]> => {
      const response = await api.eigenschutz().eigenschutzVorfallControllerGetVorfallAuditTimelineVAlpha({
        einsatzId: einsatzId!,
        vorfallId: vorfallId!,
      });
      return response.data.eintraege;
    },
    staleTime: FIVE_SECONDS,
    meta: { silentError: true },
    enabled: Boolean(einsatzId) && Boolean(vorfallId),
  });
}
