import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api';
import { useEinsatztagebuch } from './useEinsatztagebuch';

// Mock für die API
vi.mock('../../api', () => ({
    api: {
        etb: {
            etbControllerFindAllV1: vi.fn(),
            etbControllerCloseEntryV1: vi.fn(),
            etbControllerCreateV1: vi.fn(),
            etbControllerUeberschreibeEintragV1: vi.fn(),
        }
    }
}));

// Mock für die Logger-Funktion
vi.mock('../../utils/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    }
}));

describe('useEinsatztagebuch Hook', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });

        // Reset aller Mocks
        vi.clearAllMocks();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );

    it('sollte Einsatztagebuch-Daten laden', async () => {
        // Mock-Daten für die API-Antwort
        const mockData = {
            entries: [
                {
                    id: '1',
                    laufendeNummer: 1,
                    beschreibung: 'Test Eintrag',
                    kategorie: 'USER',
                    timestampErstellung: new Date(),
                    timestampEreignis: new Date(),
                    autorId: 'user1',
                    autorName: 'User 1',
                    autorRolle: 'Einsatzleiter',
                    titel: 'Test',
                    referenzEinsatzId: null,
                    referenzPatientId: null,
                    referenzEinsatzmittelId: null,
                    systemQuelle: null,
                    version: 1,
                    istAbgeschlossen: false,
                    timestampAbschluss: null,
                    abgeschlossenVon: null,
                }
            ],
            total: 1
        };

        // Mock der API-Antwort
        (api.etb.etbControllerFindAllV1 as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            data: mockData
        });

        // Hook rendern
        const { result } = renderHook(() => useEinsatztagebuch(), { wrapper });

        // Auf Abschluss der Abfrage warten
        await waitFor(() => expect(result.current.einsatztagebuch.isLoading).toBe(false));

        // Prüfen, ob die Daten korrekt geladen wurden
        expect(result.current.einsatztagebuch.data.items).toEqual(mockData.entries);
        expect(api.etb.etbControllerFindAllV1).toHaveBeenCalledWith(
            {},
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Content-Type': 'application/json'
                })
            })
        );
    });

    it('sollte Filter-Parameter für überschriebene Einträge korrekt übergeben', async () => {
        // Mock-Daten für die API-Antwort
        const mockData = {
            entries: [
                {
                    id: '1',
                    laufendeNummer: 1,
                    beschreibung: 'Test Eintrag',
                    kategorie: 'USER',
                    timestampErstellung: new Date(),
                    timestampEreignis: new Date(),
                    autorId: 'user1',
                    autorName: 'User 1',
                    autorRolle: 'Einsatzleiter',
                    titel: 'Test',
                    referenzEinsatzId: null,
                    referenzPatientId: null,
                    referenzEinsatzmittelId: null,
                    systemQuelle: null,
                    version: 1,
                    istAbgeschlossen: false,
                    timestampAbschluss: null,
                    abgeschlossenVon: null,
                    status: 'aktiv'
                },
                {
                    id: '2',
                    laufendeNummer: 2,
                    beschreibung: 'Überschriebener Eintrag',
                    kategorie: 'USER',
                    timestampErstellung: new Date(),
                    timestampEreignis: new Date(),
                    autorId: 'user1',
                    autorName: 'User 1',
                    autorRolle: 'Einsatzleiter',
                    titel: 'Test',
                    referenzEinsatzId: null,
                    referenzPatientId: null,
                    referenzEinsatzmittelId: null,
                    systemQuelle: null,
                    version: 1,
                    istAbgeschlossen: false,
                    timestampAbschluss: null,
                    abgeschlossenVon: null,
                    status: 'ueberschrieben'
                }
            ],
            total: 2
        };

        // Mock der API-Antwort
        (api.etb.etbControllerFindAllV1 as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            data: mockData
        });

        // Hook mit includeUeberschrieben=true rendern
        const { result: resultWithUeberschrieben } = renderHook(
            () => useEinsatztagebuch({ includeUeberschrieben: true }),
            { wrapper }
        );

        // Auf Abschluss der Abfrage warten
        await waitFor(() => expect(resultWithUeberschrieben.current.einsatztagebuch.isLoading).toBe(false));

        // Prüfen, ob der Parameter korrekt übergeben wurde
        expect(api.etb.etbControllerFindAllV1).toHaveBeenCalledWith(
            expect.objectContaining({
                includeUeberschrieben: true
            }),
            expect.anything()
        );

        // Hook mit explizitem Status rendern
        const { result: resultWithStatus } = renderHook(
            () => useEinsatztagebuch({ status: 'ueberschrieben' }),
            { wrapper }
        );

        // Auf Abschluss der Abfrage warten
        await waitFor(() => expect(resultWithStatus.current.einsatztagebuch.isLoading).toBe(false));

        // Prüfen, ob der Parameter korrekt übergeben wurde
        expect(api.etb.etbControllerFindAllV1).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'ueberschrieben'
            }),
            expect.anything()
        );
    });

    it('sollte einen Einsatztagebucheintrag überschreiben können', async () => {
        // Mock-Daten für die API-Antwort
        const mockData = {
            entries: [
                {
                    id: '1',
                    laufendeNummer: 1,
                    beschreibung: 'Original Eintrag',
                    kategorie: 'USER',
                    timestampErstellung: new Date(),
                    timestampEreignis: new Date(),
                    autorId: 'user1',
                    autorName: 'User 1',
                    autorRolle: 'Einsatzleiter',
                    titel: 'Test',
                    referenzEinsatzId: null,
                    referenzPatientId: null,
                    referenzEinsatzmittelId: null,
                    systemQuelle: null,
                    version: 1,
                    istAbgeschlossen: false,
                    timestampAbschluss: null,
                    abgeschlossenVon: null,
                    status: 'aktiv'
                }
            ],
            total: 1
        };

        // Mock der API-Antwort für Abfrage
        (api.etb.etbControllerFindAllV1 as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            data: mockData
        });

        // Mock der API-Antwort für Überschreiben
        (api.etb.etbControllerUeberschreibeEintragV1 as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            data: {
                success: true
            }
        });

        // Hook rendern
        const { result } = renderHook(() => useEinsatztagebuch(), { wrapper });

        // Auf Abschluss der Abfrage warten
        await waitFor(() => expect(result.current.einsatztagebuch.isLoading).toBe(false));

        // Überschreiben-Mutation ausführen
        result.current.ueberschreibeEinsatztagebuchEintrag.mutate({
            id: '1',
            beschreibung: 'Überschriebener Eintrag'
        });

        // Prüfen, ob die API-Funktion mit den korrekten Parametern aufgerufen wurde
        await waitFor(() => expect(api.etb.etbControllerUeberschreibeEintragV1).toHaveBeenCalled());

        expect(api.etb.etbControllerUeberschreibeEintragV1).toHaveBeenCalledWith({
            id: '1',
            ueberschreibeEtbDto: expect.objectContaining({
                beschreibung: 'Überschriebener Eintrag',
                kategorie: 'KORREKTUR'
            })
        });
    });
}); 