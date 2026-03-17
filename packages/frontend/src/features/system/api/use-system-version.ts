import { fetchBackendVersion } from '@/shared/api/backend-root';
import { serverStore } from '@/features/server/stores/server.store';
import { normalizeServerBaseUrl } from '@/shared/api/server-scoped-clients';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '@tanstack/react-store';
import { getMismatchSeverity, type MismatchSeverity } from '../utils/version';
import { SYSTEM_QUERY_KEYS } from './queries';

/**
 * Hook zum Abrufen und Vergleichen von Frontend- und Backend-Version
 *
 * Holt die Backend-Version vom Root-Endpoint und vergleicht sie
 * mit der Frontend-Version (`__APP_VERSION__` aus Vite define).
 *
 * @returns Query-Ergebnis mit Versions und Mismatch-Severity
 *
 * @example
 * ```tsx
 * const { frontendVersion, backendVersion, mismatchSeverity } = useSystemVersion();
 *
 * if (mismatchSeverity === 'critical') {
 *   return <Banner>Update erforderlich!</Banner>;
 * }
 * ```
 */
export const useSystemVersion = () => {
  const isHydrated = useStore(serverStore, (state) => state.isHydrated);
  const activeServerUrl = useStore(serverStore, (state) => {
    if (!state.activeServerId) {
      return null;
    }

    const activeServer = state.servers.find((server) => server.id === state.activeServerId);
    return activeServer ? normalizeServerBaseUrl(activeServer.url) : null;
  });
  const serverScope = activeServerUrl ?? 'unconfigured';
  const isServerConfigured = isHydrated && activeServerUrl !== null;

  const query = useQuery({
    queryKey: SYSTEM_QUERY_KEYS.version(serverScope),
    queryFn: () => fetchBackendVersion(activeServerUrl as string),
    // Nur ausführen wenn Server konfiguriert - verhindert SyntaxError bei leerem URL
    enabled: isServerConfigured,
    // Version ändert sich nicht während einer Session, daher nie als stale markieren
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const frontendVersion = __APP_VERSION__;
  const backendVersion = query.data ?? undefined;

  const mismatchSeverity: MismatchSeverity = backendVersion && frontendVersion ? getMismatchSeverity(frontendVersion, backendVersion) : 'none';

  return {
    frontendVersion,
    backendVersion,
    mismatchSeverity,
    isLoading: query.isLoading,
    isError: query.isError,
    query,
  };
};
