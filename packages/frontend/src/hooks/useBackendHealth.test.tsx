import { renderHook, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../utils/logger';
import { useBackendHealth } from './useBackendHealth';

// Mock des Loggers
vi.mock('../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock für das API-Modul
vi.mock('../api', () => ({
  api: {
    health: {
      healthControllerCheckLiveness: vi.fn(),
    },
  },
}));

// Import API after mocking
import { api } from '../api';

// Mock für Date.now und toISOString
const originalDateNow = Date.now;
const mockDateValue = 1672574400000; // 2023-01-01T12:00:00Z

beforeEach(() => {
  // Mock der Date.now Funktion
  global.Date.now = vi.fn(() => mockDateValue);

  // Mock für die Date.toISOString Methode
  const mockDate = new Date(mockDateValue);
  const originalToISOString = mockDate.toISOString;
  Date.prototype.toISOString = vi.fn(() => '2023-01-01T12:00:00.000Z');

  return () => {
    Date.prototype.toISOString = originalToISOString;
  };
});

afterEach(() => {
  // Wiederherstellen der originalen Date.now Funktion
  global.Date.now = originalDateNow;
});

describe('useBackendHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sollte beim Laden "checking" zurückgeben', async () => {
    // Mock a slow API call
    let resolvePromise: () => void;
    const slowPromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(api.health.healthControllerCheckLiveness).mockReturnValueOnce(slowPromise);

    const { result } = renderHook(() => useBackendHealth(false));

    // Initial state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.getConnectionStatus()).toBe('error');

    // Start checking
    act(() => {
      result.current.checkHealth();
    });

    // Should immediately be loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.getConnectionStatus()).toBe('checking');

    // Resolve the promise to clean up
    await act(async () => {
      resolvePromise!();
      await slowPromise;
    });
  });

  it('sollte bei erfolgreichem API-Abruf korrekte Daten zurückgeben', async () => {
    // Mock für erfolgreiche API-Antwort
    vi.mocked(api.health.healthControllerCheckLiveness).mockResolvedValueOnce({});

    const { result } = renderHook(() => useBackendHealth());

    // Warte auf das Laden der Daten
    await waitFor(() => {
      expect(result.current.isHealthy).toBe(true);
    });

    expect(result.current.isHealthy).toBe(true);
    expect(result.current.error).toBeUndefined();
    expect(result.current.getConnectionStatus()).toBe('online');
    expect(logger.debug).toHaveBeenCalledWith('Backend health check passed');
  });

  it('sollte bei HTTP-Fehler trotzdem Daten verarbeiten', async () => {
    // Mock für Fehler
    vi.mocked(api.health.healthControllerCheckLiveness).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useBackendHealth(false));

    // Start checking
    await act(async () => {
      await result.current.checkHealth();
    });

    expect(result.current.isHealthy).toBe(false);
    expect(result.current.error).toBe('Network error');
    expect(result.current.getConnectionStatus()).toBe('error');
    expect(logger.warn).toHaveBeenCalledWith('Backend health check failed', expect.any(Object));
  });

  it('sollte bei Netzwerkfehler entsprechend loggen', async () => {
    // Mock für Netzwerkfehler
    const mockError = new Error('Network Error');
    vi.mocked(api.health.healthControllerCheckLiveness).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useBackendHealth(false));

    // Start checking
    await act(async () => {
      await result.current.checkHealth();
    });

    await waitFor(() => {
      expect(result.current.isHealthy).toBe(false);
    });

    expect(result.current.getConnectionStatus()).toBe('error');
    expect(logger.warn).toHaveBeenCalledWith('Backend health check failed', expect.any(Object));
  });

  it('sollte korrekte System-Details-Text erzeugen', async () => {
    vi.mocked(api.health.healthControllerCheckLiveness).mockResolvedValueOnce({});

    const { result } = renderHook(() => useBackendHealth());

    await waitFor(() => {
      expect(result.current.isHealthy).toBe(true);
    });

    const detailsText = result.current.getSystemDetailsText();
    expect(detailsText).toContain('Letzte Prüfung:');
    expect(result.current.lastChecked).toBeDefined();
  });

  it('sollte "Noch nicht geprüft" zurückgeben, wenn keine Prüfung stattgefunden hat', async () => {
    const { result } = renderHook(() => useBackendHealth(false));

    expect(result.current.getSystemDetailsText()).toBe('Noch nicht geprüft');
  });

  it('sollte korrekte Debug-Informationen erzeugen', async () => {
    vi.mocked(api.health.healthControllerCheckLiveness).mockResolvedValueOnce({});

    const { result } = renderHook(() => useBackendHealth());

    await waitFor(() => {
      expect(result.current.isHealthy).toBe(true);
    });

    const debugInfo = result.current.getDebugInfo();
    expect(debugInfo).toBeTruthy();

    // Prüfe, ob die JSON korrekt geparst werden kann
    const parsedDebugInfo = JSON.parse(debugInfo);
    expect(parsedDebugInfo).toHaveProperty('isHealthy', true);
    expect(parsedDebugInfo).toHaveProperty('isLoading', false);
    expect(parsedDebugInfo).toHaveProperty('timestamp');
    expect(parsedDebugInfo).toHaveProperty('lastChecked');
  });
});
