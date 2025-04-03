import * as dateUtils from '@/utils/date';
import { logger } from '@/utils/logger';
import { EtbEntryDto, EtbEntryDtoStatusEnum } from '@bluelight-hub/shared/client';
import { fireEvent, render, screen } from '@testing-library/react';
import { MockedFunction, vi } from 'vitest';
import { ETBCardList } from './ETBCardList';

// Der ETBEntryFields Typ aus der Komponente
type ETBEntryFields = {
    nummer?: number;
    type?: string;
    timestamp?: Date;
    content?: string;
    sender?: string;
    receiver?: string;
    archived?: boolean;
    status?: 'aktiv' | 'ueberschrieben';
};

// Mock der logger-Funktionen
vi.mock('@/utils/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
    }
}));

// Mock für die formatNatoDateTime-Funktion
vi.mock('@/utils/date', () => ({
    formatNatoDateTime: vi.fn()
}));

describe('ETBCardList', () => {
    const mockOnEditEntry = vi.fn();
    const mockOnArchiveEntry = vi.fn();
    const mockOnUeberschreibeEntry = vi.fn();

    // Fixtures - mit zusätzlichen Feldern, die vom ETBEntryFields-Interface erwartet werden
    const createMockEntry = (overrides = {}): EtbEntryDto & ETBEntryFields => ({
        id: 'test-id-1',
        laufendeNummer: 1,
        timestampErstellung: new Date('2023-01-01T10:00:00Z'),
        timestampEreignis: new Date('2023-01-01T09:30:00Z'),
        autorId: 'author-1',
        autorName: 'Max Mustermann',
        autorRolle: 'Einsatzleiter',
        kategorie: 'Standard',
        titel: 'Test Eintrag',
        beschreibung: 'Dies ist ein Testeintrag',
        referenzEinsatzId: 'einsatz-1',
        referenzPatientId: null,
        referenzEinsatzmittelId: null,
        systemQuelle: 'TEST',
        version: 1,
        istAbgeschlossen: false,
        timestampAbschluss: null,
        abgeschlossenVon: null,
        status: EtbEntryDtoStatusEnum.Aktiv,
        // ETBEntryFields zusätzliche Felder
        nummer: 1,
        type: 'Standard',
        timestamp: new Date('2023-01-01T09:30:00Z'),
        content: 'Dies ist ein Testeintrag',
        sender: 'Max Mustermann',
        receiver: 'Einsatzleitung',
        archived: false,
        ...overrides
    });

    beforeEach(() => {
        vi.resetAllMocks();
        (dateUtils.formatNatoDateTime as MockedFunction<typeof dateUtils.formatNatoDateTime>).mockImplementation(() => '01100023jan23');
    });

    test('sollte "Keine Einträge verfügbar" anzeigen, wenn die Liste leer ist', () => {
        render(<ETBCardList entries={[]} />);

        expect(screen.getByText('Keine Einträge verfügbar')).toBeInTheDocument();
    });

    test('sollte alle Einträge korrekt anzeigen', () => {
        const entries = [
            createMockEntry({ id: 'test-id-1', nummer: 1, laufendeNummer: 1 }),
            createMockEntry({ id: 'test-id-2', nummer: 2, laufendeNummer: 2, content: 'Zweiter Eintrag', beschreibung: 'Zweiter Eintrag' })
        ];

        render(<ETBCardList entries={entries} />);

        // Text ist aufgeteilt im DOM, deshalb prüfen wir spezifische Texte
        const nummerElements = screen.getAllByText(/#\d+/);
        expect(nummerElements.length).toBe(2);
        expect(nummerElements[0].textContent).toContain('#1');
        expect(nummerElements[1].textContent).toContain('#2');

        // Prüfen, ob beide Standardtypen vorhanden sind
        const standardElements = screen.getAllByText(/Standard/);
        expect(standardElements.length).toBe(2);

        // Prüfen, ob die Inhalte korrekt sind
        expect(screen.getByText('Dies ist ein Testeintrag')).toBeInTheDocument();
        expect(screen.getByText('Zweiter Eintrag')).toBeInTheDocument();
    });

    test('sollte Einträge mit fehlenden Feldern korrekt anzeigen', () => {
        // Eintrag mit fehlenden Standardfeldern
        const entryWithMissingFields = {
            id: 'missing-fields',
            content: 'Inhalt ohne vollständige Struktur'
        } as unknown as EtbEntryDto;

        render(<ETBCardList entries={[entryWithMissingFields]} />);

        // Prüfen, ob der Inhalt korrekt angezeigt wird
        expect(screen.getByText('Inhalt ohne vollständige Struktur')).toBeInTheDocument();

        // Prüfen, ob die Standardtexte vorhanden sind
        expect(screen.getByText('Absender:')).toBeInTheDocument();
        expect(screen.getByText('Empfänger:')).toBeInTheDocument();
    });

    test('sollte überschriebene Einträge korrekt anzeigen', () => {
        const überschriebenerEintrag = createMockEntry({
            status: EtbEntryDtoStatusEnum.Ueberschrieben,
            content: 'Überschriebener Eintrag'
        });

        render(<ETBCardList entries={[überschriebenerEintrag]} />);

        expect(screen.getByText('Überschrieben')).toBeInTheDocument();
        // Prüfen, ob es ein Element mit der CSS-Klasse line-through gibt
        const überschriebenElement = screen.getByText('Überschriebener Eintrag');
        expect(überschriebenElement.className).toContain('line-through');
    });

    test('sollte Fehler bei der Datumsformatierung behandeln', () => {
        // Logger-Mock für diesen Test explizit überwachen
        const errorSpy = vi.spyOn(logger, 'error');

        // Simulieren eines Fehlers bei der Datumsformatierung
        (dateUtils.formatNatoDateTime as MockedFunction<typeof dateUtils.formatNatoDateTime>).mockImplementation(() => {
            throw new Error('Formatierungsfehler');
        });

        render(<ETBCardList entries={[createMockEntry()]} />);

        // Prüfen, ob der Logger den Fehler korrekt protokolliert hat
        expect(errorSpy).toHaveBeenCalledWith(
            'Fehler beim Formatieren des Datums:',
            expect.any(Error)
        );

        // Prüfen, ob der Fallback-Wert angezeigt wird
        expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });

    test('sollte den onEditEntry-Callback korrekt aufrufen', () => {
        const entry = createMockEntry();
        render(
            <ETBCardList
                entries={[entry]}
                onEditEntry={mockOnEditEntry} />
        );

        // Alle Buttons finden und nach Icon-Inhalt identifizieren
        const buttons = screen.getAllByRole('button');

        // Klicke auf jeden Button und prüfe, welcher den Callback auslöst
        for (const button of buttons) {
            fireEvent.click(button);
        }

        // Prüfen, ob der Callback mindestens einmal aufgerufen wurde
        expect(mockOnEditEntry).toHaveBeenCalledWith(entry);
    });

    test('sollte den onArchiveEntry-Callback korrekt aufrufen', () => {
        const entry = createMockEntry({
            nummer: 42,
            laufendeNummer: 42
        });

        render(
            <ETBCardList
                entries={[entry]}
                onArchiveEntry={mockOnArchiveEntry}
            />
        );

        // Alle Buttons finden und klicken
        const buttons = screen.getAllByRole('button');

        // Klicke auf jeden Button und prüfe, welcher den Callback auslöst
        for (const button of buttons) {
            fireEvent.click(button);
        }

        // Prüfen, ob der Callback mindestens einmal aufgerufen wurde
        expect(mockOnArchiveEntry).toHaveBeenCalledWith(42);
    });

    test('sollte den onUeberschreibeEntry-Callback korrekt aufrufen', () => {
        const entry = createMockEntry();
        render(
            <ETBCardList
                entries={[entry]}
                onUeberschreibeEntry={mockOnUeberschreibeEntry}
            />
        );

        // Alle Buttons finden und klicken
        const buttons = screen.getAllByRole('button');

        // Klicke auf jeden Button und prüfe, welcher den Callback auslöst
        for (const button of buttons) {
            fireEvent.click(button);
        }

        // Prüfen, ob der Callback mindestens einmal aufgerufen wurde
        expect(mockOnUeberschreibeEntry).toHaveBeenCalledWith(entry);
    });

    test('sollte keine Aktions-Buttons für archivierte Einträge anzeigen', () => {
        const archivedEntry = createMockEntry({
            archived: true
        });

        render(
            <ETBCardList
                entries={[archivedEntry]}
                onEditEntry={mockOnEditEntry}
                onArchiveEntry={mockOnArchiveEntry}
                onUeberschreibeEntry={mockOnUeberschreibeEntry}
            />
        );

        // Es sollten keine Button-Elemente vorhanden sein
        expect(screen.queryAllByRole('button').length).toBe(0);
    });

    test('sollte keine Aktions-Buttons für überschriebene Einträge anzeigen', () => {
        const überschriebenerEintrag = createMockEntry({
            status: EtbEntryDtoStatusEnum.Ueberschrieben
        });

        render(
            <ETBCardList
                entries={[überschriebenerEintrag]}
                onEditEntry={mockOnEditEntry}
                onArchiveEntry={mockOnArchiveEntry}
                onUeberschreibeEntry={mockOnUeberschreibeEntry}
            />
        );

        // Es sollten keine Button-Elemente vorhanden sein
        expect(screen.queryAllByRole('button').length).toBe(0);
    });
}); 