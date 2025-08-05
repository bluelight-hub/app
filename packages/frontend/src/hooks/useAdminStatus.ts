import { useQuery } from '@tanstack/react-query';
import type { AdminStatusDto } from '@bluelight-hub/shared/client';
import { BackendApi } from '@/api/api';

/**
 * Hook zum Abrufen des Admin-Setup-Status
 *
 * Prüft ob:
 * - Ein Admin-Setup verfügbar ist
 * - Bereits ein Admin existiert
 * - Der aktuelle Benutzer berechtigt ist
 */
export function useAdminStatus() {
  const api = new BackendApi();

  return useQuery<AdminStatusDto>({
    queryKey: ['admin', 'status'],
    queryFn: async () => {
      return await api.auth().authControllerGetAdminStatus();
    },
    // Nur alle 30 Sekunden neu abrufen, da sich der Status selten ändert
    staleTime: 30000,
    // Fehler still behandeln (z.B. wenn User nicht eingeloggt ist)
    throwOnError: false,
  });
}
