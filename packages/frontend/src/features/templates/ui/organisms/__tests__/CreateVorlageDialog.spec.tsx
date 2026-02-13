/**
 * Unit Tests fuer CreateVorlageDialog Component
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 6.1 AC1:** Dialog zum Erstellen einer neuen Erinnerungsvorlage
 * **Story 6.1 AC3:** Validierung der Formularfelder
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateVorlageDialog } from '../CreateVorlageDialog';

// Mock useCreateVorlage Hook
const mockMutate = vi.fn();
const mockUseCreateVorlage = vi.fn().mockReturnValue({
  mutate: mockMutate,
  isPending: false,
});

vi.mock('../../../api', () => ({
  useCreateVorlage: () => mockUseCreateVorlage(),
}));

describe('CreateVorlageDialog', () => {
  let queryClient: QueryClient;
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    mockUseCreateVorlage.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  const renderDialog = (isOpen = true) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CreateVorlageDialog isOpen={isOpen} onClose={mockOnClose} />
      </QueryClientProvider>,
    );
  };

  describe('Rendering (Story 6.1 AC1)', () => {
    it('sollte den Dialog rendern wenn isOpen=true', () => {
      // Given (Arrange) - Dialog mit isOpen=true

      // When (Act)
      renderDialog(true);

      // Then (Assert)
      expect(screen.getByText('Neue Vorlage erstellen')).toBeInTheDocument();
    });

    it('sollte den Dialog NICHT rendern wenn isOpen=false', () => {
      // Given (Arrange) - Dialog mit isOpen=false

      // When (Act)
      renderDialog(false);

      // Then (Assert)
      expect(screen.queryByText('Neue Vorlage erstellen')).not.toBeInTheDocument();
    });

    it('sollte alle Formularfelder anzeigen (Titel, Minuten, Beschreibung)', () => {
      // Given (Arrange) - Geoeffneter Dialog

      // When (Act)
      renderDialog(true);

      // Then (Assert)
      expect(screen.getByLabelText(/Titel/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Minuten/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Beschreibung/)).toBeInTheDocument();
    });

    it('sollte den Titel-Placeholder korrekt anzeigen', () => {
      // Given (Arrange)

      // When (Act)
      renderDialog(true);

      // Then (Assert)
      expect(screen.getByPlaceholderText('z.B. Lagebesprechung, Funkrunde...')).toBeInTheDocument();
    });

    it('sollte Buttons "Abbrechen" und "Vorlage erstellen" anzeigen', () => {
      // Given (Arrange)

      // When (Act)
      renderDialog(true);

      // Then (Assert)
      expect(screen.getByRole('button', { name: /Abbrechen/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Vorlage erstellen/ })).toBeInTheDocument();
    });
  });

  describe('Validierung (Story 6.1 AC3)', () => {
    it('sollte Validierungsfehler bei leerem Titel anzeigen', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderDialog(true);

      // When (Act) - Titel leer lassen und Submit klicken
      const titelInput = screen.getByLabelText(/Titel/);
      await user.clear(titelInput);
      const submitButton = screen.getByRole('button', { name: /Vorlage erstellen/ });
      await user.click(submitButton);

      // Then (Assert) - Validierungsfehler wird angezeigt
      await waitFor(() => {
        expect(screen.getByText(/Titel ist erforderlich/)).toBeInTheDocument();
      });
    });

    it('sollte den Default-Wert 30 fuer Minuten setzen', () => {
      // Given (Arrange)

      // When (Act)
      renderDialog(true);

      // Then (Assert)
      const minutenInput = screen.getByLabelText(/Minuten/) as HTMLInputElement;
      expect(minutenInput.value).toBe('30');
    });
  });

  describe('Pending State', () => {
    it('sollte den Submit-Button deaktivieren waehrend isPending', () => {
      // Given (Arrange) - Hook gibt isPending=true zurueck
      mockUseCreateVorlage.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      });

      // When (Act)
      renderDialog(true);

      // Then (Assert)
      const submitButton = screen.getByRole('button', { name: /Vorlage erstellen/ });
      expect(submitButton).toBeDisabled();
    });

    it('sollte den Abbrechen-Button deaktivieren waehrend isPending', () => {
      // Given (Arrange)
      mockUseCreateVorlage.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      });

      // When (Act)
      renderDialog(true);

      // Then (Assert)
      const cancelButton = screen.getByRole('button', { name: /Abbrechen/ });
      expect(cancelButton).toBeDisabled();
    });

    it('sollte die Formularfelder deaktivieren waehrend isPending', () => {
      // Given (Arrange)
      mockUseCreateVorlage.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      });

      // When (Act)
      renderDialog(true);

      // Then (Assert)
      expect(screen.getByLabelText(/Titel/)).toBeDisabled();
      expect(screen.getByLabelText(/Minuten/)).toBeDisabled();
      expect(screen.getByLabelText(/Beschreibung/)).toBeDisabled();
    });
  });

  describe('Interaktion', () => {
    it('sollte onClose aufrufen beim Klick auf Abbrechen', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderDialog(true);

      // When (Act)
      await user.click(screen.getByRole('button', { name: /Abbrechen/ }));

      // Then (Assert)
      expect(mockOnClose).toHaveBeenCalledOnce();
    });
  });
});
