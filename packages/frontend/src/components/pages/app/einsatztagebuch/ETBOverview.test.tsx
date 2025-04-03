import { EtbEntryDto, EtbEntryDtoStatusEnum } from '@bluelight-hub/shared/client/models/EtbEntryDto';
import { QueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEinsatztagebuch } from '../../../../hooks/etb/useEinsatztagebuch';
import { useFahrzeuge } from '../../../../hooks/etb/useFahrzeuge';
import { ETBOverview } from './ETBOverview';

// Mock-Daten für einen Eintrag
const mockEntryData = {
    id: '1',
    laufendeNummer: 1,
    timestampErstellung: new Date('2023-01-01T10:00:00'),
    timestampEreignis: new Date('2023-01-01T10:00:00'),
    autorId: 'user1',
    autorName: 'Sanitäter 1',
    autorRolle: 'Sanitäter',
    kategorie: 'USER',
    titel: 'Erster Eintrag',
    beschreibung: 'Aktiver Eintrag',
    referenzEinsatzId: null,
    referenzPatientId: null,
    referenzEinsatzmittelId: null,
    systemQuelle: null,
    version: 1,
    istAbgeschlossen: false,
    timestampAbschluss: null,
    abgeschlossenVon: null,
    status: EtbEntryDtoStatusEnum.Aktiv
};

// Mock für die Hooks
vi.mock('../../../../hooks/etb/useEinsatztagebuch', () => ({
    useEinsatztagebuch: vi.fn()
}));

vi.mock('../../../../hooks/etb/useFahrzeuge', () => ({
    useFahrzeuge: vi.fn()
}));

// Mock für die Formatierungsfunktion
vi.mock('@/utils/date', () => ({
    formatNatoDateTime: vi.fn(() => '10 JAN 2023 12:00Z')
}));

// Mock für die ETBTable-Komponente
vi.mock('@organisms/etb/ETBTable', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ETBTable: ({ onUeberschreibeEntry }: { onUeberschreibeEntry?: (entry: any) => void }) => (
        <div data-testid="mock-etb-table">
            <button
                data-testid="ueberschreiben-button"
                onClick={() => onUeberschreibeEntry && onUeberschreibeEntry(mockEntryData)}
            >
                Überschreiben
            </button>
        </div>
    )
}));

// Mock für die ETBCardList-Komponente
vi.mock('@organisms/etb/ETBCardList', () => ({
    ETBCardList: () => <div data-testid="mock-etb-cardlist" />
}));

describe('ETBOverview Komponente', () => {
    // Test-Daten
    const mockEntries: EtbEntryDto[] = [
        {
            id: '1',
            laufendeNummer: 1,
            autorId: 'user1',
            autorName: 'Test User',
            timestampErstellung: new Date().toISOString(),
            timestampEreignis: new Date().toISOString(),
            kategorie: 'USER',
            beschreibung: 'Test Eintrag 1',
            status: 'aktiv',
            version: 1,
            istAbgeschlossen: false,
        },
        {
            id: '2',
            laufendeNummer: 2,
            autorId: 'user1',
            autorName: 'Test User',
            timestampErstellung: new Date().toISOString(),
            timestampEreignis: new Date().toISOString(),
            kategorie: 'USER',
            beschreibung: 'Test Eintrag 2',
            status: 'aktiv',
            version: 1,
            istAbgeschlossen: false,
        },
    ];

    const mockFahrzeuge = {
        fahrzeugeImEinsatz: [
            { kennzeichen: 'TEST-123', typ: 'ELW', funkrufname: 'Florian 1' },
        ],
    };

    // Mocks für die Hooks
    const mockUseEinsatztagebuch = {
        einsatztagebuch: {
            data: { items: mockEntries },
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        },
        createEinsatztagebuchEintrag: { mutate: vi.fn(), mutateAsync: vi.fn() },
        archiveEinsatztagebuchEintrag: { mutate: vi.fn(), mutateAsync: vi.fn() },
        ueberschreibeEinsatztagebuchEintrag: { mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue({}) },
    };

    const mockUseFahrzeuge = {
        fahrzeuge: { data: mockFahrzeuge, isLoading: false, error: null },
        error: null,
        refreshFahrzeuge: vi.fn(),
    };

    // QueryClient für React Query
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });

        // Mock-Implementierungen setzen
        (useEinsatztagebuch as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockUseEinsatztagebuch);
        (useFahrzeuge as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockUseFahrzeuge);

        // Reset mocks between tests
        vi.clearAllMocks();

        // Für den Mobile-Check einen festen Wert zurückgeben (Desktop)
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1024 // Desktop-Breite
        });
    });

    it('sollte die Tabelle mit Einträgen rendern', () => {
        render(
            <QueryClientProvider client={queryClient}>
                <ETBOverview />
            </QueryClientProvider>
        );

        // Prüfe, ob die Einträge angezeigt werden
        expect(screen.getByText('Test Eintrag 1')).toBeInTheDocument();
        expect(screen.getByText('Test Eintrag 2')).toBeInTheDocument();
    });

    it('sollte einen Ladeindikator anzeigen, wenn Daten geladen werden', () => {
        // Setze isLoading auf true
        (useEinsatztagebuch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            ...mockUseEinsatztagebuch,
            einsatztagebuch: {
                ...mockUseEinsatztagebuch.einsatztagebuch,
                isLoading: true,
            },
        });

        render(
            <QueryClientProvider client={queryClient}>
                <ETBOverview />
            </QueryClientProvider>
        );

        // Prüfe, ob der Ladeindikator angezeigt wird
        expect(screen.getByText('Lade Einsatztagebuch...')).toBeInTheDocument();
    });

    it('sollte eine Fehlermeldung anzeigen, wenn ein Fehler auftritt', () => {
        // Setze einen Fehler
        const errorMessage = 'Fehler beim Laden der Daten';
        (useEinsatztagebuch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            ...mockUseEinsatztagebuch,
            einsatztagebuch: {
                ...mockUseEinsatztagebuch.einsatztagebuch,
                error: new Error(errorMessage),
            },
        });

        render(
            <QueryClientProvider client={queryClient}>
                <ETBOverview />
            </QueryClientProvider>
        );

        // Prüfe, ob die Fehlermeldung angezeigt wird
        expect(screen.getByText('Fehler beim Laden des Einsatztagebuchs')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('sollte den Überschreibe-Dialog korrekt anzeigen', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <ETBOverview />
            </QueryClientProvider>
        );

        // Finde den Bearbeiten-Button für den ersten Eintrag
        const editButtons = screen.getAllByRole('button', { name: /überschreiben/i });
        fireEvent.click(editButtons[0]);

        // Warte auf das Öffnen des Dialogs
        await waitFor(() => {
            expect(screen.getByText(/Eintrag 1 von 10 JAN 2023 12:00Z überschreiben/i)).toBeInTheDocument();
        });
    });

    it('sollte den Filter für überschriebene Einträge umschalten', () => {
        render(
            <QueryClientProvider client={queryClient}>
                <ETBOverview />
            </QueryClientProvider>
        );

        // Finde den Switch für überschriebene Einträge
        const toggleSwitch = screen.getByTestId('toggle-ueberschrieben-switch');

        // Prüfe Anfangszustand
        expect(toggleSwitch).not.toBeChecked();

        // Schalte den Switch um
        fireEvent.click(toggleSwitch);

        // Prüfe, ob useEinsatztagebuch mit den richtigen Optionen aufgerufen wurde
        expect(useEinsatztagebuch).toHaveBeenLastCalledWith({ includeUeberschrieben: true });
    });
}); 