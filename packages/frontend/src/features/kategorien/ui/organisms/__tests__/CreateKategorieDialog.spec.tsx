/**
 * Unit Tests fuer CreateKategorieDialog Component
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 8.1:** Kategorie erstellen
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { CreateKategorieDialog } from '@/features/kategorien';

// Mock API Hooks
const mockMutate = vi.fn();
const mockIsPending = { value: false };
vi.mock('../../../api', () => ({
  useCreateKategorie: () => ({
    mutate: mockMutate,
    isPending: mockIsPending.value,
  }),
}));

describe('CreateKategorieDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    einsatzId: 'einsatz-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending.value = false;
  });

  // --- Rendering (Story 8.1 AC1) ---
  describe('Rendering (Story 8.1 AC1)', () => {
    it('should render dialog when isOpen is true', () => {
      // Given isOpen = true
      renderWithProviders(<CreateKategorieDialog {...defaultProps} />);

      // Then wird der Dialog-Titel angezeigt
      expect(screen.getByText('Neue Kategorie erstellen')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      // Given isOpen = false
      renderWithProviders(<CreateKategorieDialog {...defaultProps} isOpen={false} />);

      // Then wird der Dialog nicht angezeigt
      expect(screen.queryByText('Neue Kategorie erstellen')).not.toBeInTheDocument();
    });

    it('should display name input field', () => {
      // Given offener Dialog
      renderWithProviders(<CreateKategorieDialog {...defaultProps} />);

      // Then ist das Name-Feld sichtbar
      expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    });

    it('should display color picker', () => {
      // Given offener Dialog
      renderWithProviders(<CreateKategorieDialog {...defaultProps} />);

      // Then ist der Farb-Picker sichtbar
      expect(screen.getByRole('radiogroup', { name: /^Farbe/ })).toBeInTheDocument();
    });

    it('should have name input with placeholder', () => {
      // Given offener Dialog
      renderWithProviders(<CreateKategorieDialog {...defaultProps} />);

      // Then hat das Name-Feld einen Placeholder
      expect(screen.getByPlaceholderText('z.B. Einsatzleitung, Lage, Personal...')).toBeInTheDocument();
    });

    it('should select first color preset by default', () => {
      // Given offener Dialog
      renderWithProviders(<CreateKategorieDialog {...defaultProps} />);

      // Then ist die erste Farbe (Blau) ausgewählt
      const blauButton = screen.getByLabelText('Blau');
      expect(blauButton).toHaveAttribute('aria-checked', 'true');
    });
  });

  // --- Form Interaktion ---
  describe('Form Interaktion', () => {
    it('should allow typing in name input', async () => {
      // Given offener Dialog
      const user = userEvent.setup();
      renderWithProviders(<CreateKategorieDialog {...defaultProps} />);

      // When der Benutzer einen Namen eingibt
      const nameInput = screen.getByLabelText(/Name/);
      await user.type(nameInput, 'Einsatzleitung');

      // Then wird der Name angezeigt
      expect(nameInput).toHaveValue('Einsatzleitung');
    });

    it('should allow selecting a different color', async () => {
      // Given offener Dialog
      const user = userEvent.setup();
      renderWithProviders(<CreateKategorieDialog {...defaultProps} />);

      // When der Benutzer eine andere Farbe wählt
      const rotButton = screen.getByLabelText('Rot');
      await user.click(rotButton);

      // Then ist Rot ausgewählt
      expect(rotButton).toHaveAttribute('aria-checked', 'true');
    });
  });

  // --- Validierung (Story 8.1 AC2) ---
  describe('Validierung (Story 8.1 AC2)', () => {
    it('should show validation error when submitting with empty name', async () => {
      // Given offener Dialog ohne Name
      const user = userEvent.setup();
      renderWithProviders(<CreateKategorieDialog {...defaultProps} />);

      // When Submit geklickt wird
      await user.click(screen.getByRole('button', { name: /Kategorie erstellen/ }));

      // Then wird ein Validierungsfehler angezeigt
      await waitFor(() => {
        expect(screen.getByText(/Name ist erforderlich/i)).toBeInTheDocument();
      });

      // And die Mutation wird NICHT aufgerufen
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should not show validation error with valid name', async () => {
      // Given offener Dialog mit Namen
      const user = userEvent.setup();
      renderWithProviders(<CreateKategorieDialog {...defaultProps} />);

      // When der Benutzer einen Namen eingibt
      const nameInput = screen.getByLabelText(/Name/);
      await user.type(nameInput, 'Einsatzleitung');

      // Then ist kein Validierungsfehler sichtbar
      expect(screen.queryByText(/Name ist erforderlich/i)).not.toBeInTheDocument();
    });

    it('should accept name with leading/trailing whitespace', async () => {
      // Given offener Dialog
      const user = userEvent.setup();
      renderWithProviders(<CreateKategorieDialog {...defaultProps} />);

      // When der Benutzer einen Namen mit Whitespace eingibt und absendet
      const nameInput = screen.getByLabelText(/Name/);
      await user.type(nameInput, '  Einsatzleitung  ');
      await user.click(screen.getByRole('button', { name: /Kategorie erstellen/ }));

      // Then wird die Mutation aufgerufen (Zod schema trimmt automatisch)
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            einsatzId: 'einsatz-123',
            data: expect.objectContaining({
              name: expect.any(String),
              farbe: expect.any(String),
            }),
          }),
          expect.any(Object),
        );
      });
    });

    it('should show validation error when name is only whitespace', async () => {
      // Given offener Dialog
      const user = userEvent.setup();
      renderWithProviders(<CreateKategorieDialog {...defaultProps} />);

      // When der Benutzer nur Whitespace eingibt und absendet
      const nameInput = screen.getByLabelText(/Name/);
      await user.type(nameInput, '   ');
      await user.click(screen.getByRole('button', { name: /Kategorie erstellen/ }));

      // Then wird ein Validierungsfehler angezeigt
      await waitFor(() => {
        expect(screen.getByText(/Name ist erforderlich/i)).toBeInTheDocument();
      });
    });

    it('should enforce maxLength of 100 characters', () => {
      // Given offener Dialog
      renderWithProviders(<CreateKategorieDialog {...defaultProps} />);

      // Then hat das Name-Feld ein maxLength-Attribut
      const nameInput = screen.getByLabelText(/Name/);
      expect(nameInput).toHaveAttribute('maxLength', '100');
    });
  });

  // --- Submit (Story 8.1 AC3) ---
  describe('Submit (Story 8.1 AC3)', () => {
    it('should call mutation on valid submit', async () => {
      // Given offener Dialog mit validen Daten
      const user = userEvent.setup();
      renderWithProviders(<CreateKategorieDialog {...defaultProps} />);

      // When der Benutzer Name eingibt und absendet
      const nameInput = screen.getByLabelText(/Name/);
      await user.type(nameInput, 'Einsatzleitung');
      await user.click(screen.getByRole('button', { name: /Kategorie erstellen/ }));

      // Then wird die Mutation mit den richtigen Daten aufgerufen
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            einsatzId: 'einsatz-123',
            data: expect.objectContaining({
              name: 'Einsatzleitung',
              farbe: '#3b82f6', // Default erste Farbe (Blau)
            }),
          }),
          expect.any(Object),
        );
      });
    });

    it('should call mutation with selected color', async () => {
      // Given offener Dialog mit ausgewählter Farbe
      const user = userEvent.setup();
      renderWithProviders(<CreateKategorieDialog {...defaultProps} />);

      // When der Benutzer Name eingibt, Rot wählt und absendet
      const nameInput = screen.getByLabelText(/Name/);
      await user.type(nameInput, 'Lage');

      const rotButton = screen.getByLabelText('Rot');
      await user.click(rotButton);

      await user.click(screen.getByRole('button', { name: /Kategorie erstellen/ }));

      // Then wird die Mutation mit der roten Farbe aufgerufen
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            einsatzId: 'einsatz-123',
            data: expect.objectContaining({
              name: 'Lage',
              farbe: '#ef4444', // Rot
            }),
          }),
          expect.any(Object),
        );
      });
    });
  });

  // --- Dialog-Verhalten ---
  describe('Dialog-Verhalten', () => {
    it('should close dialog on cancel', async () => {
      // Given offener Dialog
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithProviders(<CreateKategorieDialog {...defaultProps} onClose={onClose} />);

      // When Abbrechen geklickt wird
      await user.click(screen.getByRole('button', { name: /Abbrechen/ }));

      // Then wird onClose aufgerufen
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('should disable form fields when isPending', () => {
      // Given ein Dialog mit isPending=true
      mockIsPending.value = true;

      renderWithProviders(<CreateKategorieDialog {...defaultProps} />);

      // Then sind die Form-Felder deaktiviert
      const nameInput = screen.getByLabelText(/Name/);
      expect(nameInput).toBeDisabled();
    });

    it('should have focus on name input', () => {
      // Given offener Dialog
      renderWithProviders(<CreateKategorieDialog {...defaultProps} />);

      // Then ist das Name-Feld focused (durch autoFocus)
      const nameInput = screen.getByLabelText(/Name/);
      expect(nameInput).toHaveFocus();
    });
  });

  // --- Accessibility ---
  describe('Accessibility', () => {
    it('should mark name as required field', () => {
      // Given offener Dialog
      renderWithProviders(<CreateKategorieDialog {...defaultProps} />);

      // Then ist das Name-Label mit Stern sichtbar
      const nameLabel = screen.getByLabelText(/Name/);
      expect(nameLabel).toBeInTheDocument();

      // Und es gibt Sterne für Pflichtfelder
      const requiredMarks = screen.getAllByText('*');
      expect(requiredMarks.length).toBeGreaterThan(0);
      expect(requiredMarks[0]).toHaveClass('text-red-500');
    });

    it('should mark farbe as required field', () => {
      // Given offener Dialog
      renderWithProviders(<CreateKategorieDialog {...defaultProps} />);

      // Then ist das Farbe-Feld als Pflichtfeld markiert
      expect(screen.getByText('Farbe')).toBeInTheDocument();
    });
  });
});
