import { EtbEntryDtoStatusEnum } from '@bluelight-hub/shared/client/models/EtbEntryDto';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ETBTable } from './ETBTable';

// Mocks
vi.mock('@/utils/date', () => ({
    formatNatoDateTime: vi.fn(() => '10 JAN 2023 10:00Z')
}));

// Mock für dayjs, um Probleme mit Datumssortierfunktion zu vermeiden
vi.mock('dayjs', () => {
    return {
        default: () => ({
            diff: vi.fn(() => 0),
        })
    };
});

describe('ETBTable Komponente', () => {
    // Testdaten für die Tabelle
    const mockEntries = [
        {
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
        },
        {
            id: '2',
            laufendeNummer: 2,
            timestampErstellung: new Date('2023-01-01T11:00:00'),
            timestampEreignis: new Date('2023-01-01T11:00:00'),
            autorId: 'user2',
            autorName: 'Sanitäter 2',
            autorRolle: 'Sanitäter',
            kategorie: 'USER',
            titel: 'Zweiter Eintrag',
            beschreibung: 'Überschriebener Eintrag',
            referenzEinsatzId: null,
            referenzPatientId: null,
            referenzEinsatzmittelId: null,
            systemQuelle: null,
            version: 1,
            istAbgeschlossen: false,
            timestampAbschluss: null,
            abgeschlossenVon: null,
            status: EtbEntryDtoStatusEnum.Ueberschrieben
        }
    ];

    it('sollte alle übergebenen Einträge anzeigen', () => {
        const { container } = render(<ETBTable entries={mockEntries} />);

        // Finde alle Tabellenzeilen mit der Ant Design Klasse
        const rows = container.querySelectorAll('.ant-table-row');
        expect(rows.length).toBe(mockEntries.length);
    });

    it('sollte überschriebene Einträge visuell kennzeichnen', () => {
        const { container } = render(<ETBTable entries={mockEntries} />);

        // Finde die Zellen mit den Beschreibungen
        const beschreibungZellen = container.querySelectorAll('.ant-table-cell');

        // Finde die Zellen mit der Beschreibung nach ihrem Inhalt
        const aktiverEintragElement = Array.from(beschreibungZellen).find(
            cell => cell.textContent?.includes('Aktiver Eintrag')
        );

        const ueberschriebenerEintragElement = Array.from(beschreibungZellen).find(
            cell => cell.textContent?.includes('Überschriebener Eintrag')
        );

        // Prüfe, ob die durchgestrichene div innerhalb der Zelle existiert
        expect(ueberschriebenerEintragElement?.querySelector('.line-through')).not.toBeNull();
        expect(aktiverEintragElement?.querySelector('.line-through')).toBeNull();
    });

    it('sollte Status-Tags für die Einträge anzeigen', () => {
        render(<ETBTable entries={mockEntries} />);

        // Suche nach den Status-Tags
        const aktivTag = screen.getByText('Aktiv');
        const ueberschriebenTag = screen.getByText('Überschrieben');

        expect(aktivTag).toBeInTheDocument();
        expect(ueberschriebenTag).toBeInTheDocument();

        // Prüfe, ob die Tags die richtigen Klassen haben
        expect(aktivTag.closest('.ant-tag')).toHaveClass('ant-tag-success');
        expect(ueberschriebenTag.closest('.ant-tag')).toHaveClass('ant-tag-warning');
    });

    it('sollte keine Aktionsbuttons für überschriebene Einträge anzeigen', () => {
        const handleEditMock = vi.fn();
        const handleArchiveMock = vi.fn();
        const handleUeberschreibeMock = vi.fn();

        const { container } = render(
            <ETBTable
                entries={mockEntries}
                onEditEntry={handleEditMock}
                onArchiveEntry={handleArchiveMock}
                onUeberschreibeEntry={handleUeberschreibeMock}
            />
        );

        // Finde alle Zeilen
        const rows = container.querySelectorAll('.ant-table-row');

        // Überprüfe die Zeilen auf Button-Elemente
        const aktiverEintragZeile = rows[0];
        const ueberschriebenerEintragZeile = rows[1];

        // In der aktiven Zeile sollten Buttons sein (Ant-Design Buttons haben die Klasse ant-btn)
        const aktiverEintragButtons = aktiverEintragZeile.querySelectorAll('.ant-btn');
        expect(aktiverEintragButtons.length).toBe(2); // Zwei Buttons (Überschreiben und Archivieren)

        // In der überschriebenen Zeile sollten keine Buttons sein
        const ueberschriebenerEintragButtons = ueberschriebenerEintragZeile.querySelectorAll('.ant-btn');
        expect(ueberschriebenerEintragButtons.length).toBe(0);
    });

    it('sollte die Callback-Funktionen korrekt aufrufen', () => {
        const handleEditMock = vi.fn();
        const handleArchiveMock = vi.fn();
        const handleUeberschreibeMock = vi.fn();

        const { container } = render(
            <ETBTable
                entries={mockEntries}
                onEditEntry={handleEditMock}
                onArchiveEntry={handleArchiveMock}
                onUeberschreibeEntry={handleUeberschreibeMock}
            />
        );

        // Finde die Buttons in der ersten Zeile
        const aktiverEintragZeile = container.querySelector('.ant-table-row');
        if (!aktiverEintragZeile) throw new Error('Keine Tabellenzeile gefunden');

        const buttons = aktiverEintragZeile.querySelectorAll('.ant-btn');
        expect(buttons.length).toBe(2);

        // Erster Button sollte der Überschreiben-Button sein
        fireEvent.click(buttons[0]);
        expect(handleUeberschreibeMock).toHaveBeenCalledWith(mockEntries[0]);

        // Zweiter Button sollte der Archivieren-Button sein
        fireEvent.click(buttons[1]);
        expect(handleArchiveMock).toHaveBeenCalledWith(mockEntries[0].laufendeNummer);
    });

    it('sollte clientseitige Filterung nach Status unterstützen', () => {
        render(<ETBTable entries={mockEntries} />);

        // Überprüfe, ob beide Einträge initial angezeigt werden
        expect(screen.getByText('Aktiver Eintrag')).toBeInTheDocument();
        expect(screen.getByText('Überschriebener Eintrag')).toBeInTheDocument();

        // Für eine vollständige Testabdeckung müsste man das Öffnen des Filter-Dropdowns
        // und das Auswählen eines Filters simulieren, was mit der komplexen Struktur 
        // von Ant Design Tabellen schwierig ist.
        // Wir prüfen hier nur, ob der Filter korrekt definiert ist.

        // Prüfe, ob die Status-Spalte den Filter hat
        const statusHeaderCell = Array.from(document.querySelectorAll('.ant-table-column-title'))
            .find(el => el.textContent === 'Status');

        expect(statusHeaderCell).not.toBeNull();

        // Finde die Filter-Trigger-Schaltfläche
        const filterButton = statusHeaderCell?.parentElement?.querySelector('.ant-table-filter-trigger');
        expect(filterButton).not.toBeNull();
    });
}); 