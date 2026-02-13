import { useMutation } from '@tanstack/react-query';
import { getBaseUrl } from '@/shared/api/api';
import { fetchWithRefresh } from '@/shared/api/fetchWithRefresh';

export type ExportFormat = 'pdf' | 'csv' | 'json';

interface ExportStatistikVariables {
  einsatzId: string;
  format: ExportFormat;
}

interface ExportStatistikResult {
  blob: Blob;
  filename: string;
}

/**
 * Hook fuer den Export von Erinnerungen-Statistiken.
 * Story 9.6: Statistiken nach Einsatz-Ende exportieren.
 *
 * HINWEIS: Manueller fetch statt generiertem Client,
 * da der API-Client kein Blob-Response unterstuetzt.
 */
export const useExportStatistik = () => {
  return useMutation<ExportStatistikResult, Error, ExportStatistikVariables>({
    mutationFn: async ({ einsatzId, format }) => {
      const baseUrl = getBaseUrl();
      const response = await fetchWithRefresh(`${baseUrl}/api/v-alpha/einsatz/${einsatzId}/erinnerungen/export?format=${format}`, { credentials: 'include' });
      if (!response.ok) {
        let errorMessage = 'Export fehlgeschlagen';
        try {
          const errorData = await response.json();
          errorMessage = errorData?.message || errorData?.error || errorMessage;
        } catch {
          const errorText = await response.text().catch(() => '');
          if (errorText) errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }
      const blob = await response.blob();
      // Dateiname aus Content-Disposition Header extrahieren
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] ?? `export.${format}`;
      return { blob, filename };
    },
  });
};
