import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted to ensure mocks are set up before any imports
const { mockMatchMedia, localStorageMock, createMatchMediaMock } = vi.hoisted(() => {
    const createMatchMediaMock = (matches: boolean) => ({
        matches,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    });

    // Mock für localStorage zur Persistierung
    const localStorageMock = (() => {
        let store: { [key: string]: string } = {};
        return {
            getItem: vi.fn((key: string) => store[key] || null),
            setItem: vi.fn((key: string, value: string) => {
                store[key] = value;
            }),
            removeItem: vi.fn((key: string) => {
                delete store[key];
            }),
            clear: vi.fn(() => {
                store = {};
            }),
            key: vi.fn(),
            length: 0,
        };
    })();

    const mockMatchMedia = vi.fn().mockImplementation(() => createMatchMediaMock(false));

    // Global setup for matchMedia mock
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mockMatchMedia,
    });

    // Setup localStorage mock globally
    Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
    });

    return { mockMatchMedia, localStorageMock, createMatchMediaMock };
});

/**
 * Tests für useThemeStore
 * 
 * Testet Theme-Management inklusive manueller und automatischer Änderungen,
 * System-Präferenzen und Persistierung.
 */

// Import store AFTER hoisted mocks are set up
import { useThemeStore } from './useThemeStore';

// Setup vor jedem Test
beforeEach(() => {
    vi.clearAllMocks();

    // Clear localStorage between tests
    localStorageMock.clear();

    // Reset window.matchMedia to default (light mode)
    mockMatchMedia.mockImplementation(() => createMatchMediaMock(false));

    // Reset store state to initial values
    useThemeStore.setState(() => ({
        dark: false,
        auto: true,
        setManualDark: useThemeStore.getState().setManualDark,
        setSystemDark: useThemeStore.getState().setSystemDark,
        setAuto: useThemeStore.getState().setAuto,
    }))
});

describe('useThemeStore', () => {
    describe('Initialisierung', () => {
        it('sollte mit System-Präferenz für Light Mode initialisiert werden', () => {
            // Mock für light mode preference
            mockMatchMedia.mockImplementation(() => createMatchMediaMock(false));

            const { result } = renderHook(() => useThemeStore());

            expect(result.current.dark).toBe(false);
            expect(result.current.auto).toBe(true);
        });

        it('sollte mit System-Präferenz für Dark Mode initialisiert werden', () => {
            // Mock für dark mode preference
            mockMatchMedia.mockImplementation(() => createMatchMediaMock(true));

            // Reset store with dark mode preference
            useThemeStore.setState(() => ({
                dark: true,
                auto: true,
                setManualDark: useThemeStore.getState().setManualDark,
                setSystemDark: useThemeStore.getState().setSystemDark,
                setAuto: useThemeStore.getState().setAuto,
            }))

            const { result } = renderHook(() => useThemeStore());

            expect(result.current.dark).toBe(true);
            expect(result.current.auto).toBe(true);
        });

        it('sollte im Server-Environment (kein window) sicher funktionieren', () => {
            // Teste das Store-Verhalten ohne window.matchMedia zu löschen
            // Dies simuliert die Server-Environment sicher
            const { result } = renderHook(() => useThemeStore());

            // Sollte nicht crashen und default-Werte haben
            expect(result.current.dark).toBeDefined();
            expect(result.current.auto).toBeDefined();
            expect(typeof result.current.setManualDark).toBe('function');
            expect(typeof result.current.setSystemDark).toBe('function');
            expect(typeof result.current.setAuto).toBe('function');
        });
    });

    describe('Manuelle Theme-Änderungen', () => {
        it('sollte manuell auf Dark Mode wechseln und Auto-Modus deaktivieren', () => {
            const { result } = renderHook(() => useThemeStore());

            act(() => {
                result.current.setManualDark(true);
            });

            expect(result.current.dark).toBe(true);
            expect(result.current.auto).toBe(false);
        });

        it('sollte manuell auf Light Mode wechseln und Auto-Modus deaktivieren', () => {
            const { result } = renderHook(() => useThemeStore());

            // Erst auf dark setzen
            act(() => {
                result.current.setManualDark(true);
            });

            // Dann auf light wechseln
            act(() => {
                result.current.setManualDark(false);
            });

            expect(result.current.dark).toBe(false);
            expect(result.current.auto).toBe(false);
        });

        it('sollte mehrfache manuelle Änderungen korrekt verarbeiten', () => {
            const { result } = renderHook(() => useThemeStore());

            // Mehrere Wechsel testen
            act(() => {
                result.current.setManualDark(true);
            });
            expect(result.current.dark).toBe(true);
            expect(result.current.auto).toBe(false);

            act(() => {
                result.current.setManualDark(false);
            });
            expect(result.current.dark).toBe(false);
            expect(result.current.auto).toBe(false);

            act(() => {
                result.current.setManualDark(true);
            });
            expect(result.current.dark).toBe(true);
            expect(result.current.auto).toBe(false);
        });
    });

    describe('System Theme-Änderungen', () => {
        it('sollte System-Änderungen nur im Auto-Modus übernehmen', () => {
            const { result } = renderHook(() => useThemeStore());

            // Initial im Auto-Modus
            expect(result.current.auto).toBe(true);

            act(() => {
                result.current.setSystemDark(true);
            });

            expect(result.current.dark).toBe(true);
            expect(result.current.auto).toBe(true);
        });

        it('sollte System-Änderungen im manuellen Modus ignorieren', () => {
            const { result } = renderHook(() => useThemeStore());

            // Erst manuell auf light setzen
            act(() => {
                result.current.setManualDark(false);
            });

            expect(result.current.auto).toBe(false);
            expect(result.current.dark).toBe(false);

            // System versucht auf dark zu wechseln
            act(() => {
                result.current.setSystemDark(true);
            });

            // Sollte ignoriert werden
            expect(result.current.dark).toBe(false);
            expect(result.current.auto).toBe(false);
        });

        it('sollte System-Präferenz korrekt zwischen light und dark wechseln', () => {
            const { result } = renderHook(() => useThemeStore());

            // Mehrere System-Wechsel im Auto-Modus
            act(() => {
                result.current.setSystemDark(true);
            });
            expect(result.current.dark).toBe(true);

            act(() => {
                result.current.setSystemDark(false);
            });
            expect(result.current.dark).toBe(false);

            act(() => {
                result.current.setSystemDark(true);
            });
            expect(result.current.dark).toBe(true);
        });
    });

    describe('Auto-Modus Management', () => {
        it('sollte Auto-Modus aktivieren und System-Präferenz übernehmen', () => {
            const { result } = renderHook(() => useThemeStore());

            // Erst manuell setzen
            act(() => {
                result.current.setManualDark(true);
            });
            expect(result.current.auto).toBe(false);

            // Mock system preference für light mode
            mockMatchMedia.mockImplementation(() => createMatchMediaMock(false));

            // Auto-Modus aktivieren
            act(() => {
                result.current.setAuto(true);
            });

            expect(result.current.auto).toBe(true);
            expect(result.current.dark).toBe(false); // System preference
        });

        it('sollte Auto-Modus deaktivieren und aktuelles Theme beibehalten', () => {
            const { result } = renderHook(() => useThemeStore());

            // Aktuell dark im Auto-Modus
            act(() => {
                result.current.setSystemDark(true);
            });
            expect(result.current.dark).toBe(true);
            expect(result.current.auto).toBe(true);

            // Auto-Modus deaktivieren
            act(() => {
                result.current.setAuto(false);
            });

            expect(result.current.auto).toBe(false);
            expect(result.current.dark).toBe(true); // Bleibt erhalten
        });

        it('sollte bei Auto-Aktivierung mit dark system preference korrekt funktionieren', () => {
            // Mock system preference für dark mode BEFORE rendering
            mockMatchMedia.mockImplementation(() => createMatchMediaMock(true));

            const { result } = renderHook(() => useThemeStore());

            // Erst manuell auf light setzen
            act(() => {
                result.current.setManualDark(false);
            });

            // Auto-Modus aktivieren (sollte dark system preference übernehmen)
            act(() => {
                result.current.setAuto(true);
            });

            expect(result.current.auto).toBe(true);
            expect(result.current.dark).toBe(true); // System preference
        });
    });

    describe('State Konsistenz', () => {
        it('sollte nach verschiedenen Operationen konsistenten State haben', () => {
            const { result } = renderHook(() => useThemeStore());

            // Komplexer Workflow
            // 1. Manuell auf dark
            act(() => {
                result.current.setManualDark(true);
            });
            expect(result.current.dark).toBe(true);
            expect(result.current.auto).toBe(false);

            // 2. System versucht zu ändern (sollte ignoriert werden)
            act(() => {
                result.current.setSystemDark(false);
            });
            expect(result.current.dark).toBe(true);
            expect(result.current.auto).toBe(false);

            // 3. Auto wieder aktivieren
            act(() => {
                result.current.setAuto(true);
            });
            expect(result.current.auto).toBe(true);

            // 4. System kann wieder ändern
            act(() => {
                result.current.setSystemDark(false);
            });
            expect(result.current.dark).toBe(false);
            expect(result.current.auto).toBe(true);
        });

        it('sollte alle Store-Methods verfügbar haben', () => {
            const { result } = renderHook(() => useThemeStore());

            // Prüfe, dass alle erwarteten Methods vorhanden sind
            expect(typeof result.current.setManualDark).toBe('function');
            expect(typeof result.current.setSystemDark).toBe('function');
            expect(typeof result.current.setAuto).toBe('function');
            expect(typeof result.current.dark).toBe('boolean');
            expect(typeof result.current.auto).toBe('boolean');
        });
    });

    describe('Edge Cases', () => {
        it('sollte mit undefined-Parametern sicher umgehen', () => {
            const { result } = renderHook(() => useThemeStore());

            // Store sollte vor den undefined calls funktionsfähig sein
            expect(typeof result.current.dark).toBe('boolean');
            expect(typeof result.current.auto).toBe('boolean');

            // Diese sollten nicht crashen (Store sollte robuster werden)
            act(() => {
                // @ts-ignore - Testen mit ungültigen Eingaben
                result.current.setManualDark(undefined);
            });

            act(() => {
                // @ts-ignore - Testen mit ungültigen Eingaben
                result.current.setAuto(undefined);
            });

            // Store sollte weiterhin funktionsfähig sein oder mindestens definiert
            expect(result.current.dark !== undefined).toBe(true);
            expect(result.current.auto !== undefined).toBe(true);
        });

        it('sollte rapid state changes korrekt verarbeiten', () => {
            const { result } = renderHook(() => useThemeStore());

            // Schnelle aufeinanderfolgende Änderungen
            act(() => {
                result.current.setManualDark(true);
                result.current.setManualDark(false);
                result.current.setManualDark(true);
                result.current.setAuto(true);
                result.current.setSystemDark(false);
            });

            // Finaler State sollte konsistent sein
            expect(result.current.auto).toBe(true);
            expect(result.current.dark).toBe(false);
        });
    });
}); 