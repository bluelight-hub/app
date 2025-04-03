import { EtbEntryDtoStatusEnum } from '@bluelight-hub/shared/client/models/EtbEntryDto';
import { fireEvent, render, screen } from '@testing-library/react';
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
    // Standard-Mock-Implementation für die Hooks
    const mockEtbHook = {
        einsatztagebuch: {
            data: {
                items: [mockEntryData]
            },
            isLoading: false,
            error: null,
            refetch: vi.fn()
        },
        archiveEinsatztagebuchEintrag: {
            mutate: vi.fn(),
            mutateAsync: vi.fn()
        },
        createEinsatztagebuchEintrag: {
            mutate: vi.fn(),
            mutateAsync: vi.fn()
        },
        ueberschreibeEinsatztagebuchEintrag: {
            mutate: vi.fn(),
            mutateAsync: vi.fn()
        }
    };

    const mockFahrzeugeHook = {
        fahrzeuge: {
            data: {
                fahrzeugeImEinsatz: []
            },
            isLoading: false,
            error: null
        },
        error: null,
        refreshFahrzeuge: vi.fn()
    };

    beforeEach(() => {
        // Mock-Implementierungen zurücksetzen
        vi.clearAllMocks();

        // Standard-Mock-Implementierungen setzen
        (useEinsatztagebuch as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockEtbHook);
        (useFahrzeuge as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockFahrzeugeHook);

        // Für den Mobile-Check einen festen Wert zurückgeben (Desktop)
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1024 // Desktop-Breite
        });
    });

    it('sollte die Komponente korrekt rendern', () => {
        render(<ETBOverview />);

        // Prüfen, ob die Hauptkomponenten gerendert werden
        expect(screen.getByText('Überschriebene Einträge anzeigen:')).toBeInTheDocument();

        // Der Switch für überschriebene Einträge sollte initial auf "aus" stehen
        const toggleSwitch = screen.getByTestId('toggle-ueberschrieben-switch');
        expect(toggleSwitch).toBeInTheDocument();
        expect(toggleSwitch).toHaveAttribute('aria-checked', 'false');
    });

    it('sollte den useEinsatztagebuch-Hook mit den korrekten Parametern aufrufen', () => {
        render(<ETBOverview />);

        // Initial sollte der Hook ohne includeUeberschrieben aufgerufen werden
        expect(useEinsatztagebuch).toHaveBeenCalledWith({ includeUeberschrieben: false });

        // Switch umschalten
        const toggleSwitch = screen.getByTestId('toggle-ueberschrieben-switch');
        fireEvent.click(toggleSwitch);

        // Nach dem Umschalten sollte der Hook mit includeUeberschrieben=true aufgerufen werden
        expect(useEinsatztagebuch).toHaveBeenCalledWith({ includeUeberschrieben: true });
    });

    it('sollte den Überschreibe-Dialog korrekt anzeigen', () => {
        render(<ETBOverview />);

        // Mock-ETBTable sollte angezeigt werden
        expect(screen.getByTestId('mock-etb-table')).toBeInTheDocument();

        // Überschreiben-Button drücken
        const ueberschreibenButton = screen.getByTestId('ueberschreiben-button');
        fireEvent.click(ueberschreibenButton);

        // Dialog-Titel sollte korrekt angezeigt werden
        expect(screen.getByText(/Eintrag 1 von 10 JAN 2023 12:00Z überschreiben/)).toBeInTheDocument();
    });
}); 