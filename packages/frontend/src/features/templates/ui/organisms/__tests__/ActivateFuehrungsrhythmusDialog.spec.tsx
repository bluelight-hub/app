import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { ActivateFuehrungsrhythmusDialog } from '@/features/templates';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock API Hooks
const mockActivate = vi.fn();
let mockIsPending = false;

vi.mock('../../../api', () => ({
  useActivateGlobalFuehrungsrhythmusTemplate: () => ({
    mutate: mockActivate,
    isPending: mockIsPending,
  }),
  useActivateEinsatzFuehrungsrhythmusTemplate: () => ({
    mutate: mockActivate,
    isPending: mockIsPending,
  }),
}));

const mockEintraege = [
  { id: 'e1', titel: 'Lagebeurteilung', intervallMinuten: 30, offsetMinuten: 0, sortOrder: 0 },
  { id: 'e2', titel: 'Rückmeldungen pruefen', intervallMinuten: 30, offsetMinuten: 5, sortOrder: 1 },
  { id: 'e3', titel: 'Ressourcen checken', intervallMinuten: 60, offsetMinuten: 10, sortOrder: 2 },
];

const mockTemplate = {
  id: 'template-1',
  name: 'Fuehrungsrhythmus 30min',
  beschreibung: 'Standard-Rhythmus fuer Einsatzleitung',
  eintraege: mockEintraege,
};

describe('ActivateFuehrungsrhythmusDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    template: mockTemplate,
    einsatzId: 'einsatz-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
  });

  // --- AC1: Dialog Rendering ---
  describe('Dialog Rendering (Story 6.7 AC1)', () => {
    it('sollte Dialog anzeigen wenn isOpen=true', () => {
      // Given isOpen = true
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} />);

      // Then wird der Dialog-Titel angezeigt
      expect(screen.getByText('Fuehrungsrhythmus aktivieren')).toBeInTheDocument();
    });

    it('sollte Template-Name anzeigen', () => {
      // Given ein Template mit Name
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} />);

      // Then wird der Template-Name im Bestaetigungstext angezeigt
      expect(screen.getByText(/Fuehrungsrhythmus 30min/)).toBeInTheDocument();
    });

    it('sollte Anzahl der Erinnerungen anzeigen', () => {
      // Given ein Template mit 3 Eintraegen
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} />);

      // Then wird die Anzahl der zu erstellenden Erinnerungen angezeigt
      expect(screen.getByText(/3 wiederkehrende Erinnerungen/)).toBeInTheDocument();
    });

    it('sollte Singular "Erinnerung" bei einem Eintrag anzeigen', () => {
      // Given ein Template mit 1 Eintrag
      const singleTemplate = {
        ...mockTemplate,
        eintraege: [mockEintraege[0]!],
      };
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} template={singleTemplate} />);

      // Then wird der Singular angezeigt
      expect(screen.getByText(/1 wiederkehrende Erinnerung erstellt/)).toBeInTheDocument();
    });
  });

  // --- Erinnerungs-Vorschau ---
  describe('Erinnerungs-Vorschau (Story 6.7 AC1)', () => {
    it('sollte alle Eintrag-Titel in der Vorschau anzeigen', () => {
      // Given ein Template mit 3 Eintraegen
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} />);

      // Then werden alle Eintraege angezeigt
      expect(screen.getByText('Lagebeurteilung')).toBeInTheDocument();
      expect(screen.getByText('Rückmeldungen pruefen')).toBeInTheDocument();
      expect(screen.getByText('Ressourcen checken')).toBeInTheDocument();
    });

    it('sollte Intervall fuer jeden Eintrag anzeigen', () => {
      // Given ein Template mit verschiedenen Intervallen
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} />);

      // Then werden die Intervalle angezeigt
      const intervall30 = screen.getAllByText(/alle 30 Min/);
      expect(intervall30).toHaveLength(2);
      expect(screen.getByText(/alle 60 Min/)).toBeInTheDocument();
    });

    it('sollte "sofort" fuer Offset 0 anzeigen', () => {
      // Given ein Eintrag mit Offset 0
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} />);

      // Then wird "sofort" angezeigt
      expect(screen.getByText('sofort')).toBeInTheDocument();
    });

    it('sollte Offset-Wert fuer Offset > 0 anzeigen', () => {
      // Given Eintraege mit Offsets > 0
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} />);

      // Then werden die Offset-Werte angezeigt
      expect(screen.getByText('+5 Min')).toBeInTheDocument();
      expect(screen.getByText('+10 Min')).toBeInTheDocument();
    });

    it('sollte Eintraege nach sortOrder sortiert anzeigen', () => {
      // Given ein Template mit unsortierter Reihenfolge
      const unsortedTemplate = {
        ...mockTemplate,
        eintraege: [
          { id: 'e3', titel: 'Dritter', intervallMinuten: 30, offsetMinuten: 10, sortOrder: 2 },
          { id: 'e1', titel: 'Erster', intervallMinuten: 30, offsetMinuten: 0, sortOrder: 0 },
          { id: 'e2', titel: 'Zweiter', intervallMinuten: 30, offsetMinuten: 5, sortOrder: 1 },
        ],
      };
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} template={unsortedTemplate} />);

      // Then werden die Eintraege in der richtigen Reihenfolge gerendert
      const items = screen.getAllByText(/Erster|Zweiter|Dritter/);
      expect(items[0]).toHaveTextContent('Erster');
      expect(items[1]).toHaveTextContent('Zweiter');
      expect(items[2]).toHaveTextContent('Dritter');
    });
  });

  // --- AC2: Aktivierung ---
  describe('Aktivierung (Story 6.7 AC2)', () => {
    it('sollte Aktivieren-Button haben', () => {
      // Given offener Dialog
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} />);

      // Then ist der Aktivieren-Button sichtbar
      expect(screen.getByRole('button', { name: /aktivieren/i })).toBeInTheDocument();
    });

    it('sollte activate Mutation mit templateId und einsatzId aufrufen', async () => {
      // Given offener Dialog
      const user = userEvent.setup();
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} />);

      // When Aktivieren geklickt wird
      await user.click(screen.getByRole('button', { name: /aktivieren/i }));

      // Then wird die Mutation mit korrekten Parametern aufgerufen
      expect(mockActivate).toHaveBeenCalledWith(
        {
          templateId: 'template-1',
          einsatzId: 'einsatz-123',
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });

    it('sollte Loading State zeigen waehrend API-Call', () => {
      // Given isPending = true (Mutation laeuft)
      mockIsPending = true;
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} />);

      // Then wird der Loading-Indikator angezeigt
      expect(screen.getByText('Verarbeitung...')).toBeInTheDocument();

      // And der Aktivieren-Button ist deaktiviert
      expect(screen.getByRole('button', { name: /aktivieren/i })).toBeDisabled();
    });

    it('sollte Abbrechen-Button deaktivieren waehrend API-Call', () => {
      // Given isPending = true
      mockIsPending = true;
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} />);

      // Then ist der Abbrechen-Button deaktiviert
      expect(screen.getByRole('button', { name: /abbrechen/i })).toBeDisabled();
    });

    it('sollte onClose bei erfolgreichem Aktivieren aufrufen', async () => {
      // Given offener Dialog
      const user = userEvent.setup();
      mockActivate.mockImplementation((_variables: unknown, options: { onSuccess: (data: unknown) => void }) => {
        options.onSuccess({ erstellteErinnerungen: [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }] });
      });
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} />);

      // When Aktivieren geklickt wird
      await user.click(screen.getByRole('button', { name: /aktivieren/i }));

      // Then wird onClose aufgerufen
      expect(defaultProps.onClose).toHaveBeenCalledOnce();
    });
  });

  // --- Error Handling ---
  describe('Error Handling', () => {
    it('sollte Fehlermeldung bei API-Fehler anzeigen', async () => {
      // Given ein API-Fehler
      const user = userEvent.setup();
      mockActivate.mockImplementation((_variables: unknown, options: { onError: (error: Error) => void }) => {
        options.onError(new Error('Template konnte nicht aktiviert werden'));
      });
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} />);

      // When Aktivieren geklickt wird
      await user.click(screen.getByRole('button', { name: /aktivieren/i }));

      // Then wird die Fehlermeldung im Dialog angezeigt
      await waitFor(() => {
        expect(screen.getByText('Template konnte nicht aktiviert werden')).toBeInTheDocument();
      });
    });

    it('sollte generische Fehlermeldung bei Nicht-Error-Objekt anzeigen', async () => {
      // Given ein nicht-Error Objekt wird geworfen
      const user = userEvent.setup();
      mockActivate.mockImplementation((_variables: unknown, options: { onError: (error: string) => void }) => {
        options.onError('unknown error');
      });
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} />);

      // When Aktivieren geklickt wird
      await user.click(screen.getByRole('button', { name: /aktivieren/i }));

      // Then wird die generische Fehlermeldung angezeigt
      await waitFor(() => {
        expect(screen.getByText('Fehler beim Aktivieren des Templates')).toBeInTheDocument();
      });
    });

    it('sollte vorherige Fehlermeldung bei neuem Versuch zuruecksetzen', async () => {
      // Given ein vorheriger Fehler
      const user = userEvent.setup();
      let callCount = 0;
      mockActivate.mockImplementation((_variables: unknown, options: { onError: (error: Error) => void; onSuccess: (data: unknown) => void }) => {
        callCount++;
        if (callCount === 1) {
          options.onError(new Error('Erster Fehler'));
        } else {
          options.onSuccess({ erstellteErinnerungen: [] });
        }
      });
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} />);

      // When erster Versuch fehlschlaegt
      await user.click(screen.getByRole('button', { name: /aktivieren/i }));
      await waitFor(() => {
        expect(screen.getByText('Erster Fehler')).toBeInTheDocument();
      });

      // And zweiter Versuch erfolgreich ist
      await user.click(screen.getByRole('button', { name: /aktivieren/i }));

      // Then wird die Fehlermeldung entfernt
      await waitFor(() => {
        expect(screen.queryByText('Erster Fehler')).not.toBeInTheDocument();
      });
    });
  });

  // --- Dialog Verhalten ---
  describe('Dialog-Verhalten', () => {
    it('sollte Dialog schliessen bei Abbrechen', async () => {
      // Given offener Dialog
      const user = userEvent.setup();
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} />);

      // When Abbrechen geklickt wird
      await user.click(screen.getByRole('button', { name: /abbrechen/i }));

      // Then wird onClose aufgerufen
      expect(defaultProps.onClose).toHaveBeenCalledOnce();
    });

    it('sollte Dialog NICHT schliessen bei Abbrechen waehrend Loading', async () => {
      // Given isPending = true
      mockIsPending = true;
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} />);

      // When Abbrechen geklickt wird (Button ist disabled)
      const abbrechenButton = screen.getByRole('button', { name: /abbrechen/i });
      expect(abbrechenButton).toBeDisabled();

      // Then wird onClose NICHT aufgerufen (Button ist disabled und nicht klickbar)
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('sollte Abbrechen- und Aktivieren-Buttons haben', () => {
      // Given offener Dialog
      renderWithProviders(<ActivateFuehrungsrhythmusDialog {...defaultProps} />);

      // Then sind beide Buttons sichtbar
      expect(screen.getByRole('button', { name: /abbrechen/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /aktivieren/i })).toBeInTheDocument();
    });
  });
});
