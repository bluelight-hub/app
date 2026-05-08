/**
 * TanStack-Query-Hook für `GET /api/einsaetze/:einsatzId/sicherheit/eigenschutz/vorfaelle/:vorfallId/export?format=json`
 * (Story 5.5, FR35).
 *
 * Pattern 1:1 zu `useExportVorfallAlsPdf`: nutzt die `*Raw`-Variante des
 * generierten Clients, weil das OpenAPI-Schema den Body als binär (`void`)
 * typisiert. Das Frontend liest den Blob direkt aus der `Response`-Instanz
 * und reicht ihn an den Format-agnostischen `downloadExport`-Helper durch —
 * keine eigene `JSON.parse`-Pipeline, kein Roundtrip-Encoding-Risiko.
 */

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '@/shared';
import { downloadExport } from '../lib/download-export';
import { vorfallQueryKeys } from './use-report-vorfall';

export interface ExportVorfallJsonVariables {
  readonly einsatzId: string;
  readonly vorfallId: string;
}

export interface ExportVorfallJsonResult {
  readonly filename: string;
  readonly byteLength: number;
}

/**
 * Erzeugt den Dateinamen für den JSON-Export.
 *
 * Format: `vorfall-<sanitizedVorfallId>-YYYYMMDD-HHmm.json`. Backend
 * generiert in der `Content-Disposition` denselben Filename in Server-TZ;
 * Cross-TZ-Drift ist akzeptiert (selbe Defer-Entscheidung wie P12 in 5.4).
 *
 * Sanitization (Story 5.4 P5): `vorfallId` wird auf `[a-z0-9-]` reduziert,
 * damit Pfad-Trenner / Steuerzeichen nicht in den Browser-Download-Namen
 * gelangen.
 */
export function buildVorfallJsonFilename(vorfallId: string, now: Date = new Date()): string {
  const sanitized = vorfallId.replace(/[^a-z0-9-]/gi, '_');
  return `vorfall-${sanitized}-${format(now, 'yyyyMMdd-HHmm')}.json`;
}

export function useExportVorfallAlsJson(): UseMutationResult<ExportVorfallJsonResult, Error, ExportVorfallJsonVariables> {
  const queryClient = useQueryClient();

  return useMutation<ExportVorfallJsonResult, Error, ExportVorfallJsonVariables>({
    mutationKey: ['eigenschutz', 'vorfall', 'export-json'],
    mutationFn: async ({ einsatzId, vorfallId }) => {
      const response = await api.eigenschutz().eigenschutzVorfallControllerExportVorfallVAlphaRaw({
        einsatzId,
        vorfallId,
        format: 'json',
      });

      try {
        const blob = await response.raw.blob();
        const filename = buildVorfallJsonFilename(vorfallId);
        await downloadExport(blob, filename);
        return { filename, byteLength: blob.size };
      } finally {
        void queryClient.invalidateQueries({ queryKey: vorfallQueryKeys.auditTimeline(einsatzId, vorfallId) });
      }
    },
    // Inline-Banner statt Toast (UX-DR21 / Story 5.1).
    meta: { silentError: true },
  });
}
