/**
 * TanStack-Query-Hook für `GET /api/einsaetze/:einsatzId/sicherheit/eigenschutz/vorfaelle/:vorfallId/export`
 * (Story 5.4, FR34).
 *
 * Der generierte Client liefert `Promise<void>` (siehe `kanalplan` Pattern),
 * weil das OpenAPI-Schema den binary Body nicht typisiert. Wir nutzen die
 * `*Raw`-Variante und lesen den Blob direkt aus der `Response`-Instanz —
 * identisch zum bestehenden Funkverkehr-Pattern (`mutations.ts:202`).
 */

import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '@/shared';
import { downloadExport } from '../lib/download-export';

export interface ExportVorfallVariables {
  readonly einsatzId: string;
  readonly vorfallId: string;
}

export interface ExportVorfallResult {
  readonly filename: string;
  readonly byteLength: number;
}

/**
 * Erzeugt den Dateinamen für den PDF-Export.
 *
 * Format: `vorfall-<sanitizedVorfallId>-YYYYMMDD-HHmm.pdf`. Sowohl Backend
 * (`format(new Date(), 'yyyyMMdd-HHmm')` in `EigenschutzVorfallController`)
 * als auch Frontend formatieren in der jeweiligen System-Zeitzone — die
 * Filenamen sind also innerhalb desselben TZ-Kontexts deterministisch
 * identisch. Cross-TZ-Drift ist akzeptiert (siehe Code-Review-Defer P12).
 *
 * Code-Review-Patch (P5): die `vorfallId` wird auf `[a-z0-9-]` reduziert,
 * damit eine fehlerhafte Route oder ein manipulierter Path-Param keine
 * Pfad-Trenner / Steuerzeichen in den Browser-Download-Namen einbringt.
 */
export function buildVorfallPdfFilename(vorfallId: string, now: Date = new Date()): string {
  const sanitized = vorfallId.replace(/[^a-z0-9-]/gi, '_');
  return `vorfall-${sanitized}-${format(now, 'yyyyMMdd-HHmm')}.pdf`;
}

export function useExportVorfallAlsPdf(): UseMutationResult<ExportVorfallResult, Error, ExportVorfallVariables> {
  return useMutation<ExportVorfallResult, Error, ExportVorfallVariables>({
    mutationKey: ['eigenschutz', 'vorfall', 'export-pdf'],
    mutationFn: async ({ einsatzId, vorfallId }) => {
      const response = await api.eigenschutz().eigenschutzVorfallControllerExportVorfallVAlphaRaw({
        einsatzId,
        vorfallId,
        format: 'pdf',
      });
      const blob = await response.raw.blob();
      const filename = buildVorfallPdfFilename(vorfallId);
      await downloadExport(blob, filename);
      return { filename, byteLength: blob.size };
    },
    // Pattern: Eigenschutz nutzt Inline-Banner statt Toast (UX-DR21 / Story 5.1).
    // Der Hook bleibt damit stillschweigend bei Fehlern; die Page rendert den
    // SeverityBanner basierend auf `isError`.
    meta: { silentError: true },
  });
}
