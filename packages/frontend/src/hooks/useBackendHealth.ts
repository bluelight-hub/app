import { useState, useEffect } from 'react';
import { api } from '../api';
import { logger } from '../utils/logger';

export type ConnectionStatus = 'checking' | 'online' | 'offline' | 'error';

interface BackendHealthState {
  isHealthy: boolean;
  isLoading: boolean;
  error?: string;
  lastChecked?: Date;
}

/**
 * Hook zur Überwachung der Backend-Verfügbarkeit
 *
 * Führt einen Health-Check durch und überwacht die Verbindung zum Backend.
 * Zeigt entsprechende Fehlermeldungen an, wenn das Backend nicht erreichbar ist.
 */
export const useBackendHealth = (checkOnMount = true) => {
  const [state, setState] = useState<BackendHealthState>({
    isHealthy: false,
    isLoading: false,
  });

  const checkHealth = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: undefined }));

    try {
      await api.health.healthControllerCheckLiveness();
      setState((prev) => ({
        ...prev,
        isHealthy: true,
        isLoading: false,
        lastChecked: new Date(),
      }));
      logger.debug('Backend health check passed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Backend ist nicht erreichbar';
      setState((prev) => ({
        ...prev,
        isHealthy: false,
        isLoading: false,
        error: errorMessage,
        lastChecked: new Date(),
      }));
      logger.warn('Backend health check failed', { error: errorMessage });
    }
  };

  useEffect(() => {
    if (checkOnMount) {
      checkHealth();
    }
  }, [checkOnMount]);

  // Zusätzliche Methoden für StatusIndicator-Kompatibilität
  const getConnectionStatus = (): ConnectionStatus => {
    if (state.isLoading) return 'checking';
    if (state.isHealthy) return 'online';
    return 'error';
  };

  const getSystemDetailsText = (): string => {
    if (state.lastChecked) {
      return `Letzte Prüfung: ${state.lastChecked.toLocaleTimeString()}`;
    }
    return 'Noch nicht geprüft';
  };

  const getDebugInfo = (): string => {
    return JSON.stringify(
      {
        isHealthy: state.isHealthy,
        isLoading: state.isLoading,
        error: state.error,
        lastChecked: state.lastChecked?.toISOString(),
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    );
  };

  return {
    ...state,
    checkHealth,
    getConnectionStatus,
    getSystemDetailsText,
    getDebugInfo,
  };
};
