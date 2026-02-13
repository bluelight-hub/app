import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { EditFuehrungsrhythmusTemplateDialog } from '../EditFuehrungsrhythmusTemplateDialog';

// Mock API Hooks
const mockUpdateGlobal = vi.fn();
const mockUpdateEinsatz = vi.fn();
vi.mock('../../../api', () => ({
  useUpdateGlobalFuehrungsrhythmusTemplate: () => ({
    mutate: mockUpdateGlobal,
    isPending: false,
  }),
  useUpdateEinsatzFuehrungsrhythmusTemplate: () => ({
    mutate: mockUpdateEinsatz,
    isPending: false,
  }),
}));

// Mock Error Handler
vi.mock('@/shared/lib/errors/apiErrorHandler', () => ({
  getApiErrorMessage: vi.fn().mockResolvedValue('Ein Fehler ist aufgetreten'),
}));

/** Beispiel-Template fuer Tests */
const mockTemplate = {
  id: 'tmpl-1',
  name: 'Standard 30min',
  beschreibung: 'Alle 30 Minuten',
  scope: 'GLOBAL',
  einsatzId: null,
  eintraege: [{ titel: 'Lagebericht', intervallMinuten: 30, offsetMinuten: 0 }],
};

describe('EditFuehrungsrhythmusTemplateDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    template: mockTemplate,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Render: Vorausgefuellte Werte ---
  describe('Rendering mit vorausgefuellten Werten', () => {
    it('should render dialog with template name pre-filled', () => {
      renderWithProviders(<EditFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      expect(screen.getByText('Template bearbeiten')).toBeInTheDocument();
      const nameInput = screen.getByDisplayValue('Standard 30min');
      expect(nameInput).toBeInTheDocument();
    });

    it('should render dialog with template beschreibung pre-filled', () => {
      renderWithProviders(<EditFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      const beschreibungField = screen.getByDisplayValue('Alle 30 Minuten');
      expect(beschreibungField).toBeInTheDocument();
    });

    it('should render dialog with template eintraege pre-filled', () => {
      renderWithProviders(<EditFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      const titelInput = screen.getByDisplayValue('Lagebericht');
      expect(titelInput).toBeInTheDocument();
    });

    it('should display "Erinnerung hinzufuegen" button', () => {
      renderWithProviders(<EditFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      expect(screen.getByText('Erinnerung hinzufuegen')).toBeInTheDocument();
    });

    it('should display Speichern and Abbrechen buttons', () => {
      renderWithProviders(<EditFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      expect(screen.getByText('Speichern')).toBeInTheDocument();
      expect(screen.getByText('Abbrechen')).toBeInTheDocument();
    });
  });

  // --- Validierung ---
  describe('Validierung', () => {
    it('should show validation error when name is cleared and form submitted', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      // Name-Feld leeren
      const nameInput = screen.getByDisplayValue('Standard 30min');
      await user.clear(nameInput);

      // Submit
      await user.click(screen.getByText('Speichern'));

      // Validierungsfehler erwartet
      await waitFor(() => {
        expect(screen.getByText(/Name ist erforderlich/i)).toBeInTheDocument();
      });

      // Mutation darf NICHT aufgerufen werden
      expect(mockUpdateGlobal).not.toHaveBeenCalled();
    });
  });

  // --- Submit ---
  describe('Submit', () => {
    it('should call global update mutation on submit for GLOBAL template', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      // Name aendern
      const nameInput = screen.getByDisplayValue('Standard 30min');
      await user.clear(nameInput);
      await user.type(nameInput, 'Aktualisiert 45min');

      // Submit
      await user.click(screen.getByText('Speichern'));

      // Mutation muss aufgerufen werden
      await waitFor(() => {
        expect(mockUpdateGlobal).toHaveBeenCalledOnce();
      });

      // Prüfe dass korrekte Daten uebergeben werden
      const callArgs = mockUpdateGlobal.mock.calls[0];
      expect(callArgs[0]).toMatchObject({
        id: 'tmpl-1',
        data: expect.objectContaining({
          name: 'Aktualisiert 45min',
        }),
      });
    });

    it('should call einsatz update mutation on submit for EINSATZ template', async () => {
      const user = userEvent.setup();
      const einsatzTemplate = {
        ...mockTemplate,
        scope: 'EINSATZ',
        einsatzId: 'einsatz-1',
      };

      renderWithProviders(<EditFuehrungsrhythmusTemplateDialog {...defaultProps} template={einsatzTemplate} />);

      // Submit direkt (Daten sind vorausgefuellt)
      await user.click(screen.getByText('Speichern'));

      await waitFor(() => {
        expect(mockUpdateEinsatz).toHaveBeenCalledOnce();
      });

      const callArgs = mockUpdateEinsatz.mock.calls[0];
      expect(callArgs[0]).toMatchObject({
        einsatzId: 'einsatz-1',
        id: 'tmpl-1',
      });
    });
  });

  // --- Close ---
  describe('Dialog schliessen', () => {
    it('should call onClose when Abbrechen is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      await user.click(screen.getByText('Abbrechen'));

      expect(defaultProps.onClose).toHaveBeenCalledOnce();
    });
  });
});
