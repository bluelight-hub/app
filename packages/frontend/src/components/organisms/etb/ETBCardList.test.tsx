import * as dateUtils from '@/utils/date';
import { logger } from '@/utils/logger';
import { EtbEntryDto, EtbEntryDtoStatusEnum, EtbKategorie } from '@bluelight-hub/shared/client';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, MockedFunction, vi } from 'vitest';
import { ETBCardList } from './ETBCardList';

// Mock der logger-Funktionen
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock für die formatNatoDateTime-Funktion
vi.mock('@/utils/date', () => ({
  formatNatoDateTime: vi.fn(),
}));

// Mock für Ant Design Komponenten
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    Empty: ({ description }: { description: string }) => <div data-testid="mock-empty">{description}</div>,
    Tag: ({ children, color }: { children: React.ReactNode; color?: string }) => (
      <span data-testid="mock-tag" data-color={color}>
        {children}
      </span>
    ),
    Button: (props: {
      onClick?: () => void;
      children?: React.ReactNode;
      icon?: React.ReactNode;
      'data-testid'?: string;
    }) => (
      <button data-testid={props['data-testid']} onClick={props.onClick}>
        {props.children}
        {props.icon && 'Icon'}
      </button>
    ),
    Tooltip: ({ title, children }: { title: string; children: React.ReactNode }) => (
      <div data-testid="mock-tooltip" data-title={title}>
        {children}
      </div>
    ),
  };
});

describe('ETBCardList', () => {
  const mockOnEditEntry = vi.fn();
  const mockOnArchiveEntry = vi.fn();
  const mockOnUeberschreibeEntry = vi.fn();

  // Erstelle einen Mock-Eintrag basierend auf echten EtbEntryDto Properties
  const createMockEntry = (overrides: Partial<EtbEntryDto> = {}): EtbEntryDto => ({
    id: 'test-id-1',
    laufendeNummer: 1,
    timestampErstellung: new Date('2023-01-01T10:00:00Z'),
    timestampEreignis: new Date('2023-01-01T09:30:00Z'),
    autorId: 'author-1',
    autorName: 'Max Mustermann',
    autorRolle: 'Einsatzleiter',
    kategorie: EtbKategorie.Meldung,
    inhalt: 'Dies ist ein Testeintrag',
    referenzEinsatzId: 'einsatz-1',
    referenzPatientId: null,
    referenzEinsatzmittelId: null,
    systemQuelle: 'TEST',
    version: 1,
    istAbgeschlossen: false,
    timestampAbschluss: null,
    abgeschlossenVon: null,
    status: EtbEntryDtoStatusEnum.Aktiv,
    sender: 'Max Mustermann',
    receiver: 'Einsatzleitung',
    ...overrides,
  });

  beforeEach(() => {
    vi.resetAllMocks();
    (dateUtils.formatNatoDateTime as MockedFunction<typeof dateUtils.formatNatoDateTime>).mockImplementation(
      () => '01100023jan23',
    );
  });

  test('sollte "Keine Einträge verfügbar" anzeigen, wenn die Liste leer ist', () => {
    render(<ETBCardList entries={[]} />);

    expect(screen.getByText('Keine Einträge verfügbar')).toBeInTheDocument();
  });

  test('sollte alle Einträge korrekt anzeigen', () => {
    const entries = [
      createMockEntry({ id: 'test-id-1', laufendeNummer: 1 }),
      createMockEntry({
        id: 'test-id-2',
        laufendeNummer: 2,
        inhalt: 'Zweiter Eintrag',
        kategorie: EtbKategorie.Lagemeldung,
      }),
    ];

    render(<ETBCardList entries={entries} />);

    // Prüfe, ob die Nummern korrekt angezeigt werden
    expect(screen.getByText(/#1 \| Meldung/)).toBeInTheDocument();
    expect(screen.getByText(/#2 \| Lagemeldung/)).toBeInTheDocument();

    // Prüfe, ob die Inhalte korrekt sind
    expect(screen.getByText('Dies ist ein Testeintrag')).toBeInTheDocument();
    expect(screen.getByText('Zweiter Eintrag')).toBeInTheDocument();
  });

  test('sollte Einträge mit fehlenden Feldern korrekt anzeigen', () => {
    // Eintrag mit minimalen Feldern
    const entryWithMissingFields = createMockEntry({
      sender: null, // sender kann null sein
      inhalt: 'Inhalt ohne vollständige Struktur',
    });

    render(<ETBCardList entries={[entryWithMissingFields]} />);

    // Prüfen, ob der Inhalt korrekt angezeigt wird
    expect(screen.getByText('Inhalt ohne vollständige Struktur')).toBeInTheDocument();

    // Prüfen, ob "Unbekannt" für fehlenden sender angezeigt wird
    expect(screen.getByText('Absender: Unbekannt')).toBeInTheDocument();
    expect(screen.getByText('Empfänger: Einsatzleitung')).toBeInTheDocument();
  });

  test('sollte überschriebene Einträge korrekt anzeigen', () => {
    const überschriebenerEintrag = createMockEntry({
      inhalt: 'Überschriebener Eintrag',
      status: EtbEntryDtoStatusEnum.Ueberschrieben,
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
    expect(errorSpy).toHaveBeenCalledWith('Fehler beim Formatieren des Datums:', expect.any(Error));

    // Prüfen, ob der Fallback-Wert angezeigt wird
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  test('sollte den onEditEntry-Callback korrekt aufrufen', () => {
    const entry = createMockEntry();
    render(<ETBCardList entries={[entry]} onEditEntry={mockOnEditEntry} />);

    // Finde den Edit-Button mit data-testid
    const editButton = screen.getByTestId('edit-button');
    fireEvent.click(editButton);

    // Prüfen, ob der Callback aufgerufen wurde
    expect(mockOnEditEntry).toHaveBeenCalledWith(entry);
  });

  test('sollte den onArchiveEntry-Callback korrekt aufrufen', () => {
    const entry = createMockEntry({
      laufendeNummer: 42,
    });

    render(<ETBCardList entries={[entry]} onArchiveEntry={mockOnArchiveEntry} />);

    // Finde den Archive-Button mit data-testid
    const archiveButton = screen.getByTestId('archive-button');
    fireEvent.click(archiveButton);

    // Prüfen, ob der Callback mit der laufendeNummer aufgerufen wurde
    expect(mockOnArchiveEntry).toHaveBeenCalledWith(42);
  });

  test('sollte den onUeberschreibeEntry-Callback korrekt aufrufen', () => {
    const entry = createMockEntry();
    render(<ETBCardList entries={[entry]} onUeberschreibeEntry={mockOnUeberschreibeEntry} />);

    // Finde den Überschreiben-Button mit data-testid
    const ueberschreibenButton = screen.getByTestId('ueberschreiben-button');
    fireEvent.click(ueberschreibenButton);

    // Prüfen, ob der Callback aufgerufen wurde
    expect(mockOnUeberschreibeEntry).toHaveBeenCalledWith(entry);
  });

  test('sollte keine Aktions-Buttons für abgeschlossene Einträge anzeigen', () => {
    const abgeschlossenerEntry = createMockEntry({
      istAbgeschlossen: true,
    });

    render(
      <ETBCardList
        entries={[abgeschlossenerEntry]}
        onEditEntry={mockOnEditEntry}
        onArchiveEntry={mockOnArchiveEntry}
        onUeberschreibeEntry={mockOnUeberschreibeEntry}
      />,
    );

    // Es sollten keine Aktions-Buttons vorhanden sein (spezifische Test-IDs prüfen)
    expect(screen.queryByTestId('edit-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('archive-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ueberschreiben-button')).not.toBeInTheDocument();
  });

  test('sollte keine Aktions-Buttons für überschriebene Einträge anzeigen', () => {
    const überschriebenerEintrag = createMockEntry({
      status: EtbEntryDtoStatusEnum.Ueberschrieben,
    });

    render(
      <ETBCardList
        entries={[überschriebenerEintrag]}
        onEditEntry={mockOnEditEntry}
        onArchiveEntry={mockOnArchiveEntry}
        onUeberschreibeEntry={mockOnUeberschreibeEntry}
      />,
    );

    // Es sollten keine Aktions-Buttons vorhanden sein (spezifische Test-IDs prüfen)
    expect(screen.queryByTestId('edit-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('archive-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ueberschreiben-button')).not.toBeInTheDocument();
  });

  test('sollte verschiedene Kategorien korrekt anzeigen', () => {
    const entries = [
      createMockEntry({ kategorie: EtbKategorie.Lagemeldung }),
      createMockEntry({ kategorie: EtbKategorie.Anforderung, laufendeNummer: 2 }),
      createMockEntry({ kategorie: EtbKategorie.AutoKraefte, laufendeNummer: 3 }),
    ];

    render(<ETBCardList entries={entries} />);

    expect(screen.getByText(/#1 \| Lagemeldung/)).toBeInTheDocument();
    expect(screen.getByText(/#2 \| Anforderung/)).toBeInTheDocument();
    expect(screen.getByText(/#3 \| Auto Kräfte/)).toBeInTheDocument();
  });

  // Snapshot Tests
  test('sollte mit Standard-Props dem Snapshot entsprechen', () => {
    const entries = [createMockEntry()];
    const { container } = render(<ETBCardList entries={entries} />);
    expect(container).toMatchSnapshot();
  });

  test('sollte mit leeren Daten dem Snapshot entsprechen', () => {
    const { container } = render(<ETBCardList entries={[]} />);
    expect(container).toMatchSnapshot();
  });
});
