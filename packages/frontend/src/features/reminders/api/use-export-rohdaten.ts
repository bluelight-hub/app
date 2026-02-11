import { useMutation } from '@tanstack/react-query';
import { getBaseUrl } from '@/shared/api/api';
import { fetchWithRefresh } from '@/shared/api/fetchWithRefresh';

export type RohdatenExportFormat = 'csv' | 'json';

interface ExportRohdatenVariables {
  einsatzId: string;
  format: RohdatenExportFormat;
}

interface ExportRohdatenResult {
  blob: Blob;
  filename: string;
}

/**
 * Hook fuer den Export von Erinnerungs-Rohdaten.
 * Story 9.10: Rohdaten als CSV/JSON exportieren.
 *
 * HINWEIS: Manueller fetch statt generiertem Client,
 * da der API-Client kein Blob-Response unterstuetzt.
 */
export const useExportRohdaten = () => {
  return useMutation<ExportRohdatenResult, Error, ExportRohdatenVariables>({
    mutationFn: async ({ einsatzId, format }) => {
      const baseUrl = getBaseUrl();
      const response = await fetchWithRefresh(`${baseUrl}/api/v-alpha/einsatz/${einsatzId}/erinnerungen/export/rohdaten?format=${format}`, { credentials: 'include' });
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
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] ?? `rohdaten.${format}`;
      return { blob, filename };
    },
  });
};
