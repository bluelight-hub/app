import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { CreateFuehrungsrhythmusTemplateDialog } from '../CreateFuehrungsrhythmusTemplateDialog';

// Mock API Hooks
const mockCreateTemplate = vi.fn();
vi.mock('../../../api', () => ({
  useCreateFuehrungsrhythmusTemplate: () => ({
    mutate: mockCreateTemplate,
    isPending: false,
  }),
}));

describe('CreateFuehrungsrhythmusTemplateDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- AC1: Dialog rendern ---
  describe('Rendering (Story 6.6 AC1)', () => {
    it('should render dialog when isOpen is true', () => {
      // Given isOpen = true
      renderWithProviders(<CreateFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      // Then wird der Dialog-Titel angezeigt
      expect(screen.getByText('Fuehrungsrhythmus-Template erstellen')).toBeInTheDocument();
    });

    it('should display Name input field', () => {
      // Given offener Dialog
      renderWithProviders(<CreateFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      // Then ist das Name-Feld sichtbar
      expect(screen.getByPlaceholderText('z.B. Fuehrungsrhythmus 30min')).toBeInTheDocument();
    });

    it('should display Beschreibung textarea', () => {
      // Given offener Dialog
      renderWithProviders(<CreateFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      // Then ist das Beschreibungs-Feld sichtbar
      expect(screen.getByPlaceholderText('Zusaetzliche Details zum Template...')).toBeInTheDocument();
    });

    it('should display initial Eintrag row', () => {
      // Given offener Dialog
      renderWithProviders(<CreateFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      // Then ist ein Eintrag-Titelfeld sichtbar
      expect(screen.getByPlaceholderText('Titel der Erinnerung')).toBeInTheDocument();
    });

    it('should display "Erinnerung hinzufuegen" button', () => {
      // Given offener Dialog
      renderWithProviders(<CreateFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      // Then ist der Hinzufuegen-Button sichtbar
      expect(screen.getByText('Erinnerung hinzufuegen')).toBeInTheDocument();
    });

    it('should display Intervall preset chips (15, 30, 45, 60)', () => {
      // Given offener Dialog
      renderWithProviders(<CreateFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      // Then sind die Preset-Chips sichtbar
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('60')).toBeInTheDocument();
    });
  });

  // --- AC1: Dynamische Eintraege ---
  describe('Dynamische Eintraege (Story 6.6 AC1)', () => {
    it('should add a new Eintrag when clicking "Erinnerung hinzufuegen"', async () => {
      // Given offener Dialog mit 1 Eintrag
      const user = userEvent.setup();
      renderWithProviders(<CreateFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      expect(screen.getAllByPlaceholderText('Titel der Erinnerung')).toHaveLength(1);

      // When "Erinnerung hinzufuegen" geklickt wird
      await user.click(screen.getByText('Erinnerung hinzufuegen'));

      // Then gibt es 2 Eintraege
      expect(screen.getAllByPlaceholderText('Titel der Erinnerung')).toHaveLength(2);
    });

    it('should not show remove button when only one Eintrag exists', () => {
      // Given offener Dialog mit 1 Eintrag
      renderWithProviders(<CreateFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      // Then ist kein Entfernen-Button sichtbar
      expect(screen.queryByLabelText('Eintrag 1 entfernen')).not.toBeInTheDocument();
    });

    it('should show remove buttons when multiple Eintraege exist', async () => {
      // Given offener Dialog
      const user = userEvent.setup();
      renderWithProviders(<CreateFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      // When 2. Eintrag hinzugefuegt wird
      await user.click(screen.getByText('Erinnerung hinzufuegen'));

      // Then sind Entfernen-Buttons sichtbar
      expect(screen.getByLabelText('Eintrag 1 entfernen')).toBeInTheDocument();
      expect(screen.getByLabelText('Eintrag 2 entfernen')).toBeInTheDocument();
    });

    it('should remove a specific Eintrag when clicking its remove button', async () => {
      // Given offener Dialog mit 2 Eintraegen
      const user = userEvent.setup();
      renderWithProviders(<CreateFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      await user.click(screen.getByText('Erinnerung hinzufuegen'));
      expect(screen.getAllByPlaceholderText('Titel der Erinnerung')).toHaveLength(2);

      // When der 2. Eintrag entfernt wird
      await user.click(screen.getByLabelText('Eintrag 2 entfernen'));

      // Then gibt es wieder nur 1 Eintrag
      expect(screen.getAllByPlaceholderText('Titel der Erinnerung')).toHaveLength(1);
    });
  });

  // --- AC3: Validierung ---
  describe('Validierung (Story 6.6 AC3)', () => {
    it('should show validation error when name is empty on submit', async () => {
      // Given offener Dialog ohne Name
      const user = userEvent.setup();
      renderWithProviders(<CreateFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      // When Submit geklickt wird
      await user.click(screen.getByText('Template erstellen'));

      // Then wird ein Validierungsfehler angezeigt
      await waitFor(() => {
        expect(screen.getByText(/Name ist erforderlich/i)).toBeInTheDocument();
      });

      // And die Mutation wird NICHT aufgerufen
      expect(mockCreateTemplate).not.toHaveBeenCalled();
    });

    it('should show validation error when no Eintrag titel is provided', async () => {
      // Given offener Dialog mit Name aber ohne Eintrag-Titel
      const user = userEvent.setup();
      renderWithProviders(<CreateFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('z.B. Fuehrungsrhythmus 30min'), 'Test Template');
      await user.click(screen.getByText('Template erstellen'));

      // Then wird ein Validierungsfehler angezeigt
      await waitFor(() => {
        expect(screen.getByText(/Titel ist erforderlich/i)).toBeInTheDocument();
      });

      // And die Mutation wird NICHT aufgerufen
      expect(mockCreateTemplate).not.toHaveBeenCalled();
    });
  });

  // --- Dialog-Verhalten ---
  describe('Dialog-Verhalten', () => {
    it('should call onClose when Abbrechen is clicked', async () => {
      // Given offener Dialog
      const user = userEvent.setup();
      renderWithProviders(<CreateFuehrungsrhythmusTemplateDialog {...defaultProps} />);

      // When Abbrechen geklickt wird
      await user.click(screen.getByText('Abbrechen'));

      // Then wird onClose aufgerufen
      expect(defaultProps.onClose).toHaveBeenCalledOnce();
    });
  });
});
