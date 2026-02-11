/**
 * Unit Tests fuer EinsatzVergleich Komponente
 *
 * **Story 9.9 ACs:**
 * - AC1: Vergleichbare Einsaetze laden (nur ABGESCHLOSSEN/ARCHIVIERT)
 * - AC2: Einsaetze auswaehlen
 * - AC3: Erinnerungen pro Stunde
 * - AC4: Eskalationsrate
 * - AC5: Durchschnittliche Reaktionszeit
 * - AC6: Visueller Vergleich (Chart bei 2+ Einsaetzen)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EinsatzVergleich } from '../EinsatzVergleich';

// Mock hooks
const mockUseEinsatzVergleich = vi.fn();
const mockUseEinsaetzeQuery = vi.fn();

vi.mock('../../../api/queries', () => ({
  useEinsatzVergleich: (...args: unknown[]) => mockUseEinsatzVergleich(...args),
}));

vi.mock('@/features/einsatz/api/use-einsaetze-query', () => ({
  useEinsaetzeQuery: (...args: unknown[]) => mockUseEinsaetzeQuery(...args),
}));

// Mock Recharts (renders nothing in test env)
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => <div />,
}));

const mockVergleichData = {
  items: [
    {
      einsatzId: 'current-einsatz-id',
      alarmstichwort: 'Brand Lagerhalle',
      alarmierungszeit: '2026-02-01T10:00:00.000Z',
      erinnerungenProStunde: 5.5,
      eskalationsrate: 12.5,
      durchschnittlicheReaktionszeit: 120,
      gesamtErinnerungen: 22,
      dauer: 4.0,
    },
    {
      einsatzId: 'vergleich-einsatz-1',
      alarmstichwort: 'THL Autobahn',
      alarmierungszeit: '2026-01-15T08:00:00.000Z',
      erinnerungenProStunde: 3.2,
      eskalationsrate: 5.0,
      durchschnittlicheReaktionszeit: 60,
      gesamtErinnerungen: 16,
      dauer: 5.0,
    },
  ],
};

const mockEinsaetzeData = {
  data: [
    { id: 'vergleich-einsatz-1', alarmstichwort: 'THL Autobahn', status: 'ABGESCHLOSSEN', alarmierungszeit: '2026-01-15T08:00:00.000Z' },
    { id: 'vergleich-einsatz-2', alarmstichwort: 'Hochwasser', status: 'ARCHIVIERT', alarmierungszeit: '2026-01-10T06:00:00.000Z' },
    { id: 'current-einsatz-id', alarmstichwort: 'Brand Lagerhalle', status: 'IN_BEARBEITUNG', alarmierungszeit: '2026-02-01T10:00:00.000Z' },
    { id: 'laufend-einsatz', alarmstichwort: 'Laufender Einsatz', status: 'ANGELEGT', alarmierungszeit: null },
  ],
};

/**
 * Hilfsfunktion: Oeffnet den Listbox-Selektor und waehlt den Einsatz per Klick.
 * Gibt das userEvent-Objekt zurueck fuer weitere Interaktionen.
 */
async function selectEinsatzInListbox(user: ReturnType<typeof userEvent.setup>, einsatzName: RegExp | string) {
  const listboxButton = screen.getByRole('button', { name: /Einsätze zum Vergleich auswählen|Einsatz\/Einsätze ausgewählt/ });
  await user.click(listboxButton);
  const option = screen.getByRole('option', { name: einsatzName instanceof RegExp ? einsatzName : new RegExp(einsatzName) });
  await user.click(option);
}

describe('EinsatzVergleich', () => {
  beforeEach(() => {
    mockUseEinsatzVergleich.mockReset();
    mockUseEinsaetzeQuery.mockReset();
  });

  // --- Loading State ---

  it('should show skeleton loading state after selecting an Einsatz', async () => {
    // Given
    const user = userEvent.setup();
    mockUseEinsaetzeQuery.mockReturnValue({ data: mockEinsaetzeData });
    mockUseEinsatzVergleich.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    // When
    render(<EinsatzVergleich einsatzId="current-einsatz-id" />);
    await selectEinsatzInListbox(user, /THL Autobahn/);

    // Then - Skeleton loading state sichtbar (animate-pulse Elemente)
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  // --- Error State ---

  it('should show error state with retry button after selecting an Einsatz', async () => {
    // Given
    const mockRefetch = vi.fn();
    const user = userEvent.setup();
    mockUseEinsaetzeQuery.mockReturnValue({ data: mockEinsaetzeData });
    mockUseEinsatzVergleich.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    });

    // When
    render(<EinsatzVergleich einsatzId="current-einsatz-id" />);
    await selectEinsatzInListbox(user, /THL Autobahn/);

    // Then
    expect(screen.getByText('Vergleichsdaten konnten nicht geladen werden.')).toBeInTheDocument();
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
  });

  // --- Empty State (keine abgeschlossenen Einsaetze) ---

  it('should show empty state when no completed Einsaetze available', () => {
    // Given - nur laufende Einsaetze
    mockUseEinsaetzeQuery.mockReturnValue({
      data: {
        data: [{ id: 'current-einsatz-id', alarmstichwort: 'Brand', status: 'IN_BEARBEITUNG', alarmierungszeit: '2026-02-01T10:00:00Z' }],
      },
    });
    mockUseEinsatzVergleich.mockReturnValue({ data: undefined, isLoading: false, isError: false });

    // When
    render(<EinsatzVergleich einsatzId="current-einsatz-id" />);

    // Then
    expect(screen.getByText('Keine abgeschlossenen Einsätze zum Vergleich verfügbar')).toBeInTheDocument();
  });

  // --- AC1: Vergleichbare Einsaetze laden ---

  it('should filter out current einsatz and non-completed einsaetze from selector (AC1)', async () => {
    // Given
    const user = userEvent.setup();
    mockUseEinsaetzeQuery.mockReturnValue({ data: mockEinsaetzeData });
    mockUseEinsatzVergleich.mockReturnValue({ data: undefined, isLoading: false, isError: false });

    // When
    render(<EinsatzVergleich einsatzId="current-einsatz-id" />);
    const listboxButton = screen.getByRole('button', { name: /Einsätze zum Vergleich auswählen/ });
    await user.click(listboxButton);

    // Then - Nur ABGESCHLOSSEN und ARCHIVIERT Einsaetze sichtbar, nicht der aktuelle
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(screen.getByRole('option', { name: /THL Autobahn/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Hochwasser/ })).toBeInTheDocument();
    // current-einsatz-id (IN_BEARBEITUNG) und laufend-einsatz (ANGELEGT) nicht angezeigt
    expect(screen.queryByRole('option', { name: /Brand Lagerhalle/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Laufender Einsatz/ })).not.toBeInTheDocument();
  });

  // --- Keine Auswahl ---

  it('should show "Einsaetze zum Vergleich auswaehlen" when nothing selected', () => {
    // Given
    mockUseEinsaetzeQuery.mockReturnValue({ data: mockEinsaetzeData });
    mockUseEinsatzVergleich.mockReturnValue({ data: undefined, isLoading: false, isError: false });

    // When
    render(<EinsatzVergleich einsatzId="current-einsatz-id" />);

    // Then
    const noSelectionMessages = screen.getAllByText(/Einsätze zum Vergleich auswählen/);
    expect(noSelectionMessages.length).toBeGreaterThanOrEqual(1);
  });

  // --- Collapsible Panel ---

  it('should be expanded by default', () => {
    // Given
    mockUseEinsaetzeQuery.mockReturnValue({ data: mockEinsaetzeData });
    mockUseEinsatzVergleich.mockReturnValue({ data: undefined, isLoading: false, isError: false });

    // When
    render(<EinsatzVergleich einsatzId="current-einsatz-id" />);

    // Then
    const toggleButton = screen.getByRole('button', { name: /Einsatz-Vergleich/ });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  });

  // --- Hook Integration ---

  it('should pass correct parameters to useEinsatzVergleich hook', () => {
    // Given
    mockUseEinsaetzeQuery.mockReturnValue({ data: mockEinsaetzeData });
    mockUseEinsatzVergleich.mockReturnValue({ data: undefined, isLoading: false, isError: false });

    // When
    render(<EinsatzVergleich einsatzId="my-einsatz-id" />);

    // Then
    expect(mockUseEinsatzVergleich).toHaveBeenCalledWith('my-einsatz-id', []);
  });

  // --- Einsaetze-Daten nicht geladen ---

  it('should handle undefined einsaetze data gracefully', () => {
    // Given
    mockUseEinsaetzeQuery.mockReturnValue({ data: undefined });
    mockUseEinsatzVergleich.mockReturnValue({ data: undefined, isLoading: false, isError: false });

    // When
    render(<EinsatzVergleich einsatzId="current-einsatz-id" />);

    // Then
    expect(screen.getByText('Keine abgeschlossenen Einsätze zum Vergleich verfügbar')).toBeInTheDocument();
  });

  // --- AC3/4/5: Metriken-Anzeige mit echten Daten ---

  it('should display table with actual metric values (AC3/4/5)', async () => {
    // Given
    const user = userEvent.setup();
    mockUseEinsaetzeQuery.mockReturnValue({ data: mockEinsaetzeData });
    mockUseEinsatzVergleich.mockReturnValue({
      data: mockVergleichData,
      isLoading: false,
      isError: false,
    });

    // When
    render(<EinsatzVergleich einsatzId="current-einsatz-id" />);
    await selectEinsatzInListbox(user, /THL Autobahn/);

    // Then - Tabelle mit Metriken pruefen
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    // AC3: Erinnerungen pro Stunde
    expect(screen.getByText('5.5')).toBeInTheDocument();
    expect(screen.getByText('3.2')).toBeInTheDocument();

    // AC4: Eskalationsrate
    expect(screen.getByText('12.5%')).toBeInTheDocument();
    expect(screen.getByText('5.0%')).toBeInTheDocument();

    // AC5: Durchschnittliche Reaktionszeit (formatDuration: 120s = 2m 0s, 60s = 1m 0s)
    expect(screen.getByText('2m 0s')).toBeInTheDocument();
    expect(screen.getByText('1m 0s')).toBeInTheDocument();

    // Gesamt-Erinnerungen
    expect(screen.getByText('22')).toBeInTheDocument();
    expect(screen.getByText('16')).toBeInTheDocument();

    // Dauer
    expect(screen.getByText('4.0h')).toBeInTheDocument();
    expect(screen.getByText('5.0h')).toBeInTheDocument();

    // Alarmstichwort (innerhalb der Tabelle pruefen, da Text auch im Listbox-Selektor vorkommt)
    const tableEl = screen.getByRole('table');
    expect(within(tableEl).getByText(/Brand Lagerhalle/)).toBeInTheDocument();
    expect(within(tableEl).getByText(/THL Autobahn/)).toBeInTheDocument();
  });

  // --- AC6: Visueller Vergleich (Chart bei 2+ Einsaetzen) ---

  it('should render chart when 2+ Einsaetze in data (AC6)', async () => {
    // Given - mockVergleichData hat 2 items
    const user = userEvent.setup();
    mockUseEinsaetzeQuery.mockReturnValue({ data: mockEinsaetzeData });
    mockUseEinsatzVergleich.mockReturnValue({
      data: mockVergleichData,
      isLoading: false,
      isError: false,
    });

    // When
    render(<EinsatzVergleich einsatzId="current-einsatz-id" />);
    await selectEinsatzInListbox(user, /THL Autobahn/);

    // Then - BarChart wird gerendert
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('should NOT render chart when only 1 Einsatz in data', async () => {
    // Given - nur 1 item
    const singleItemData = {
      items: [mockVergleichData.items[0]],
    };
    const user = userEvent.setup();
    mockUseEinsaetzeQuery.mockReturnValue({ data: mockEinsaetzeData });
    mockUseEinsatzVergleich.mockReturnValue({
      data: singleItemData,
      isLoading: false,
      isError: false,
    });

    // When
    render(<EinsatzVergleich einsatzId="current-einsatz-id" />);
    await selectEinsatzInListbox(user, /THL Autobahn/);

    // Then - Kein Chart bei nur 1 Einsatz
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    // Tabelle aber schon
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  // --- Eskalationsrate Farbcodierung ---

  it('should show green color for eskalationsrate <= 10%', async () => {
    // Given - eskalationsrate 5.0 (gruen)
    const lowEskalation = {
      items: [{ ...mockVergleichData.items[1], eskalationsrate: 5.0 }],
    };
    const user = userEvent.setup();
    mockUseEinsaetzeQuery.mockReturnValue({ data: mockEinsaetzeData });
    mockUseEinsatzVergleich.mockReturnValue({
      data: lowEskalation,
      isLoading: false,
      isError: false,
    });

    // When
    render(<EinsatzVergleich einsatzId="current-einsatz-id" />);
    await selectEinsatzInListbox(user, /THL Autobahn/);

    // Then - Gruen fuer <= 10%
    const eskalationCell = screen.getByText('5.0%');
    expect(eskalationCell.className).toMatch(/text-green/);
  });

  it('should show amber color for eskalationsrate > 10% and <= 20%', async () => {
    // Given - eskalationsrate 12.5 (amber)
    const medEskalation = {
      items: [{ ...mockVergleichData.items[0], eskalationsrate: 12.5 }],
    };
    const user = userEvent.setup();
    mockUseEinsaetzeQuery.mockReturnValue({ data: mockEinsaetzeData });
    mockUseEinsatzVergleich.mockReturnValue({
      data: medEskalation,
      isLoading: false,
      isError: false,
    });

    // When
    render(<EinsatzVergleich einsatzId="current-einsatz-id" />);
    await selectEinsatzInListbox(user, /THL Autobahn/);

    // Then - Amber fuer > 10% und <= 20%
    const eskalationCell = screen.getByText('12.5%');
    expect(eskalationCell.className).toMatch(/text-amber/);
  });

  it('should show red color for eskalationsrate > 20%', async () => {
    // Given - eskalationsrate 25.0 (rot)
    const highEskalation = {
      items: [{ ...mockVergleichData.items[0], eskalationsrate: 25.0 }],
    };
    const user = userEvent.setup();
    mockUseEinsaetzeQuery.mockReturnValue({ data: mockEinsaetzeData });
    mockUseEinsatzVergleich.mockReturnValue({
      data: highEskalation,
      isLoading: false,
      isError: false,
    });

    // When
    render(<EinsatzVergleich einsatzId="current-einsatz-id" />);
    await selectEinsatzInListbox(user, /THL Autobahn/);

    // Then - Rot fuer > 20%
    const eskalationCell = screen.getByText('25.0%');
    expect(eskalationCell.className).toMatch(/text-red/);
  });

  // --- Aktueller Einsatz Markierung ---

  it('should mark the current einsatz row with "(aktuell)" label', async () => {
    // Given
    const user = userEvent.setup();
    mockUseEinsaetzeQuery.mockReturnValue({ data: mockEinsaetzeData });
    mockUseEinsatzVergleich.mockReturnValue({
      data: mockVergleichData,
      isLoading: false,
      isError: false,
    });

    // When
    render(<EinsatzVergleich einsatzId="current-einsatz-id" />);
    await selectEinsatzInListbox(user, /THL Autobahn/);

    // Then
    expect(screen.getByText('(aktuell)')).toBeInTheDocument();
  });
});
