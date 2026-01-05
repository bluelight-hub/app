import { getBaseUrl } from '@/shared/api/api';
import { useQuery } from '@tanstack/react-query';
import { getMismatchSeverity, type MismatchSeverity } from '../utils/version';
import { SYSTEM_QUERY_KEYS } from './queries';

/**
 * Response-Struktur vom Root-Endpoint
 */
interface RootResponse {
  message: string;
  version?: string;
  endpoints: {
    api: string;
  };
}

/**
 * Ruft die Backend-Version vom Root-Endpoint ab
 *
 * Der generierte API-Client typisiert die Root-Response als void,
 * daher nutzen wir hier einen direkten fetch mit korrekter Typisierung.
 * Credentials werden für Konsistenz mit dem Rest der App mitgesendet.
 */
async function fetchBackendVersion(): Promise<string | undefined> {
  const response = await fetch(getBaseUrl(), {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch backend version: ${response.status}`);
  }

  const data: RootResponse = await response.json();
  return data.version;
}

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
  const query = useQuery({
    queryKey: SYSTEM_QUERY_KEYS.version(),
    queryFn: fetchBackendVersion,
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
