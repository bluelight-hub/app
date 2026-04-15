/**
 * Unit Tests fuer EmpfaengerCombobox Molecule
 *
 * Verifiziert:
 * - Rendering: Input + Placeholder
 * - Typeahead: Input-Aenderung triggert Suche (nach Debounce)
 * - Ergebnis-Darstellung: Name + Rolle-Badge
 * - Multi-Select: Mehrere Empfaenger auswahlbar
 * - Chips: Ausgewaehlte als Chips dargestellt
 * - Chip-Entfernen: X-Button entfernt Empfaenger
 * - Freitext-Option: Freitext-Empfaenger via Dropdown-Option
 * - Error-Fallback: "Manuelle Eingabe moeglich"
 * - Leerzustand: "Keine Treffer" Nachricht
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren, type ReactElement } from 'react';
import { EmpfaengerCombobox, type EmpfaengerSelection } from '../EmpfaengerCombobox.molecule';

const { mockEmpfaengerSuche } = vi.hoisted(() => ({
  mockEmpfaengerSuche: vi.fn(),
}));

vi.mock('@/shared', () => ({
  api: {
    befehle: () => ({
      befehlControllerEmpfaengerSucheVAlpha: mockEmpfaengerSuche,
    }),
  },
}));

vi.mock('@/shared/ui/cn', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

const EINSATZ_ID = 'einsatz-123';

const mockResults = [
  { id: '1', name: 'Müller, Hans', rolle: 'GF', quelle: 'EINSATZ' as const },
  { id: '2', name: 'Schmidt, Anna', rolle: 'ZF', userId: 'user-2', quelle: 'STAMMDATEN' as const },
  { id: '3', name: 'Rotkreuz 83/1', rolle: 'Fahrzeug', quelle: 'EINSATZ_FAHRZEUG' as const },
  { id: '4', name: 'Weber, Klaus', quelle: 'EINSATZ' as const },
];

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

function renderWithQuery(ui: ReactElement) {
  const queryClient = createQueryClient();
  return render(ui, {
    wrapper: ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  });
}

function ControlledEmpfaengerCombobox({ initial = [] }: { initial?: EmpfaengerSelection[] }) {
  const [value, setValue] = useState<EmpfaengerSelection[]>(initial);
  return <EmpfaengerCombobox einsatzId={EINSATZ_ID} value={value} onChange={setValue} />;
}

describe('EmpfaengerCombobox', () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onChange = vi.fn();
    mockEmpfaengerSuche.mockResolvedValue({ data: mockResults });
  });

  describe('Rendering', () => {
    it('rendert Input mit korrektem Placeholder', () => {
      renderWithQuery(<EmpfaengerCombobox einsatzId={EINSATZ_ID} value={[]} onChange={onChange} />);
      expect(screen.getByPlaceholderText('Empfänger suchen...')).toBeInTheDocument();
    });

    it('zeigt alternativen Placeholder wenn bereits Empfaenger ausgewaehlt', () => {
      renderWithQuery(<EmpfaengerCombobox einsatzId={EINSATZ_ID} value={[{ name: 'Test' }]} onChange={onChange} />);
      expect(screen.getByPlaceholderText('Weiteren Empfänger hinzufügen...')).toBeInTheDocument();
    });
  });

  describe('Typeahead / Suche', () => {
    it('laedt Top-Empfänger direkt ohne Eingabe (leerer Query)', async () => {
      renderWithQuery(<EmpfaengerCombobox einsatzId={EINSATZ_ID} value={[]} onChange={onChange} />);

      await waitFor(() => {
        expect(mockEmpfaengerSuche).toHaveBeenCalledWith({
          q: '',
          einsatzId: EINSATZ_ID,
        });
      });
    });

    it('ruft API mit korrektem Suchterm auf (nach Debounce)', async () => {
      const user = userEvent.setup();
      renderWithQuery(<EmpfaengerCombobox einsatzId={EINSATZ_ID} value={[]} onChange={onChange} />);

      await user.type(screen.getByPlaceholderText('Empfänger suchen...'), 'Mü');

      await waitFor(() => {
        expect(mockEmpfaengerSuche).toHaveBeenCalledWith({
          q: 'Mü',
          einsatzId: EINSATZ_ID,
        });
      });
    });
  });

  describe('Ergebnis-Darstellung', () => {
    it('zeigt Suchergebnisse mit Name und Rolle-Badge', async () => {
      const user = userEvent.setup();
      renderWithQuery(<EmpfaengerCombobox einsatzId={EINSATZ_ID} value={[]} onChange={onChange} />);

      await user.type(screen.getByPlaceholderText('Empfänger suchen...'), 'Mü');

      await waitFor(() => {
        expect(screen.getByText('Müller, Hans')).toBeInTheDocument();
        expect(screen.getByText('GF')).toBeInTheDocument();
      });
    });

    it('zeigt Verknuepfungs-Icon bei userId', async () => {
      const user = userEvent.setup();
      renderWithQuery(<EmpfaengerCombobox einsatzId={EINSATZ_ID} value={[]} onChange={onChange} />);

      await user.type(screen.getByPlaceholderText('Empfänger suchen...'), 'Mü');

      await waitFor(() => {
        expect(screen.getByLabelText('Verknüpfter Benutzer')).toBeInTheDocument();
      });
    });

    it('zeigt Fahrzeugtreffer mit Fahrzeug-Badge', async () => {
      const user = userEvent.setup();
      renderWithQuery(<EmpfaengerCombobox einsatzId={EINSATZ_ID} value={[]} onChange={onChange} />);

      await user.type(screen.getByPlaceholderText('Empfänger suchen...'), '83');

      await waitFor(() => {
        expect(screen.getByText('Rotkreuz 83/1')).toBeInTheDocument();
        expect(screen.getByText('Fahrzeug')).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Select & Chips', () => {
    it('zeigt ausgewaehlte Empfaenger als Chips', () => {
      const selected: EmpfaengerSelection[] = [{ name: 'Müller, Hans', empfaengerId: 'user-1' }, { name: 'Schmidt, Anna' }];
      renderWithQuery(<EmpfaengerCombobox einsatzId={EINSATZ_ID} value={selected} onChange={onChange} />);

      expect(screen.getByText('Müller, Hans')).toBeInTheDocument();
      expect(screen.getByText('Schmidt, Anna')).toBeInTheDocument();
    });

    it('ruft onChange mit neuem Empfaenger auf bei Auswahl', async () => {
      const user = userEvent.setup();
      renderWithQuery(<EmpfaengerCombobox einsatzId={EINSATZ_ID} value={[]} onChange={onChange} />);

      await user.type(screen.getByPlaceholderText('Empfänger suchen...'), 'Mü');

      await waitFor(() => {
        expect(screen.getByText('Müller, Hans')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Müller, Hans'));

      expect(onChange).toHaveBeenCalledWith([{ name: 'Müller, Hans', empfaengerId: undefined }]);
    });

    it('waehlt Fahrzeugtreffer ohne empfaengerId aus', async () => {
      const user = userEvent.setup();
      renderWithQuery(<EmpfaengerCombobox einsatzId={EINSATZ_ID} value={[]} onChange={onChange} />);

      await user.type(screen.getByPlaceholderText('Empfänger suchen...'), '83');

      await waitFor(() => {
        expect(screen.getByText('Rotkreuz 83/1')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Rotkreuz 83/1'));

      expect(onChange).toHaveBeenCalledWith([{ name: 'Rotkreuz 83/1', empfaengerId: undefined }]);
    });
  });

  describe('Chip-Entfernen', () => {
    it('entfernt Empfaenger bei Klick auf X-Button', async () => {
      const user = userEvent.setup();
      const selected: EmpfaengerSelection[] = [{ name: 'Müller, Hans' }, { name: 'Schmidt, Anna' }];
      renderWithQuery(<EmpfaengerCombobox einsatzId={EINSATZ_ID} value={selected} onChange={onChange} />);

      const removeButton = screen.getByLabelText('Müller, Hans entfernen');
      await user.click(removeButton);

      expect(onChange).toHaveBeenCalledWith([{ name: 'Schmidt, Anna' }]);
    });
  });

  describe('Freitext-Eingabe', () => {
    it('zeigt Freitext-Option im Dropdown', async () => {
      const user = userEvent.setup();
      mockEmpfaengerSuche.mockResolvedValue({ data: [] });
      renderWithQuery(<EmpfaengerCombobox einsatzId={EINSATZ_ID} value={[]} onChange={onChange} />);

      await user.type(screen.getByPlaceholderText('Empfänger suchen...'), 'Neuer Empfaenger');

      await waitFor(() => {
        expect(screen.getByText(/„Neuer Empfaenger" als Freitext hinzufügen/)).toBeInTheDocument();
      });
    });

    it('fuegt Freitext-Empfaenger bei Klick auf Option hinzu', async () => {
      const user = userEvent.setup();
      mockEmpfaengerSuche.mockResolvedValue({ data: [] });
      renderWithQuery(<EmpfaengerCombobox einsatzId={EINSATZ_ID} value={[]} onChange={onChange} />);

      await user.type(screen.getByPlaceholderText('Empfänger suchen...'), 'Neuer Empfaenger');

      await waitFor(() => {
        expect(screen.getByText(/„Neuer Empfaenger" als Freitext hinzufügen/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/„Neuer Empfaenger" als Freitext hinzufügen/));

      expect(onChange).toHaveBeenCalledWith([{ name: 'Neuer Empfaenger' }]);
    });

    it('uebernimmt Freitext per Enter als sichtbaren Chip', async () => {
      const user = userEvent.setup();
      mockEmpfaengerSuche.mockResolvedValue({ data: [] });
      renderWithQuery(<ControlledEmpfaengerCombobox />);

      const input = screen.getByPlaceholderText('Empfänger suchen...');
      await user.type(input, 'Neuer Empfaenger');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Neuer Empfaenger')).toBeInTheDocument();
      });
    });

    it('uebernimmt mehrere Freitext-Empfaenger per Trennzeichen bei Enter', async () => {
      const user = userEvent.setup();
      mockEmpfaengerSuche.mockResolvedValue({ data: [] });
      renderWithQuery(<ControlledEmpfaengerCombobox />);

      const input = screen.getByPlaceholderText('Empfänger suchen...');
      await user.type(input, 'RTW 1; Polizei');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('RTW 1')).toBeInTheDocument();
        expect(screen.getByText('Polizei')).toBeInTheDocument();
      });
    });

    it('uebernimmt mehrere Freitext-Empfaenger beim Einfuegen (Paste)', async () => {
      const user = userEvent.setup();
      mockEmpfaengerSuche.mockResolvedValue({ data: [] });
      renderWithQuery(<ControlledEmpfaengerCombobox />);

      const input = screen.getByPlaceholderText('Empfänger suchen...');
      await user.click(input);
      await user.paste('OrgL, LNA');

      await waitFor(() => {
        expect(screen.getByText('OrgL')).toBeInTheDocument();
        expect(screen.getByText('LNA')).toBeInTheDocument();
      });
    });

    it('zeigt Freitext-Option auch neben API-Ergebnissen', async () => {
      const user = userEvent.setup();
      renderWithQuery(<EmpfaengerCombobox einsatzId={EINSATZ_ID} value={[]} onChange={onChange} />);

      await user.type(screen.getByPlaceholderText('Empfänger suchen...'), 'Mü');

      await waitFor(() => {
        // API-Ergebnisse
        expect(screen.getByText('Müller, Hans')).toBeInTheDocument();
        // Freitext-Option
        expect(screen.getByText(/„Mü" als Freitext hinzufügen/)).toBeInTheDocument();
      });
    });
  });

  describe('Error-Fallback', () => {
    it('zeigt "Manuelle Eingabe moeglich" bei API-Fehler', async () => {
      const user = userEvent.setup();
      mockEmpfaengerSuche.mockRejectedValue(new Error('Network error'));
      renderWithQuery(<EmpfaengerCombobox einsatzId={EINSATZ_ID} value={[]} onChange={onChange} />);

      await user.type(screen.getByPlaceholderText('Empfänger suchen...'), 'Mü');

      await waitFor(() => {
        expect(screen.getByText('Manuelle Eingabe möglich')).toBeInTheDocument();
      });
    });
  });

  describe('Leerzustand', () => {
    it('zeigt "Keine Treffer" bei leerer Ergebnisliste', async () => {
      const user = userEvent.setup();
      mockEmpfaengerSuche.mockResolvedValue({ data: [] });
      renderWithQuery(<EmpfaengerCombobox einsatzId={EINSATZ_ID} value={[]} onChange={onChange} />);

      await user.type(screen.getByPlaceholderText('Empfänger suchen...'), 'xyz');

      await waitFor(() => {
        expect(screen.getByText('Keine Treffer gefunden')).toBeInTheDocument();
      });
    });
  });

  describe('AC5 – userId als empfaengerId', () => {
    it('uebergibt userId korrekt als empfaengerId bei verknuepftem Benutzer', async () => {
      const user = userEvent.setup();
      renderWithQuery(<EmpfaengerCombobox einsatzId={EINSATZ_ID} value={[]} onChange={onChange} />);

      await user.type(screen.getByPlaceholderText('Empfänger suchen...'), 'Sc');

      await waitFor(() => {
        expect(screen.getByText('Schmidt, Anna')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Schmidt, Anna'));

      expect(onChange).toHaveBeenCalledWith([{ name: 'Schmidt, Anna', empfaengerId: 'user-2' }]);
    });
  });

  describe('Backspace-Verhalten', () => {
    it('entfernt letzten Chip bei Backspace in leerer Eingabe', async () => {
      const user = userEvent.setup();
      const selected: EmpfaengerSelection[] = [{ name: 'Müller, Hans' }, { name: 'Schmidt, Anna' }];
      renderWithQuery(<EmpfaengerCombobox einsatzId={EINSATZ_ID} value={selected} onChange={onChange} />);

      const input = screen.getByPlaceholderText('Weiteren Empfänger hinzufügen...');
      await user.click(input);
      await user.keyboard('{Backspace}');

      expect(onChange).toHaveBeenCalledWith([{ name: 'Müller, Hans' }]);
    });

    it('entfernt keinen Chip bei Backspace wenn Eingabe nicht leer', async () => {
      const user = userEvent.setup();
      const selected: EmpfaengerSelection[] = [{ name: 'Müller, Hans' }];
      renderWithQuery(<EmpfaengerCombobox einsatzId={EINSATZ_ID} value={selected} onChange={onChange} />);

      const input = screen.getByPlaceholderText('Weiteren Empfänger hinzufügen...');
      await user.type(input, 'ab');
      await user.keyboard('{Backspace}');

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
