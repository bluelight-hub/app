/**
 * Health-Check Hook für Server-Verbindungsprüfung
 *
 * Prüft vor dem Exchange, ob ein Server erreichbar ist.
 * Implementiert 5-Sekunden Timeout gemäß NFR-P4.
 *
 * **Features:**
 * - Temporärer API-Client für beliebige Server-URL
 * - 5-Sekunden Timeout via AbortController
 * - Klare Fehler-Unterscheidung (TIMEOUT vs. Netzwerkfehler)
 * - Cleanup bei Unmount (verhindert Memory Leaks)
 *
 * **Integration:**
 * - ServerSetupForm: vor Exchange-Mutation aufrufen (AC3)
 * - Bei Timeout: "Server nicht erreichbar" anzeigen (AC4)
 */

import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Configuration, HealthApi } from '@bluelight-hub/shared/client';
import { logger } from '@/shared/lib/logger';

/** Timeout in Millisekunden (NFR-P4: 5 Sekunden) */
const HEALTH_CHECK_TIMEOUT_MS = 5000;

/**
 * Alle moeglichen Health-Check Fehlertypen
 */
export type HealthCheckErrorType = 'TIMEOUT' | 'NETWORK' | 'SERVER_ERROR' | 'CLIENT_ERROR' | 'UNKNOWN';

/**
 * Health-Check Error mit spezifischem Typ für UI-Handling
 */
export class HealthCheckError extends Error {
  constructor(
    message: string,
    public readonly type: HealthCheckErrorType,
  ) {
    super(message);
    this.name = 'HealthCheckError';
  }
}

/**
 * Input für Health-Check Mutation
 */
export interface HealthCheckInput {
  /** Die Server-URL zum Prüfen (mit oder ohne trailing slash) */
  serverUrl: string;
}

/**
 * Health-Check Response
 *
 * Kombiniert Common Fields (BasicHealthDto) und optionale Fields (DetailedHealthDto).
 * HINWEIS: serverName existiert NICHT in der API - wird separat aus /system/info geladen.
 */
export interface HealthCheckResult {
  /** Server ist erreichbar */
  isHealthy: boolean;
  /** Server-Status aus Response */
  status: 'ok' | 'error';
  /** Ob das Server-Setup abgeschlossen ist (Admin + Token existieren) */
  setupComplete: boolean;
  /** Aktuelle Server-Version */
  version: string;
  /** Datenbank-Status (nur in DetailedHealthDto) */
  database?: 'connected' | 'disconnected';
  /** Uptime in Sekunden (nur in DetailedHealthDto) */
  uptime?: number;
  /** Memory-Statistiken (nur in DetailedHealthDto) - API gibt object zurück */
  memory?: object;
  /** Load Average [1min, 5min, 15min] (nur in DetailedHealthDto) */
  loadAverage?: string[];
}

/**
 * Hook für Server Health-Check
 *
 * Prüft ob ein Server erreichbar ist, bevor der Exchange durchgeführt wird.
 * Verwendet 5-Sekunden Timeout gemäß NFR-P4.
 *
 * **Cleanup-Verhalten:**
 * - AbortController und Timeout werden in Refs gespeichert
 * - Bei Unmount werden laufende Requests abgebrochen und Timeouts gelöscht
 * - Verhindert State-Updates auf unmounted Components und Memory Leaks
 *
 * @returns TanStack Mutation Result mit mutate/mutateAsync
 *
 * @example
 * ```tsx
 * const healthCheck = useHealthCheck();
 *
 * const handleSubmit = async (serverUrl: string, inviteCode: string) => {
 *   try {
 *     // 1. Erst Health-Check
 *     await healthCheck.mutateAsync({ serverUrl });
 *
 *     // 2. Dann Exchange (nur wenn Health-Check erfolgreich)
 *     await exchangeInvite.mutateAsync({ inviteCode, serverUrl });
 *   } catch (error) {
 *     if (error instanceof HealthCheckError) {
 *       if (error.type === 'TIMEOUT') {
 *         setError('Server antwortet nicht (Timeout)');
 *       } else {
 *         setError('Server nicht erreichbar');
 *       }
 *     }
 *   }
 * };
 * ```
 */
export function useHealthCheck() {
  // Refs für Cleanup bei Unmount - verhindert Memory Leaks und State-Updates auf unmounted Components
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup bei Unmount: Laufende Requests abbrechen und Timeouts löschen
  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  return useMutation<HealthCheckResult, HealthCheckError, HealthCheckInput>({
    mutationFn: async ({ serverUrl }: HealthCheckInput) => {
      logger.debug('Starting health check', { serverUrl });

      // Vorherigen Request abbrechen falls noch aktiv (z.B. bei schnellem Re-Submit)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }

      // Neuen AbortController erstellen und in Ref speichern
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Timeout erstellen und in Ref speichern für Cleanup
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, HEALTH_CHECK_TIMEOUT_MS);
      timeoutIdRef.current = timeoutId;

      try {
        // Temporärer API-Client für die angegebene Server-URL
        const normalizedUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
        const tempConfig = new Configuration({ basePath: normalizedUrl });
        const healthApi = new HealthApi(tempConfig);

        // Health-Check Request mit AbortSignal
        const response = await healthApi.healthControllerCheck({
          signal: controller.signal,
        });

        logger.debug('Health check successful', {
          serverUrl,
          status: response.status,
          setupComplete: response.setupComplete,
          version: response.version,
        });

        // C2 FIX: Alle Fields durchreichen (BasicHealthDto + DetailedHealthDto Union Type)
        return {
          isHealthy: response.status === 'ok',
          status: response.status,
          setupComplete: response.setupComplete,
          version: response.version,
          // Optional fields (nur in DetailedHealthDto vorhanden)
          database: 'database' in response ? response.database : undefined,
          uptime: 'uptime' in response ? response.uptime : undefined,
          memory: 'memory' in response ? response.memory : undefined,
          loadAverage: 'loadAverage' in response ? response.loadAverage : undefined,
        };
      } catch (error) {
        // H1: HTTP Response Errors (ResponseError vom generierten Client)
        if (error && typeof error === 'object' && 'response' in error) {
          const responseError = error as { response: Response };
          const status = responseError.response?.status;
          if (status && status >= 500) {
            logger.error('Health check server error', { serverUrl, status });
            throw new HealthCheckError('Server hat einen internen Fehler', 'SERVER_ERROR');
          } else if (status && status >= 400) {
            logger.warn('Health check client error', { serverUrl, status });
            throw new HealthCheckError('Ungültige Anfrage an den Server', 'CLIENT_ERROR');
          }
        }

        // Fehlertyp bestimmen
        if (error instanceof Error) {
          // AbortError = Timeout (AbortController.abort() wurde aufgerufen)
          if (error.name === 'AbortError') {
            logger.warn('Health check timeout', { serverUrl, timeoutMs: HEALTH_CHECK_TIMEOUT_MS });
            throw new HealthCheckError('Server antwortet nicht (Timeout)', 'TIMEOUT');
          }

          // TypeError bei Netzwerkproblemen (fetch failed, CORS, etc.)
          if (error.name === 'TypeError') {
            logger.warn('Health check network error', { serverUrl, error: error.message });
            throw new HealthCheckError('Server nicht erreichbar', 'NETWORK');
          }

          // Anderer Fehler
          logger.error('Health check failed', { serverUrl, error: error.message });
          throw new HealthCheckError(error.message, 'UNKNOWN');
        }

        // Unbekannter Fehlertyp
        logger.error('Health check failed with unknown error', { serverUrl, error });
        throw new HealthCheckError('Unbekannter Fehler', 'UNKNOWN');
      } finally {
        // Timeout cleanup nach Request (erfolgreich oder fehlgeschlagen)
        clearTimeout(timeoutId);
        timeoutIdRef.current = null;
        // AbortController Ref NICHT clearen - wird bei Unmount oder nächstem Request behandelt
      }
    },

    // Kein retry - bei Timeout/Netzwerkfehler sofort Feedback geben
    retry: false,
  });
}

/**
 * Exportierte Konstante für Tests
 */
export { HEALTH_CHECK_TIMEOUT_MS };
