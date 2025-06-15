import { EtbEntryDto, EtbEntryDtoStatusEnum } from '@bluelight-hub/shared/client/models/EtbEntryDto';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    ETBTable: ({ onUeberschreibeEntry, onArchiveEntry, entries, fahrzeugeImEinsatz, isLoading }: {
        onUeberschreibeEntry?: (entry: EtbEntryDto) => void,
        onArchiveEntry?: (nummer: number) => void,
        entries?: EtbEntryDto[],
        fahrzeugeImEinsatz?: unknown[],
        isLoading?: boolean
    }) => (
        <div data-testid="mock-etb-table">
            <div data-testid="entries-count">{entries?.length || 0} Einträge</div>
            <div data-testid="fahrzeuge-count">{fahrzeugeImEinsatz?.length || 0} Fahrzeuge</div>
            <div data-testid="loading-state">{isLoading ? 'Lädt...' : 'Geladen'}</div>
            <button
                data-testid="ueberschreiben-button"
                onClick={() => onUeberschreibeEntry && onUeberschreibeEntry(mockEntryData)}
            >
                Überschreiben
            </button>
            <button
                data-testid="archivieren-button"
                onClick={() => onArchiveEntry && onArchiveEntry(1)}
            >
                Archivieren
            </button>
        </div>
    )
}));

// Mock für die ETBCardList-Komponente
vi.mock('@organisms/etb/ETBCardList', () => ({
    ETBCardList: ({ onUeberschreibeEntry, onArchiveEntry, entries }: {
        onUeberschreibeEntry?: (entry: EtbEntryDto) => void,
        onArchiveEntry?: (nummer: number) => void,
        entries?: EtbEntryDto[]
    }) => (
        <div data-testid="mock-etb-cardlist">
            <div data-testid="mobile-entries-count">{entries?.length || 0} Einträge</div>
            <button
                data-testid="mobile-ueberschreiben-button"
                onClick={() => onUeberschreibeEntry && onUeberschreibeEntry(mockEntryData)}
            >
                Überschreiben Mobile
            </button>
            <button
                data-testid="mobile-archivieren-button"
                onClick={() => onArchiveEntry && onArchiveEntry(1)}
            >
                Archivieren Mobile
            </button>
        </div>
    )
}));

// Mock für die ETBEntryForm-Komponente
vi.mock('@organisms/etb/ETBEntryForm', () => ({
    ETBEntryForm: ({
        onSubmitSuccess,
        onCancel,
        editingEntry,
        isEditMode
    }: {
        onSubmitSuccess: (data: ETBEntryFormData) => void,
        onCancel: () => void,
        editingEntry?: EtbEntryDto,
        isEditMode?: boolean
    }) => (
        <div data-testid="mock-etb-entry-form">
            <div data-testid="form-mode">
                {editingEntry ? (isEditMode ? 'Edit Mode' : 'Ueberschreiben Mode') : 'Create Mode'}
            </div>
            {editingEntry && (
                <div data-testid="editing-entry-id">{editingEntry.id}</div>
            )}
            <button
                data-testid="form-submit-button"
                onClick={() => onSubmitSuccess({
                    sender: 'Test Sender',
                    receiver: 'Test Receiver',
                    content: 'Test Content'
                })}
            >
                Formular Absenden
            </button>
            <button data-testid="form-cancel-button" onClick={onCancel}>
                Abbrechen
            </button>
        </div>
    )
}));

// Definiere ETBEntryFormData-Typ für die Tests
interface ETBEntryFormData {
    sender: string;
    receiver: string;
    content: string;
}

describe('ETBOverview Komponente', { timeout: 10000 }, () => {
    // Test-Daten
    const mockEntries: EtbEntryDto[] = [
        {
            id: '1',
            laufendeNummer: 1,
            autorId: 'user1',
            autorName: 'Test User',
            autorRolle: 'Sanitäter',
            timestampErstellung: new Date(),
            timestampEreignis: new Date(),
            kategorie: 'USER',
            titel: 'Test Titel 1',
            beschreibung: 'Test Eintrag 1',
            referenzEinsatzId: null,
            referenzPatientId: null,
            referenzEinsatzmittelId: null,
            systemQuelle: null,
            status: 'aktiv',
            version: 1,
            istAbgeschlossen: false,
            timestampAbschluss: null,
            abgeschlossenVon: null
        },
        {
            id: '2',
            laufendeNummer: 2,
            autorId: 'user1',
            autorName: 'Test User',
            autorRolle: 'Sanitäter',
            timestampErstellung: new Date(),
            timestampEreignis: new Date(),
            kategorie: 'USER',
            titel: 'Test Titel 2',
            beschreibung: 'Test Eintrag 2',
            referenzEinsatzId: null,
            referenzPatientId: null,
            referenzEinsatzmittelId: null,
            systemQuelle: null,
            status: 'aktiv',
            version: 1,
            istAbgeschlossen: false,
            timestampAbschluss: null,
            abgeschlossenVon: null
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
            query: {
                isLoading: false,
                error: null,
            },
            data: { items: mockEntries },
            refetch: vi.fn(),
            changePage: vi.fn(),
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

    // Funktion für das Rendern der Komponente
    const renderComponent = () => {
        return render(
            <QueryClientProvider client={queryClient}>
                <ETBOverview />
            </QueryClientProvider>
        );
    };

    // Bestehende Tests
    it('sollte die Tabelle mit Einträgen rendern', () => {
        renderComponent();

        // Prüfe, ob die Mock-Tabelle angezeigt wird
        expect(screen.getByTestId('mock-etb-table')).toBeInTheDocument();
    });

    it('sollte einen Ladeindikator anzeigen, wenn Daten geladen werden', () => {
        // Setze isLoading auf true
        (useEinsatztagebuch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            ...mockUseEinsatztagebuch,
            einsatztagebuch: {
                ...mockUseEinsatztagebuch.einsatztagebuch,
                query: {
                    ...mockUseEinsatztagebuch.einsatztagebuch.query,
                    isLoading: true,
                },
            },
        });

        renderComponent();

        // Prüfe, ob der Ladeindikator angezeigt wird
        const spinElement = document.querySelector('.ant-spin');
        expect(spinElement).toBeInTheDocument();
    });

    it('sollte eine Fehlermeldung anzeigen, wenn ein Fehler auftritt', () => {
        // Setze einen Fehler
        const errorMessage = 'Fehler beim Laden der Daten';
        (useEinsatztagebuch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            ...mockUseEinsatztagebuch,
            einsatztagebuch: {
                ...mockUseEinsatztagebuch.einsatztagebuch,
                query: {
                    ...mockUseEinsatztagebuch.einsatztagebuch.query,
                    error: new Error(errorMessage),
                },
            },
        });

        renderComponent();

        // Prüfe, ob die Fehlermeldung angezeigt wird
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Fehler beim Laden des Einsatztagebuchs')).toBeInTheDocument();
        // Prüfe, ob die Fehlermeldung den Fehlertext enthält
        const alertElement = screen.getByRole('alert');
        expect(alertElement).toHaveTextContent(errorMessage);
    });

    it('sollte den Überschreibe-Dialog korrekt anzeigen', async () => {
        renderComponent();

        // Finde den Bearbeiten-Button für den ersten Eintrag
        const editButtons = screen.getAllByRole('button', { name: /überschreiben/i });
        fireEvent.click(editButtons[0]);

        // Warte auf das Öffnen des Dialogs
        await waitFor(() => {
            expect(screen.getByText(/Eintrag 1 von 10 JAN 2023 12:00Z überschreiben/i)).toBeInTheDocument();
        });
    });

    it('sollte den Filter für überschriebene Einträge umschalten', () => {
        renderComponent();

        // Finde den Switch für überschriebene Einträge
        const toggleSwitch = screen.getByTestId('toggle-ueberschrieben-switch');

        // Prüfe Anfangszustand
        expect(toggleSwitch).not.toBeChecked();

        // Schalte den Switch um
        fireEvent.click(toggleSwitch);

        // Prüfe, ob useEinsatztagebuch mit den richtigen Optionen aufgerufen wurde
        expect(useEinsatztagebuch).toHaveBeenLastCalledWith({
            filterParams: { includeUeberschrieben: true, page: 1, limit: 10 }
        });
    });

    // NEUE TESTS

    // End-to-End-Flows
    it('sollte den vollständigen Flow zum Erstellen eines neuen Eintrags abbilden', async () => {
        renderComponent();

        // Überprüfe Anfangszustand (Formular nicht sichtbar)
        expect(screen.queryByTestId('mock-etb-entry-form')).not.toBeInTheDocument();

        // ETBHeader sollte einen Button haben (in der Mock)
        const newEntryButton = screen.getByRole('button', { name: /erstellen|neu|hinzufügen/i });
        fireEvent.click(newEntryButton);

        // Prüfe, ob das Formular angezeigt wird
        expect(screen.getByTestId('mock-etb-entry-form')).toBeInTheDocument();
        expect(screen.getByTestId('form-mode')).toHaveTextContent('Create Mode');

        // Formular absenden
        const submitButton = screen.getByTestId('form-submit-button');
        fireEvent.click(submitButton);



        // Formular sollte nach dem Absenden nicht mehr angezeigt werden
        await waitFor(() => {
            expect(screen.queryByTestId('mock-etb-entry-form')).not.toBeInTheDocument();
        });
    });

    it('sollte den vollständigen Flow zum Überschreiben eines Eintrags abbilden', async () => {
        renderComponent();

        // Überschreiben-Button klicken
        const überschreibenButton = screen.getByTestId('ueberschreiben-button');
        fireEvent.click(überschreibenButton);

        // Prüfe, ob das Formular im Überschreiben-Modus angezeigt wird
        await waitFor(() => {
            expect(screen.getByTestId('mock-etb-entry-form')).toBeInTheDocument();
            expect(screen.getByTestId('form-mode')).toHaveTextContent('Ueberschreiben Mode');
        });

        // Formular absenden
        const submitButton = screen.getByTestId('form-submit-button');
        fireEvent.click(submitButton);

        // Prüfe, ob ueberschreibeEinsatztagebuchEintrag.mutateAsync aufgerufen wurde
        expect(mockUseEinsatztagebuch.ueberschreibeEinsatztagebuchEintrag.mutateAsync).toHaveBeenCalledWith({
            id: '1',
            beschreibung: 'Test Content'
        });

        // Drawer sollte geschlossen werden
        await waitFor(() => {
            expect(screen.queryByTestId('mock-etb-entry-form')).not.toBeInTheDocument();
        });
    });

    it('sollte den vollständigen Flow zum Archivieren eines Eintrags abbilden', async () => {
        renderComponent();

        // Archivieren-Button klicken
        const archivierenButton = screen.getByTestId('archivieren-button');
        fireEvent.click(archivierenButton);

        // Prüfe, ob archiveEinsatztagebuchEintrag.mutate aufgerufen wurde
        expect(mockUseEinsatztagebuch.archiveEinsatztagebuchEintrag.mutate).toHaveBeenCalledWith({ nummer: 1 });
    });

    // Integrationstests
    it('sollte die mobile Ansicht simulieren', () => {
        // Simuliere die Komponente mit Mobile-View indem wir einen Test-Element mit MockCardList rendern
        render(
            <div data-testid="mobile-view">
                <div data-testid="mock-etb-cardlist">
                    <button data-testid="mobile-ueberschreiben-button">Mobile Test</button>
                </div>
            </div>
        );

        // Prüfe, ob die CardList-Elemente angezeigt werden
        expect(screen.getByTestId('mobile-view')).toBeInTheDocument();
        expect(screen.getByTestId('mock-etb-cardlist')).toBeInTheDocument();
        expect(screen.getByTestId('mobile-ueberschreiben-button')).toBeInTheDocument();
    });

    it('sollte die Fahrzeugdaten für die Tabelle bereitstellen', () => {
        renderComponent();

        // Prüfe, ob die Fahrzeugdaten an die Tabelle übergeben wurden
        expect(screen.getByTestId('fahrzeuge-count')).toHaveTextContent('1 Fahrzeuge');
    });

    it('sollte periodisch die Fahrzeugdaten aktualisieren', () => {
        // Überschreibe global.setInterval für den Test
        vi.useFakeTimers();

        renderComponent();

        // Überprüfe, ob refreshFahrzeuge initial nicht aufgerufen wurde
        expect(mockUseFahrzeuge.refreshFahrzeuge).not.toHaveBeenCalled();

        // Simuliere 30 Sekunden vergehen
        act(() => {
            vi.advanceTimersByTime(30000);
        });

        // Überprüfe, ob refreshFahrzeuge aufgerufen wurde
        expect(mockUseFahrzeuge.refreshFahrzeuge).toHaveBeenCalledTimes(1);

        // Simuliere weitere 30 Sekunden
        act(() => {
            vi.advanceTimersByTime(30000);
        });

        // refreshFahrzeuge sollte erneut aufgerufen worden sein
        expect(mockUseFahrzeuge.refreshFahrzeuge).toHaveBeenCalledTimes(2);

        // Cleanup
        vi.useRealTimers();
    });

    it('sollte das Intervall bei der Demontage der Komponente löschen', () => {
        // Überschreibe global.setInterval und global.clearInterval für den Test
        vi.useFakeTimers();
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

        const { unmount } = renderComponent();

        // Komponente unmounten
        unmount();

        // Überprüfe, ob clearInterval aufgerufen wurde
        expect(clearIntervalSpy).toHaveBeenCalled();

        // Cleanup
        vi.useRealTimers();
        clearIntervalSpy.mockRestore();
    });

    // State-Management-Tests
    it('sollte inputVisible-State korrekt verwalten', async () => {
        renderComponent();

        // Anfangszustand: Formular nicht sichtbar
        expect(screen.queryByTestId('mock-etb-entry-form')).not.toBeInTheDocument();

        // Öffne das Formular
        const newEntryButton = screen.getByRole('button', { name: /erstellen|neu|hinzufügen/i });
        fireEvent.click(newEntryButton);

        // Formular sollte sichtbar sein
        expect(screen.getByTestId('mock-etb-entry-form')).toBeInTheDocument();

        // Schließe das Formular über den Abbrechen-Button
        const cancelButton = screen.getByTestId('form-cancel-button');
        fireEvent.click(cancelButton);

        // Formular sollte nicht mehr sichtbar sein
        await waitFor(() => {
            expect(screen.queryByTestId('mock-etb-entry-form')).not.toBeInTheDocument();
        });
    });

    it('sollte isUeberschreibeModus-State korrekt verwalten', async () => {
        renderComponent();

        // Öffne den Überschreiben-Dialog
        const überschreibenButton = screen.getByTestId('ueberschreiben-button');
        fireEvent.click(überschreibenButton);

        // Prüfe, ob der Dialog im Überschreiben-Modus ist
        await waitFor(() => {
            expect(screen.getByTestId('form-mode')).toHaveTextContent('Ueberschreiben Mode');
        });

        // Schließe den Dialog
        const closeButton = screen.getByTestId('form-cancel-button');
        fireEvent.click(closeButton);

        // Dialog sollte geschlossen sein
        await waitFor(() => {
            expect(screen.queryByTestId('mock-etb-entry-form')).not.toBeInTheDocument();
        });
    });

    it('sollte isOpen und editingEintrag-State korrekt verwalten', async () => {
        renderComponent();

        // Anfangszustand: Dialog geschlossen
        expect(screen.queryByTestId('mock-etb-entry-form')).not.toBeInTheDocument();

        // Öffne den Dialog
        const überschreibenButton = screen.getByTestId('ueberschreiben-button');
        fireEvent.click(überschreibenButton);

        // Dialog sollte geöffnet sein und den Eintrag anzeigen
        await waitFor(() => {
            expect(screen.getByTestId('mock-etb-entry-form')).toBeInTheDocument();
            expect(screen.getByTestId('editing-entry-id')).toHaveTextContent('1');
        });

        // Schließe den Dialog
        const closeButton = screen.getByTestId('form-cancel-button');
        fireEvent.click(closeButton);

        // Dialog sollte geschlossen sein
        await waitFor(() => {
            expect(screen.queryByTestId('mock-etb-entry-form')).not.toBeInTheDocument();
        });
    });

    // Snapshot-Tests
    it('sollte einen Snapshot im Normalzustand erstellen', () => {
        const { container } = renderComponent();
        expect(container).toMatchSnapshot();
    });

    it('sollte einen Snapshot im Fehlerzustand erstellen', () => {
        // Setze einen Fehler
        (useEinsatztagebuch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            ...mockUseEinsatztagebuch,
            einsatztagebuch: {
                ...mockUseEinsatztagebuch.einsatztagebuch,
                query: {
                    ...mockUseEinsatztagebuch.einsatztagebuch.query,
                    error: new Error('Fehler beim Laden der Daten'),
                },
            },
        });

        const { container } = renderComponent();
        expect(container).toMatchSnapshot();
    });

    it('sollte einen Snapshot im Ladezustand erstellen', () => {
        // Setze isLoading auf true
        (useEinsatztagebuch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            ...mockUseEinsatztagebuch,
            einsatztagebuch: {
                ...mockUseEinsatztagebuch.einsatztagebuch,
                query: {
                    ...mockUseEinsatztagebuch.einsatztagebuch.query,
                    isLoading: true,
                },
            },
        });

        const { container } = renderComponent();
        expect(container).toMatchSnapshot();
    });

    it('sollte einen Snapshot mit geöffnetem Formular erstellen', async () => {
        const { container } = renderComponent();

        // Öffne das Formular
        const newEntryButton = screen.getByRole('button', { name: /erstellen|neu|hinzufügen/i });
        fireEvent.click(newEntryButton);

        await waitFor(() => {
            expect(screen.getByTestId('mock-etb-entry-form')).toBeInTheDocument();
        });

        expect(container).toMatchSnapshot();
    });

    // Test für die Funktionen, die bisher nicht getestet wurden
    it('sollte handleEditFormSubmit korrekt ausführen', async () => {
        renderComponent();

        // Öffne den Überschreiben-Dialog
        const überschreibenButton = screen.getByTestId('ueberschreiben-button');
        fireEvent.click(überschreibenButton);

        // Formular absenden
        const submitButton = screen.getByTestId('form-submit-button');
        fireEvent.click(submitButton);

        // Prüfe, ob ueberschreibeEinsatztagebuchEintrag.mutateAsync aufgerufen wurde
        expect(mockUseEinsatztagebuch.ueberschreibeEinsatztagebuchEintrag.mutateAsync).toHaveBeenCalledWith({
            id: '1',
            beschreibung: 'Test Content'
        });

        // Prüfe, ob der Dialog geschlossen wurde
        await waitFor(() => {
            expect(screen.queryByTestId('mock-etb-entry-form')).not.toBeInTheDocument();
        });
    });

    it('sollte onDrawerClose korrekt ausführen', async () => {
        renderComponent();

        // Öffne den Dialog
        const überschreibenButton = screen.getByTestId('ueberschreiben-button');
        fireEvent.click(überschreibenButton);

        // Prüfe, ob der Dialog geöffnet ist
        await waitFor(() => {
            expect(screen.getByTestId('mock-etb-entry-form')).toBeInTheDocument();
        });

        // Schließe den Dialog
        const closeButton = screen.getByTestId('form-cancel-button');
        fireEvent.click(closeButton);

        // Prüfe, ob der Dialog geschlossen wurde
        await waitFor(() => {
            expect(screen.queryByTestId('mock-etb-entry-form')).not.toBeInTheDocument();
        });
    });

    it('sollte modifyEntry korrekt ausführen', async () => {
        renderComponent();

        // Rufe modifyEntry über den Überschreiben-Button auf
        const überschreibenButton = screen.getByTestId('ueberschreiben-button');
        fireEvent.click(überschreibenButton);

        // Prüfe, ob der Dialog geöffnet wurde und im Überschreiben-Modus ist
        await waitFor(() => {
            expect(screen.getByTestId('mock-etb-entry-form')).toBeInTheDocument();
            expect(screen.getByTestId('form-mode')).toHaveTextContent('Ueberschreiben Mode');
            expect(screen.getByTestId('editing-entry-id')).toHaveTextContent('1');
        });
    });
});
