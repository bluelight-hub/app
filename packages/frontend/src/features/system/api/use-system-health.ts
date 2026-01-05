import { api } from '@/shared/api/api';
import { useQuery } from '@tanstack/react-query';
import { milliseconds } from 'date-fns';
import { SYSTEM_QUERY_KEYS } from './queries';

/**
 * Mögliche Verbindungsstatus-Werte vom Backend
 */
export type ConnectionMode = 'checking' | 'online' | 'offline' | 'error';

/**
 * Erweiterter Typ für Health Response mit connection_status
 *
 * Der generierte API-Client typisiert details als Record<string, any>.
 * Dieser Typ definiert die tatsächliche Struktur.
 */
interface ConnectionStatusDetails {
  connection_status?: {
    status: string;
    details?: {
      mode?: ConnectionMode;
    };
  };
}

/**
 * Hook zum Abrufen des System-Health-Status
 *
 * Ruft alle 30 Sekunden den Health-Endpoint ab und extrahiert
 * den Connection-Mode für die UI-Anzeige.
 *
 * Nutzt Grace Period (retry: 3) - erst nach 3 fehlgeschlagenen Requests
 * wird `error` angezeigt.
 *
 * @returns Query-Ergebnis mit connectionMode und isLoading
 *
 * @example
 * ```tsx
 * const { connectionMode, isLoading, isError } = useSystemHealth();
 *
 * if (isLoading) return <Indicator status="checking" />;
 * if (isError) return <Indicator status="error" />;
 *
 * return <Indicator status={connectionMode} />;
 * ```
 */
export const useSystemHealth = () => {
  const query = useQuery({
    queryKey: SYSTEM_QUERY_KEYS.health(),
    queryFn: () => api.health().healthControllerCheck(),
    staleTime: milliseconds({ seconds: 25 }),
    refetchInterval: milliseconds({ seconds: 30 }),
    retry: 3,
    refetchOnWindowFocus: true,
  });

  // F2: Sichere Extraktion der Details mit Null-Checks statt unsicherer Type Assertion
  const rawDetails = query.data?.details;
  const details: ConnectionStatusDetails | undefined = rawDetails && typeof rawDetails === 'object' ? (rawDetails as ConnectionStatusDetails) : undefined;

  // F1: Korrekte Priorisierung des Query-States
  // 1. isError → 'error' (API-Aufruf fehlgeschlagen nach retries)
  // 2. isLoading → 'checking' (initiales Laden oder refetch)
  // 3. API-Daten → mode aus Response
  // 4. Fallback → 'online' (API erfolgreich, aber kein mode - Backend ist erreichbar)
  const connectionMode: ConnectionMode = query.isError ? 'error' : query.isLoading ? 'checking' : (details?.connection_status?.details?.mode ?? 'online');

  return {
    connectionMode,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    query,
  };
};
