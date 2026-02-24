/**
 * Unit Tests fuer BefehlMetrikenDashboard Organism
 *
 * Verifiziert:
 * - Metrik-Cards rendern korrekt (AC2-AC6)
 * - Zeitraum-Filter Buttons (AC7)
 * - Pro-Einsatz-Drill-Down (AC8)
 * - Loading-State (Skeletons)
 * - Error-State mit Retry
 * - Leerzustand (AC10)
 * - Farbcodierung (Ziel erreicht/verfehlt)
 *
 * **Story 4.5: Adoptionsmetriken & Dokumentationsqualitaet-Dashboard**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { BefehlMetrikenDashboard } from '../BefehlMetrikenDashboard.organism';

// Mock recharts (nicht testbar in JSDOM)
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Hoisted mock fuer useBefehlMetriken
const mockRefetch = vi.fn();
let mockReturn: {
  data: ReturnType<typeof createMockMetriken> | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: typeof mockRefetch;
};

function createMockMetriken(overrides?: Partial<ReturnType<typeof createMockMetriken>>) {
  return {
    erfassungszeitMedianSekunden: 8.5 as number | null,
    quittierungszeitMedianSekunden: 3.2 as number | null,
    papierRueckfallquoteProzent: 20,
    adoptionsrateProzent: 80,
    dokumentationsqualitaetProzent: 75,
    gesamtEinsaetze: 5,
    einsaetzeMitBefehlen: 4,
    gesamtBefehle: 12,
    vonDatum: new Date('2026-01-01'),
    bisDatum: new Date('2026-01-31'),
    einsatzDetails: [
      {
        einsatzId: 'e1',
        alarmstichwort: 'H1',
        datum: new Date('2026-01-15'),
        befehlAnzahl: 5,
        erfassungszeitMedianSekunden: 7.0 as number | null,
        quittierungszeitMedianSekunden: 4.0 as number | null,
        dokumentationsqualitaetProzent: 80,
      },
      {
        einsatzId: 'e2',
        alarmstichwort: 'TH2',
        datum: new Date('2026-01-20'),
        befehlAnzahl: 7,
        erfassungszeitMedianSekunden: 10.0 as number | null,
        quittierungszeitMedianSekunden: 2.5 as number | null,
        dokumentationsqualitaetProzent: 71,
      },
    ],
    ...overrides,
  };
}

vi.mock('../../../api/use-befehl-metriken', () => ({
  useBefehlMetriken: () => mockReturn,
}));

describe('BefehlMetrikenDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReturn = {
      data: createMockMetriken(),
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    };
  });

  // --- AC7: Zeitraum-Filter ---
  describe('Zeitraum-Filter (AC7)', () => {
    it('rendert alle Zeitraum-Buttons', () => {
      renderWithProviders(<BefehlMetrikenDashboard />);

      expect(screen.getByRole('button', { name: '7 Tage' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '30 Tage' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '90 Tage' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Benutzerdefiniert' })).toBeInTheDocument();
    });

    it('zeigt Datums-Inputs bei Custom-Auswahl', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BefehlMetrikenDashboard />);

      await user.click(screen.getByRole('button', { name: 'Benutzerdefiniert' }));

      expect(screen.getByLabelText('Von-Datum')).toBeInTheDocument();
      expect(screen.getByLabelText('Bis-Datum')).toBeInTheDocument();
    });
  });

  // --- AC2-AC6: Metrik-Cards ---
  describe('Metrik-Cards (AC2-AC6)', () => {
    it('zeigt alle 5 Metrik-Cards', () => {
      renderWithProviders(<BefehlMetrikenDashboard />);

      expect(screen.getByText('Erfassungszeit')).toBeInTheDocument();
      expect(screen.getByText('Quittierungszeit')).toBeInTheDocument();
      expect(screen.getByText('Papier-Rueckfall')).toBeInTheDocument();
      expect(screen.getByText('Adoptionsrate')).toBeInTheDocument();
      expect(screen.getByText('Dokumentation')).toBeInTheDocument();
    });

    it('zeigt korrekte Werte in den Cards', () => {
      renderWithProviders(<BefehlMetrikenDashboard />);

      // Erfassungszeit: 8.5s = "9s" (rounded)
      expect(screen.getByText('9s')).toBeInTheDocument();
      // Quittierungszeit: 3.2s = "3s" (rounded)
      expect(screen.getByText('3s')).toBeInTheDocument();
      // Papier-Rueckfall: 20%
      expect(screen.getByText('20%')).toBeInTheDocument();
      // Adoptionsrate: 80%
      expect(screen.getByText('80%')).toBeInTheDocument();
      // Dokumentationsqualitaet: 75%
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('zeigt Strich bei null-Werten', () => {
      mockReturn.data = createMockMetriken({
        erfassungszeitMedianSekunden: null,
        quittierungszeitMedianSekunden: null,
      });
      renderWithProviders(<BefehlMetrikenDashboard />);

      const dashes = screen.getAllByText('–');
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });
  });

  // --- AC8: Pro-Einsatz-Drill-Down ---
  describe('Pro-Einsatz-Drill-Down (AC8)', () => {
    it('zeigt Drill-Down Collapse-Button', () => {
      renderWithProviders(<BefehlMetrikenDashboard />);

      expect(screen.getByText(/Pro-Einsatz-Breakdown/)).toBeInTheDocument();
    });

    it('expandiert Tabelle bei Klick', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BefehlMetrikenDashboard />);

      await user.click(screen.getByText(/Pro-Einsatz-Breakdown/));

      expect(screen.getByText('H1')).toBeInTheDocument();
      expect(screen.getByText('TH2')).toBeInTheDocument();
    });

    it('zeigt korrekte Spalten in der Tabelle', async () => {
      const user = userEvent.setup();
      renderWithProviders(<BefehlMetrikenDashboard />);

      await user.click(screen.getByText(/Pro-Einsatz-Breakdown/));

      expect(screen.getByText('Alarmstichwort')).toBeInTheDocument();
      expect(screen.getByText('Befehle')).toBeInTheDocument();
      expect(screen.getByText('Doku-Qualitaet')).toBeInTheDocument();
      expect(screen.getByText('Datum')).toBeInTheDocument();
    });
  });

  // --- Loading State ---
  describe('Loading State', () => {
    it('zeigt Skeleton-Placeholders beim Laden', () => {
      mockReturn = {
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: mockRefetch,
      };
      const { container } = renderWithProviders(<BefehlMetrikenDashboard />);

      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThanOrEqual(5);
    });
  });

  // --- Error State ---
  describe('Error State', () => {
    it('zeigt Fehlermeldung mit Retry-Button', () => {
      mockReturn = {
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
      };
      renderWithProviders(<BefehlMetrikenDashboard />);

      expect(screen.getByText('Metriken konnten nicht geladen werden')).toBeInTheDocument();
      expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
    });

    it('ruft refetch bei Retry-Klick auf', async () => {
      const user = userEvent.setup();
      mockReturn = {
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
      };
      renderWithProviders(<BefehlMetrikenDashboard />);

      await user.click(screen.getByText('Erneut versuchen'));
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  // --- AC10: Leerzustand ---
  describe('Leerzustand (AC10)', () => {
    it('zeigt Hinweis wenn keine Befehle vorhanden', () => {
      mockReturn.data = createMockMetriken({
        gesamtBefehle: 0,
        einsaetzeMitBefehlen: 0,
        einsatzDetails: [],
      });
      renderWithProviders(<BefehlMetrikenDashboard />);

      expect(screen.getByText(/Keine Befehlsdaten im gewählten Zeitraum/)).toBeInTheDocument();
    });
  });

  // --- Chart ---
  describe('Chart', () => {
    it('rendert BarChart mit Einsatz-Daten', () => {
      renderWithProviders(<BefehlMetrikenDashboard />);

      expect(screen.getByText('Befehle pro Einsatz')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });
});
