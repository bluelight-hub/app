/**
 * Hook für Health-Checks aller konfigurierten Server
 *
 * Prüft bei Mount und Server-Listen-Änderungen den Verbindungsstatus
 * aller Server und aktualisiert die connectionStatus Map im Store.
 *
 * **Features:**
 * - Parallele Health-Checks für alle Server
 * - 5-Sekunden Timeout pro Server (NFR-P4)
 * - Automatische Status-Updates im Server-Store
 *
 * @module features/server/hooks/use-server-list-health
 */

import { useEffect, useRef } from 'react';
import { useStore } from '@tanstack/react-store';
import { Configuration, HealthApi } from '@bluelight-hub/shared/client';
import { serverStore, updateConnectionStatus } from '../stores/server.store';
import { logger } from '@/shared/lib/logger';

/** Timeout in Millisekunden (NFR-P4: 5 Sekunden) */
const HEALTH_CHECK_TIMEOUT_MS = 5000;

/**
 * Führt einen Health-Check für einen einzelnen Server durch.
 *
 * @param serverUrl - Die URL des Servers
 * @param signal - AbortSignal für Timeout-Handling
 * @returns true wenn Server erreichbar, false sonst
 */
async function checkServerHealth(serverUrl: string, signal: AbortSignal): Promise<boolean> {
  try {
    const normalizedUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
    const tempConfig = new Configuration({ basePath: normalizedUrl });
    const healthApi = new HealthApi(tempConfig);

    const response = await healthApi.healthControllerCheck({ signal });
    return response.status === 'ok';
  } catch {
    return false;
  }
}

/**
 * Hook zum Prüfen des Verbindungsstatus aller Server
 *
 * Führt bei Mount und bei Änderungen der Server-Liste Health-Checks
 * für alle konfigurierten Server durch und aktualisiert den Store.
 *
 * @example
 * ```tsx
 * function LoginWindow() {
 *   // Aktiviert Health-Checks für alle Server in der Liste
 *   useServerListHealth();
 *
 *   const connectionStatus = useStore(serverStore, (s) => s.connectionStatus);
 *   // connectionStatus ist jetzt befüllt mit 'connected' | 'disconnected' | 'checking'
 * }
 * ```
 */
export function useServerListHealth(): void {
  const servers = useStore(serverStore, (state) => state.servers);
  const isHydrated = useStore(serverStore, (state) => state.isHydrated);

  // Ref um laufende Checks zu tracken und bei Cleanup abzubrechen
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Warte auf Store-Hydration
    if (!isHydrated || servers.length === 0) {
      return;
    }

    // Vorherige Checks abbrechen
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const checkAllServers = async () => {
      logger.debug('[ServerListHealth] Starting health checks', {
        serverCount: servers.length,
        servers: servers.map((s) => s.name),
      });

      // Alle Server auf 'checking' setzen
      for (const server of servers) {
        updateConnectionStatus(server.id, 'checking');
      }

      // Parallele Health-Checks mit individuellem Timeout
      const results = await Promise.allSettled(
        servers.map(async (server) => {
          // Individueller AbortController pro Server für Timeout
          const timeoutController = new AbortController();
          const timeoutId = setTimeout(() => {
            timeoutController.abort();
          }, HEALTH_CHECK_TIMEOUT_MS);

          // Kombiniere globalen Abort mit Timeout
          const handleAbort = () => timeoutController.abort();
          controller.signal.addEventListener('abort', handleAbort, { once: true });

          try {
            const isHealthy = await checkServerHealth(server.url, timeoutController.signal);
            return { serverId: server.id, serverName: server.name, isHealthy };
          } finally {
            clearTimeout(timeoutId);
            controller.signal.removeEventListener('abort', handleAbort);
          }
        }),
      );

      // Nur Status updaten wenn nicht abgebrochen
      if (controller.signal.aborted) {
        logger.debug('[ServerListHealth] Checks aborted, skipping status update');
        return;
      }

      // Ergebnisse verarbeiten
      for (const result of results) {
        if (controller.signal.aborted) break;
        if (result.status === 'fulfilled') {
          const { serverId, serverName, isHealthy } = result.value;
          const status = isHealthy ? 'connected' : 'disconnected';
          updateConnectionStatus(serverId, status);
          logger.debug('[ServerListHealth] Server check complete', {
            server: serverName,
            status,
          });
        }
      }

      logger.debug('[ServerListHealth] All health checks complete');
    };

    checkAllServers();

    // Cleanup: Laufende Checks abbrechen
    return () => {
      controller.abort();
      abortControllerRef.current = null;
    };
  }, [isHydrated, servers]);
}
