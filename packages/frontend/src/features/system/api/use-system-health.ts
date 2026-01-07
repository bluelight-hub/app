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
 * Rückgabetyp des useSystemHealth Hooks
 */
export interface SystemHealthResult {
  /** Aktueller Verbindungsstatus */
  connectionMode: ConnectionMode;
  /** Ob der Server im INSECURE_MODE läuft (Development only) */
  insecureMode: boolean;
  /** Ob Setup abgeschlossen ist */
  setupComplete: boolean;
  /** Backend-Version */
  version: string | null;
  /** Ob der initiale Request noch läuft */
  isLoading: boolean;
  /** Ob ein Fehler aufgetreten ist */
  isError: boolean;
  /** Fehlerdetails */
  error: Error | null;
  /** Zugriff auf die vollständige Query */
  query: ReturnType<typeof useQuery>;
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

  // Extrahiere insecureMode, setupComplete und version aus der Health Response
  // Der generierte API-Client typisiert die Response jetzt korrekt als BasicHealthDto | DetailedHealthDto
  const insecureMode = query.data?.insecureMode ?? false;
  const setupComplete = query.data?.setupComplete ?? false;
  const version = query.data?.version ?? null;

  return {
    connectionMode,
    insecureMode,
    setupComplete,
    version,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    query,
  };
};
