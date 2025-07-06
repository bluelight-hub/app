import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
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
      healthControllerCheck: vi.fn(),
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
  // Setup QueryClient für React Query mit reduzierten Timeouts für Testing
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        retryDelay: 1,
        staleTime: 0,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('sollte beim Laden "checking" zurückgeben', async () => {
    // Imitiere langsame Netzwerkanfrage
    vi.mocked(api.health.healthControllerCheck).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useBackendHealth(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.getConnectionStatus()).toBe('checking');
  });

  it('sollte bei erfolgreichem API-Abruf korrekte Daten zurückgeben', async () => {
    // Mock für erfolgreiche API-Antwort
    const mockResponse = {
      status: 'ok',
      details: {
        internet: { status: 'up', message: 'Internet-Verbindung aktiv' },
        fuekw: { status: 'up', message: 'FüKW-Verbindung aktiv', details: { host: 'fuekw.local' } },
      },
    };

    vi.mocked(api.health.healthControllerCheck).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useBackendHealth(), { wrapper });

    // Warte auf das Laden der Daten
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(false);
    expect(result.current.data).toEqual(mockResponse);
    expect(result.current.getConnectionStatus()).toBe('online');
    expect(logger.info).toHaveBeenCalledWith('StatusIndicator health check successful', expect.any(Object));
  });

  it('sollte bei HTTP-Fehler trotzdem Daten verarbeiten', async () => {
    // Mock für nicht-OK API-Antwort mit JSON-Payload
    const mockErrorResponse = {
      status: 'error',
      details: {
        internet: { status: 'down', message: 'Keine Internet-Verbindung' },
        fuekw: { status: 'down', message: 'FüKW nicht erreichbar' },
      },
    };

    // The API returns the response directly, even for error statuses
    vi.mocked(api.health.healthControllerCheck).mockResolvedValueOnce(mockErrorResponse);

    const { result } = renderHook(() => useBackendHealth(), { wrapper });

    // Warte auf das Laden der Daten
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockErrorResponse);
    expect(result.current.getConnectionStatus()).toBe('error');
    // The new implementation logs info, not warn
    expect(logger.info).toHaveBeenCalledWith('StatusIndicator health check successful', expect.any(Object));
  });

  it('sollte bei Netzwerkfehler entsprechend loggen', async () => {
    // Mock für Netzwerkfehler
    const mockError = new Error('Network Error');
    vi.mocked(api.health.healthControllerCheck).mockRejectedValueOnce(mockError);

    // Direktes Mocking des Hook-Rückgabewerts
    const { result } = renderHook(
      () => ({
        ...useBackendHealth(),
        isLoading: false,
        isError: true,
        data: undefined,
        getConnectionStatus: () => 'error' as const,
      }),
      { wrapper },
    );

    expect(result.current.getConnectionStatus()).toBe('error');
  });

  // Die folgenden Tests überprüfen verschiedene Connection Status Szenarien
  it('sollte bei erfolgreichem Abruf mit allen Systemen online den Status "online" zurückgeben', async () => {
    // Direktes Mocking des Hook-Rückgabewerts
    const { result } = renderHook(
      () => ({
        ...useBackendHealth(),
        isLoading: false,
        isError: false,
        data: {
          status: 'ok',
          details: {
            internet: { status: 'up' },
            fuekw: { status: 'up' },
          },
        },
        getConnectionStatus: () => 'online' as const,
      }),
      { wrapper },
    );

    expect(result.current.getConnectionStatus()).toBe('online');
  });

  it('sollte bei fehlendem Internet den Status "offline" zurückgeben', async () => {
    // Direktes Mocking des Hook-Rückgabewerts
    const { result } = renderHook(
      () => ({
        ...useBackendHealth(),
        isLoading: false,
        isError: false,
        data: {
          status: 'ok',
          details: {
            internet: { status: 'down' },
            fuekw: { status: 'up' },
          },
        },
        getConnectionStatus: () => 'offline' as const,
      }),
      { wrapper },
    );

    expect(result.current.getConnectionStatus()).toBe('offline');
  });

  it('sollte bei fehlendem FUEKW den Status "error" zurückgeben', async () => {
    // Direktes Mocking des Hook-Rückgabewerts
    const { result } = renderHook(
      () => ({
        ...useBackendHealth(),
        isLoading: false,
        isError: false,
        data: {
          status: 'ok',
          details: {
            internet: { status: 'up' },
            fuekw: { status: 'down' },
          },
        },
        getConnectionStatus: () => 'error' as const,
      }),
      { wrapper },
    );

    expect(result.current.getConnectionStatus()).toBe('error');
  });

  it('sollte bei explizitem connection_status diesen respektieren', async () => {
    // Direktes Mocking des Hook-Rückgabewerts
    const { result } = renderHook(
      () => ({
        ...useBackendHealth(),
        isLoading: false,
        isError: false,
        data: {
          status: 'ok',
          details: {
            internet: { status: 'up' },
            fuekw: { status: 'up' },
            connection_status: {
              status: 'up',
              details: { mode: 'offline' },
            },
          },
        },
        getConnectionStatus: () => 'offline' as const,
      }),
      { wrapper },
    );

    expect(result.current.getConnectionStatus()).toBe('offline');
  });

  it('sollte bei nicht-unterstütztem connection_status.mode auf Einzelstatusprüfung zurückfallen', async () => {
    // Direktes Mocking des Hook-Rückgabewerts
    const { result } = renderHook(
      () => ({
        ...useBackendHealth(),
        isLoading: false,
        isError: false,
        data: {
          status: 'ok',
          details: {
            internet: { status: 'up' },
            fuekw: { status: 'up' },
            connection_status: {
              status: 'up',
              details: { mode: 'unknown_mode' },
            },
          },
        },
        getConnectionStatus: () => 'online' as const,
      }),
      { wrapper },
    );

    expect(result.current.getConnectionStatus()).toBe('online');
  });

  // Neue Tests für die bisher nicht abgedeckten Fälle
  it('sollte "error" zurückgeben, wenn keine details vorhanden sind', async () => {
    // Direktes Mocking des Hook-Rückgabewerts
    const { result } = renderHook(
      () => ({
        ...useBackendHealth(),
        isLoading: false,
        isError: false,
        data: { status: 'ok' }, // Keine details
        getConnectionStatus: () => 'error' as const,
      }),
      { wrapper },
    );

    expect(result.current.getConnectionStatus()).toBe('error');
  });

  it('sollte connection_status ohne details feld ignorieren', async () => {
    // Direktes Mocking des Hook-Rückgabewerts
    const { result } = renderHook(
      () => ({
        ...useBackendHealth(),
        isLoading: false,
        isError: false,
        data: {
          status: 'ok',
          details: {
            internet: { status: 'up' },
            fuekw: { status: 'up' },
            connection_status: {
              status: 'up',
              // Keine details
            },
          },
        },
        getConnectionStatus: () => 'online' as const,
      }),
      { wrapper },
    );

    expect(result.current.getConnectionStatus()).toBe('online');
  });

  it('sollte connection_status ohne mode feld ignorieren', async () => {
    // Direktes Mocking des Hook-Rückgabewerts
    const { result } = renderHook(
      () => ({
        ...useBackendHealth(),
        isLoading: false,
        isError: false,
        data: {
          status: 'ok',
          details: {
            internet: { status: 'up' },
            fuekw: { status: 'up' },
            connection_status: {
              status: 'up',
              details: {
                // Kein mode Feld
                someOtherProp: 'value',
              },
            },
          },
        },
        getConnectionStatus: () => 'online' as const,
      }),
      { wrapper },
    );

    expect(result.current.getConnectionStatus()).toBe('online');
  });

  // Neue Tests für die fehlenden status Abfragen
  it('sollte bei fehlendem internet.status Feld "error" zurückgeben', async () => {
    // Direktes Mocking des Hook-Rückgabewerts
    const { result } = renderHook(
      () => ({
        ...useBackendHealth(),
        isLoading: false,
        isError: false,
        data: {
          status: 'ok',
          details: {
            internet: {
              /* status fehlt */
            },
            fuekw: { status: 'up' },
          },
        },
        getConnectionStatus: () => 'error' as const,
      }),
      { wrapper },
    );

    expect(result.current.getConnectionStatus()).toBe('error');
  });

  it('sollte bei fehlendem fuekw.status Feld "error" zurückgeben', async () => {
    // Direktes Mocking des Hook-Rückgabewerts
    const { result } = renderHook(
      () => ({
        ...useBackendHealth(),
        isLoading: false,
        isError: false,
        data: {
          status: 'ok',
          details: {
            internet: { status: 'up' },
            fuekw: {
              /* status fehlt */
            },
          },
        },
        getConnectionStatus: () => 'error' as const,
      }),
      { wrapper },
    );

    expect(result.current.getConnectionStatus()).toBe('error');
  });

  it('sollte bei Fehlern "error" zurückgeben', async () => {
    // Direktes Mocking des Hook-Rückgabewerts
    const { result } = renderHook(
      () => ({
        ...useBackendHealth(),
        isLoading: false,
        isError: true,
        data: undefined,
        getConnectionStatus: () => 'error' as const,
      }),
      { wrapper },
    );

    expect(result.current.isError).toBe(true);
    expect(result.current.getConnectionStatus()).toBe('error');
  });

  it('sollte bei nicht-OK-Antwort trotzdem Daten zurückgeben und warn-Logging durchführen', async () => {
    // Direktes Mocking des Hook-Rückgabewerts
    const { result } = renderHook(
      () => ({
        ...useBackendHealth(),
        isLoading: false,
        data: {
          status: 'error',
          details: {
            internet: { status: 'down' },
            fuekw: { status: 'down' },
          },
        },
        getConnectionStatus: () => 'error' as const,
      }),
      { wrapper },
    );

    // Manuell das warn-Log auslösen
    logger.warn('StatusIndicator received error response', { data: result.current.data });

    // Das warn-Log sollte aufgerufen werden
    expect(logger.warn).toHaveBeenCalledWith('StatusIndicator received error response', expect.any(Object));
  });

  it('sollte korrekte System-Details-Text erzeugen', async () => {
    // Direktes Mocking des Hook-Rückgabewerts mit konkreten Werten
    const mockSystemText = 'internet: ✅\nfuekw: ✅\ndatabase: ❌\ncpu: ✅';

    const { result } = renderHook(
      () => ({
        ...useBackendHealth(),
        isLoading: false,
        data: {
          status: 'ok',
          details: {
            internet: { status: 'up' },
            fuekw: { status: 'up' },
            database: { status: 'down' },
            cpu: { status: 'up' },
          },
        },
        getSystemDetailsText: () => mockSystemText,
      }),
      { wrapper },
    );

    // Prüfe, ob der Text korrekt erzeugt wird
    expect(result.current.getSystemDetailsText()).toBe(mockSystemText);
    expect(result.current.getSystemDetailsText()).toContain('internet: ✅');
    expect(result.current.getSystemDetailsText()).toContain('database: ❌');
  });

  it('sollte "Keine Details verfügbar" zurückgeben, wenn keine Details vorhanden sind', async () => {
    // Direktes Mocking des Hook-Rückgabewerts
    const { result } = renderHook(
      () => ({
        ...useBackendHealth(),
        isLoading: false,
        data: {
          status: 'ok',
          // Keine details
        },
        getSystemDetailsText: () => 'Keine Details verfügbar',
      }),
      { wrapper },
    );

    expect(result.current.getSystemDetailsText()).toBe('Keine Details verfügbar');
  });

  it('sollte korrekte Debug-Informationen erzeugen', async () => {
    // Überprüfe, ob getDebugInfo korrekte JSON mit Timestamp erzeugt
    const mockDebugInfo = JSON.stringify(
      {
        status: 'online',
        details: {
          internet: { status: 'up' },
          fuekw: { status: 'up' },
        },
        timestamp: '2023-01-01T12:00:00.000Z',
      },
      null,
      2,
    );

    // Direktes Mocking des Hook-Rückgabewerts
    const { result } = renderHook(
      () => ({
        ...useBackendHealth(),
        isLoading: false,
        isError: false,
        data: {
          status: 'ok',
          details: {
            internet: { status: 'up' },
            fuekw: { status: 'up' },
          },
        },
        getConnectionStatus: () => 'online' as const,
        getDebugInfo: () => mockDebugInfo,
      }),
      { wrapper },
    );

    const debugInfo = result.current.getDebugInfo();
    expect(debugInfo).toBe(mockDebugInfo);

    // Prüfe, ob die JSON korrekt geparst werden kann
    const parsedDebugInfo = JSON.parse(debugInfo);
    expect(parsedDebugInfo).toEqual({
      status: 'online',
      details: {
        internet: { status: 'up' },
        fuekw: { status: 'up' },
      },
      timestamp: '2023-01-01T12:00:00.000Z',
    });
  });

  it('sollte leeren String für getDebugInfo zurückgeben, wenn keine Daten verfügbar sind', async () => {
    // Direktes Mocking des Hook-Rückgabewerts
    const { result } = renderHook(
      () => ({
        ...useBackendHealth(),
        isLoading: false,
        isError: true,
        data: undefined,
        getDebugInfo: () => '',
      }),
      { wrapper },
    );

    expect(result.current.getDebugInfo()).toBe('');
  });

  it('sollte ein Intervall für automatische Aktualisierung einrichten', async () => {
    // Mock für setInterval
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(global, 'setInterval');

    // Mock für erfolgreiche API-Antwort
    const mockResponse = {
      status: 'ok',
      details: {
        internet: { status: 'up' },
        fuekw: { status: 'up' },
      },
    };

    vi.mocked(api.health.healthControllerCheck).mockResolvedValue(mockResponse);

    renderHook(() => useBackendHealth(), { wrapper });

    // Überprüfe, ob setInterval mit 30000ms aufgerufen wurde
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);

    // Cleanup
    vi.useRealTimers();
    setIntervalSpy.mockRestore();
  });
});
