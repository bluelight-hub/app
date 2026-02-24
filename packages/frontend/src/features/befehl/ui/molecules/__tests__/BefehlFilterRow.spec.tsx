/**
 * Unit Tests fuer BefehlFilterRow Molecule
 *
 * Verifiziert:
 * - Status-Dropdown rendert mit Multi-Select
 * - Freitext-Suche rendert mit Debounce (300ms)
 * - Empfaenger-Combobox rendert mit Typeahead
 * - Befehlsgeber-Listbox rendert mit Single-Select
 * - Zeitraum-Datepicker (Von/Bis) vorhanden
 * - "Filter zuruecksetzen" nur sichtbar wenn Filter aktiv
 * - Badge zeigt Anzahl aktiver Filter via activeFilterCount Prop
 * - aria-labels fuer Screenreader vorhanden
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { BefehlFilterRow } from '../BefehlFilterRow.molecule';

const defaultProps = {
  statusFilter: [] as string[],
  onStatusFilterChange: vi.fn(),
  searchText: '',
  onSearchTextChange: vi.fn(),
  empfaengerName: '',
  onEmpfaengerNameChange: vi.fn(),
  empfaengerOptions: ['DRK', 'Feuerwehr', 'THW'],
  befehlsgeberName: '',
  onBefehlsgeberNameChange: vi.fn(),
  befehlsgeberOptions: ['Einsatzleiter', 'Zugführer'],
  von: '',
  onVonChange: vi.fn(),
  bis: '',
  onBisChange: vi.fn(),
  onReset: vi.fn(),
  activeFilterCount: 0,
};

function renderFilterRow(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return renderWithProviders(<BefehlFilterRow {...props} />);
}

describe('BefehlFilterRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('rendert Status-Dropdown, Suchfeld und neue Controls', () => {
      renderFilterRow();

      expect(screen.getByRole('button', { name: /status/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/suche/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/empfänger filtern/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /befehlsgeber/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/befehle ab datum/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/befehle bis datum/i)).toBeInTheDocument();
    });

    it('hat aria-labels auf allen Eingabefeldern', () => {
      renderFilterRow();

      expect(screen.getByLabelText(/befehle durchsuchen/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/empfänger filtern/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/befehlsgeber filtern/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/befehle ab datum/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/befehle bis datum/i)).toBeInTheDocument();
    });
  });

  describe('Status-Dropdown', () => {
    it('zeigt "Alle Status" wenn kein Filter aktiv', () => {
      renderFilterRow({ statusFilter: [] });

      expect(screen.getByRole('button', { name: /status/i })).toHaveTextContent(/alle status/i);
    });

    it('zeigt Anzahl selektierter Status', () => {
      renderFilterRow({ statusFilter: ['ERTEILT', 'ZUGESTELLT'] });

      const button = screen.getByRole('button', { name: /status/i });
      expect(button).toHaveTextContent('2');
    });

    it('oeffnet Dropdown bei Klick', async () => {
      const user = userEvent.setup();
      renderFilterRow();

      await user.click(screen.getByRole('button', { name: /status/i }));

      expect(screen.getByText('Erteilt')).toBeInTheDocument();
      expect(screen.getByText('Zugestellt')).toBeInTheDocument();
      expect(screen.getByText('Quittiert')).toBeInTheDocument();
      expect(screen.getByText('Korrigiert')).toBeInTheDocument();
    });

    it('ruft onStatusFilterChange mit gewaehlem Status auf', async () => {
      const user = userEvent.setup();
      const onStatusFilterChange = vi.fn();
      renderFilterRow({ onStatusFilterChange });

      await user.click(screen.getByRole('button', { name: /status/i }));
      await user.click(screen.getByText('Erteilt'));

      expect(onStatusFilterChange).toHaveBeenCalledWith(['ERTEILT']);
    });
  });

  describe('Freitext-Suche', () => {
    it('zeigt den aktuellen searchText', () => {
      renderFilterRow({ searchText: 'Wasserversorgung' });

      expect(screen.getByDisplayValue('Wasserversorgung')).toBeInTheDocument();
    });

    it('ruft onSearchTextChange nach 300ms Debounce auf', async () => {
      vi.useFakeTimers();
      const onSearchTextChange = vi.fn();
      renderFilterRow({ onSearchTextChange });

      const input = screen.getByPlaceholderText(/suche/i);
      fireEvent.change(input, { target: { value: 'W' } });

      expect(onSearchTextChange).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(300);
      expect(onSearchTextChange).toHaveBeenCalledWith('W');

      vi.useRealTimers();
    });
  });

  describe('Empfaenger-Combobox', () => {
    it('rendert Combobox mit Platzhalter', () => {
      renderFilterRow();

      expect(screen.getByPlaceholderText(/empfänger/i)).toBeInTheDocument();
    });

    it('zeigt gesetzten Empfaenger-Wert an', () => {
      renderFilterRow({ empfaengerName: 'DRK' });

      expect(screen.getByDisplayValue('DRK')).toBeInTheDocument();
    });
  });

  describe('Befehlsgeber-Listbox', () => {
    it('zeigt "Alle Befehlsgeber" als Default', () => {
      renderFilterRow({ befehlsgeberName: '' });

      expect(screen.getByRole('button', { name: /befehlsgeber/i })).toHaveTextContent(/alle befehlsgeber/i);
    });

    it('zeigt ausgewaehlten Befehlsgeber', () => {
      renderFilterRow({ befehlsgeberName: 'Einsatzleiter' });

      expect(screen.getByRole('button', { name: /befehlsgeber/i })).toHaveTextContent('Einsatzleiter');
    });
  });

  describe('Zeitraum-Datepicker', () => {
    it('rendert Von- und Bis-Datepicker', () => {
      renderFilterRow();

      expect(screen.getByLabelText(/befehle ab datum/i)).toHaveAttribute('type', 'date');
      expect(screen.getByLabelText(/befehle bis datum/i)).toHaveAttribute('type', 'date');
    });

    it('ruft onVonChange bei Eingabe auf', () => {
      const onVonChange = vi.fn();
      renderFilterRow({ onVonChange });

      const vonInput = screen.getByLabelText(/befehle ab datum/i);
      fireEvent.change(vonInput, { target: { value: '2026-01-15' } });

      expect(onVonChange).toHaveBeenCalled();
    });

    it('ruft onBisChange bei Eingabe auf', () => {
      const onBisChange = vi.fn();
      renderFilterRow({ onBisChange });

      const bisInput = screen.getByLabelText(/befehle bis datum/i);
      fireEvent.change(bisInput, { target: { value: '2026-12-31' } });

      expect(onBisChange).toHaveBeenCalled();
    });

    it('zeigt gesetzte Datumswerte', () => {
      renderFilterRow({ von: '2026-01-01', bis: '2026-12-31' });

      expect(screen.getByLabelText(/befehle ab datum/i)).toHaveValue('2026-01-01');
      expect(screen.getByLabelText(/befehle bis datum/i)).toHaveValue('2026-12-31');
    });
  });

  describe('Filter zuruecksetzen', () => {
    it('zeigt Reset-Button nicht wenn keine Filter aktiv', () => {
      renderFilterRow({ activeFilterCount: 0 });

      expect(screen.queryByRole('button', { name: /zur.cksetzen/i })).not.toBeInTheDocument();
    });

    it('zeigt Reset-Button wenn Filter aktiv', () => {
      renderFilterRow({ activeFilterCount: 2 });

      expect(screen.getByRole('button', { name: /zur.cksetzen/i })).toBeInTheDocument();
    });

    it('ruft onReset beim Klick auf Reset-Button', () => {
      const onReset = vi.fn();
      renderFilterRow({ activeFilterCount: 1, onReset });

      fireEvent.click(screen.getByRole('button', { name: /zur.cksetzen/i }));

      expect(onReset).toHaveBeenCalledOnce();
    });
  });

  describe('Filter Badge', () => {
    it('zeigt Badge mit activeFilterCount', () => {
      renderFilterRow({ activeFilterCount: 3 });

      expect(screen.getByText(/filter.*3/i)).toBeInTheDocument();
    });

    it('zeigt keinen Badge wenn activeFilterCount 0', () => {
      renderFilterRow({ activeFilterCount: 0 });

      expect(screen.queryByText(/filter.*\d/i)).not.toBeInTheDocument();
    });
  });
});
