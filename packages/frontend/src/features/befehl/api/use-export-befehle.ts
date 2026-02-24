import { useState, useCallback } from 'react';
import { fetchWithRefresh } from '@/shared/api/fetchWithRefresh';
import { toast } from 'sonner';

/**
 * Hook fuer den Export von Befehlen als CSV oder JSON.
 *
 * Nutzt fetchWithRefresh direkt (nicht den generierten API-Client),
 * da der Response ein Blob (Datei-Download) ist.
 */
export function useExportBefehle() {
  const [isExporting, setIsExporting] = useState(false);

  const exportBefehle = useCallback(async (einsatzId: string, format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const url = `/api/v-alpha/befehle/export?einsatzId=${encodeURIComponent(einsatzId)}&format=${format}`;
      const response = await fetchWithRefresh(url);

      if (!response.ok) {
        throw new Error(`Export fehlgeschlagen: ${response.status}`);
      }

      const blob = await response.blob();

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `befehle_export.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
        if (match) filename = match[1];
      }

      // Trigger download via hidden anchor element
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Verzoegertes Revoke: Safari initiiert Downloads asynchron,
      // synchrones Revoke kann den Download lautlos abbrechen.
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);

      toast.success('Export erfolgreich', { description: `${filename} heruntergeladen` });
      return filename;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast.error('Export fehlgeschlagen', { description: message });
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportBefehle, isExporting };
}
