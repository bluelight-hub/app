import { HealthControllerCheck200Response } from '@bluelight-hub/shared/client';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getBaseUrl } from '../utils/fetch';
import { logger } from '../utils/logger';

/**
 * Mögliche Verbindungszustände basierend auf ADR-001
 */
export type ConnectionStatus = 'checking' | 'online' | 'offline' | 'error';

/**
 * Hook zur Überwachung des Backend-Gesundheitsstatus
 *
 * Prüft regelmäßig den Verbindungsstatus des Backends und berechnet den
 * aktuellen Betriebsmodus (online, offline, error).
 *
 * @returns Backend-Gesundheitsdaten und aktuelle Verbindungsinformationen
 */
export const useBackendHealth = () => {
  const { data, isError, isLoading } = useQuery<HealthControllerCheck200Response>({
    queryKey: ['backendHealth'],
    queryFn: async () => {
      try {
        logger.debug('StatusIndicator checking health endpoint');
        // Attempt to get response from backend
        const response = await fetch(`${getBaseUrl()}/api/health`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        });

        const data = (await response.json()) as HealthControllerCheck200Response;
        if (!response.ok) {
          logger.warn('StatusIndicator received error response', {
            status: data.status,
            details: data.details,
          });
        } else {
          logger.info('StatusIndicator health check successful', {
            status: data.status,
            details: data.details,
          });
        }
        return data;
      } catch (error) {
        logger.error('StatusIndicator unexpected error', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    refetchInterval: 30000, // Check every 30 seconds
    retry: 3,
    retryDelay: 1000,
  });

  const getConnectionStatus = useCallback((): ConnectionStatus => {
    if (isLoading) return 'checking';
    if (isError) return 'error';
    if (!data || !data.details) return 'error';

    // Wenn der Backend-Controller einen expliziten connection_status liefert, verwenden wir diesen
    const connectionStatus = data.details['connection_status'];
    if (connectionStatus?.details?.mode) {
      // Der Backend-Controller liefert direkt den Verbindungsstatus
      const mode = connectionStatus.details.mode;
      if (mode === 'online' || mode === 'offline' || mode === 'error') {
        return mode;
      }
    }

    // Alternativ leiten wir den Status aus den einzelnen Komponenten ab
    const hasInternetConnection = data.details['internet']?.status === 'up';
    const hasFuekwConnection = data.details['fuekw']?.status === 'up';

    if (hasInternetConnection && hasFuekwConnection) {
      return 'online';
    } else if (hasFuekwConnection) {
      return 'offline';
    }

    return 'error';
  }, [data, isError, isLoading]);

  /**
   * Erzeugt einen formatierten String mit dem Systemstatus
   *
   * @returns String mit dem Status der einzelnen Systeme
   */
  const getSystemDetailsText = useCallback((): string => {
    if (!data || !data.details) return 'Keine Details verfügbar';

    return Object.entries(data.details)
      .map(([system, info]) => `${system}: ${info.status === 'up' ? '✅' : '❌'}`)
      .join('\n');
  }, [data]);

  /**
   * Erzeugt ein Debug-Info-Objekt für Diagnosezwecke
   *
   * @returns JSON-String mit allen Debug-Informationen
   */
  const getDebugInfo = useCallback((): string => {
    if (!data) return '';

    return JSON.stringify(
      {
        status: getConnectionStatus(),
        details: data.details,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    );
  }, [data, getConnectionStatus]);

  return {
    data,
    isError,
    isLoading,
    getConnectionStatus,
    getSystemDetailsText,
    getDebugInfo,
  };
};
