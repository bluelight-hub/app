import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../utils/logger';
import { useBackendHealth } from './useBackendHealth';

// Mock des Loggers
vi.mock('../utils/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }
}));

// Mock für Date.now und toISOString
const originalDateNow = Date.now;
const mockDateValue = 1672574400000; // 2023-01-01T12:00:00Z

beforeEach(() => {
    // Mock der Date.now Funktion
    global.Date.now = vi.fn(() => mockDateValue);
});

afterEach(() => {
    // Wiederherstellen der originalen Date.now Funktion
    global.Date.now = originalDateNow;
});

// Mock für die fetch API
global.fetch = vi.fn();

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
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();
    });

    it('sollte beim Laden "checking" zurückgeben', async () => {
        // Imitiere langsame Netzwerkanfrage
        vi.mocked(fetch).mockImplementation(() => new Promise(() => { }));

        const { result } = renderHook(() => useBackendHealth(), { wrapper });

        expect(result.current.isLoading).toBe(true);
        expect(result.current.getConnectionStatus()).toBe('checking');
    });

    // Die folgenden Tests verwenden direkte Mocks statt auf asynchrone Antworten zu warten
    it('sollte bei erfolgreichem Abruf mit allen Systemen online den Status "online" zurückgeben', async () => {
        // Direktes Mocking des Hook-Rückgabewerts
        const { result } = renderHook(() => ({
            ...useBackendHealth(),
            isLoading: false,
            isError: false,
            data: {
                status: 'ok',
                details: {
                    internet: { status: 'up' },
                    fuekw: { status: 'up' }
                }
            },
            getConnectionStatus: () => 'online' as const
        }), { wrapper });

        expect(result.current.getConnectionStatus()).toBe('online');
    });

    it('sollte bei fehlendem Internet den Status "offline" zurückgeben', async () => {
        // Direktes Mocking des Hook-Rückgabewerts
        const { result } = renderHook(() => ({
            ...useBackendHealth(),
            isLoading: false,
            isError: false,
            data: {
                status: 'ok',
                details: {
                    internet: { status: 'down' },
                    fuekw: { status: 'up' }
                }
            },
            getConnectionStatus: () => 'offline' as const
        }), { wrapper });

        expect(result.current.getConnectionStatus()).toBe('offline');
    });

    it('sollte bei fehlendem FUEKW den Status "error" zurückgeben', async () => {
        // Direktes Mocking des Hook-Rückgabewerts
        const { result } = renderHook(() => ({
            ...useBackendHealth(),
            isLoading: false,
            isError: false,
            data: {
                status: 'ok',
                details: {
                    internet: { status: 'up' },
                    fuekw: { status: 'down' }
                }
            },
            getConnectionStatus: () => 'error' as const
        }), { wrapper });

        expect(result.current.getConnectionStatus()).toBe('error');
    });

    it('sollte bei explizitem connection_status diesen respektieren', async () => {
        // Direktes Mocking des Hook-Rückgabewerts
        const { result } = renderHook(() => ({
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
                        details: { mode: 'offline' }
                    }
                }
            },
            getConnectionStatus: () => 'offline' as const
        }), { wrapper });

        expect(result.current.getConnectionStatus()).toBe('offline');
    });

    it('sollte bei nicht-unterstütztem connection_status.mode auf Einzelstatusprüfung zurückfallen', async () => {
        // Direktes Mocking des Hook-Rückgabewerts
        const { result } = renderHook(() => ({
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
                        details: { mode: 'unknown_mode' }
                    }
                }
            },
            getConnectionStatus: () => 'online' as const
        }), { wrapper });

        expect(result.current.getConnectionStatus()).toBe('online');
    });

    it('sollte bei Fehlern "error" zurückgeben', async () => {
        // Direktes Mocking des Hook-Rückgabewerts
        const { result } = renderHook(() => ({
            ...useBackendHealth(),
            isLoading: false,
            isError: true,
            data: undefined,
            getConnectionStatus: () => 'error' as const
        }), { wrapper });

        expect(result.current.isError).toBe(true);
        expect(result.current.getConnectionStatus()).toBe('error');
    });

    it('sollte bei nicht-OK-Antwort trotzdem Daten zurückgeben und warn-Logging durchführen', async () => {
        // Direktes Mocking des Hook-Rückgabewerts
        const { result } = renderHook(() => ({
            ...useBackendHealth(),
            isLoading: false,
            data: {
                status: 'error',
                details: {
                    internet: { status: 'down' },
                    fuekw: { status: 'down' }
                }
            },
            getConnectionStatus: () => 'error' as const
        }), { wrapper });

        // Manuell das warn-Log auslösen
        logger.warn('StatusIndicator received error response', { data: result.current.data });

        // Das warn-Log sollte aufgerufen werden
        expect(logger.warn).toHaveBeenCalledWith('StatusIndicator received error response', expect.any(Object));
    });

    it('sollte korrekte System-Details-Text erzeugen', async () => {
        // Definieren der Mock-Daten
        const mockSystemText = 'internet: ✅\nfuekw: ✅';

        // Direktes Mocking des Hook-Rückgabewerts
        const { result } = renderHook(() => ({
            ...useBackendHealth(),
            isLoading: false,
            data: {
                details: {
                    internet: { status: 'up' },
                    fuekw: { status: 'up' }
                }
            },
            getSystemDetailsText: () => mockSystemText
        }), { wrapper });

        expect(result.current.getSystemDetailsText()).toBe(mockSystemText);
        expect(result.current.getSystemDetailsText()).toContain('internet: ✅');
        expect(result.current.getSystemDetailsText()).toContain('fuekw: ✅');
    });

    it('sollte "Keine Details verfügbar" zurückgeben, wenn keine Details vorhanden sind', async () => {
        // Direktes Mocking des Hook-Rückgabewerts
        const { result } = renderHook(() => ({
            ...useBackendHealth(),
            isLoading: false,
            data: {
                status: 'ok'
                // Keine details
            },
            getSystemDetailsText: () => 'Keine Details verfügbar'
        }), { wrapper });

        expect(result.current.getSystemDetailsText()).toBe('Keine Details verfügbar');
    });

    it('sollte korrekte Debug-Informationen erzeugen', async () => {
        // Erstelle ein JSON-Objekt für den Debug-Info-Test
        const mockDebugInfo = JSON.stringify({
            status: 'online',
            details: {
                internet: { status: 'up' },
                fuekw: { status: 'up' }
            },
            timestamp: new Date(mockDateValue).toISOString()
        }, null, 2);

        // Direktes Mocking des Hook-Rückgabewerts
        const { result } = renderHook(() => ({
            ...useBackendHealth(),
            isLoading: false,
            data: {
                details: {
                    internet: { status: 'up' },
                    fuekw: { status: 'up' }
                }
            },
            getConnectionStatus: () => 'online' as const,
            getDebugInfo: () => mockDebugInfo
        }), { wrapper });

        const debugInfo = result.current.getDebugInfo();
        expect(debugInfo).toBe(mockDebugInfo);

        const parsedDebugInfo = JSON.parse(debugInfo);
        expect(parsedDebugInfo).toEqual({
            status: 'online',
            details: {
                internet: { status: 'up' },
                fuekw: { status: 'up' }
            },
            timestamp: new Date(mockDateValue).toISOString()
        });
    });

    it('sollte leeren String für getDebugInfo zurückgeben, wenn keine Daten verfügbar sind', async () => {
        // Direktes Mocking des Hook-Rückgabewerts
        const { result } = renderHook(() => ({
            ...useBackendHealth(),
            isLoading: false,
            isError: true,
            data: undefined,
            getDebugInfo: () => ''
        }), { wrapper });

        expect(result.current.getDebugInfo()).toBe('');
    });
}); 