/**
 * Unit Tests fuer KategorieList Component
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 8.1:** Kategorie erstellen/loeschen
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { KategorieList } from '../KategorieList';

// Mock API Hooks
const mockUseKategorienByEinsatz = vi.fn();
const mockDeleteMutate = vi.fn();
const mockDeleteIsPending = { value: false };

vi.mock('../../../api', () => ({
  useKategorienByEinsatz: () => mockUseKategorienByEinsatz(),
  useDeleteKategorie: () => ({
    mutate: mockDeleteMutate,
    isPending: mockDeleteIsPending.value,
  }),
  useCreateKategorie: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  KATEGORIE_QUERY_KEYS: {
    all: ['kategorien'],
    lists: () => ['kategorien', 'list'],
    list: (einsatzId: string) => ['kategorien', 'list', einsatzId],
  },
}));

// Mock LoadingState um Router-Abhaengigkeit zu vermeiden
vi.mock('@/shared/ui/atoms/LoadingState', () => ({
  LoadingState: ({ message }: { message?: string }) => <div data-testid="loading-state">{message || 'Lade Daten...'}</div>,
}));

// Mock ErrorState um Router-Abhaengigkeit zu vermeiden
vi.mock('@/shared/ui/atoms/ErrorState', () => ({
  ErrorState: ({ message }: { message?: string }) => <div data-testid="error-state">{message || 'Fehler beim Laden'}</div>,
}));

// Mock CreateKategorieDialog
const mockCreateKategorieDialog = vi.fn();
vi.mock('../CreateKategorieDialog', () => ({
  CreateKategorieDialog: (props: { isOpen: boolean; onClose: () => void; einsatzId: string }) => {
    mockCreateKategorieDialog(props);
    return props.isOpen ? <div data-testid="create-kategorie-dialog">Create Dialog</div> : null;
  },
}));

// Mock KategorieChip
vi.mock('../../atoms/KategorieChip', () => ({
  KategorieChip: ({ name, farbe }: { name: string; farbe: string }) => (
    <div data-testid="kategorie-chip" data-farbe={farbe}>
      {name}
    </div>
  ),
}));

describe('KategorieList', () => {
  const defaultProps = {
    einsatzId: 'einsatz-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteIsPending.value = false;
    mockUseKategorienByEinsatz.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  // --- Loading State ---
  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      // Given isLoading = true
      mockUseKategorienByEinsatz.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      });

      // When die Komponente gerendert wird
      renderWithProviders(<KategorieList {...defaultProps} />);

      // Then wird die Loading-Nachricht angezeigt
      expect(screen.getByText('Kategorien werden geladen...')).toBeInTheDocument();
    });
  });

  // --- Error State ---
  describe('Error State', () => {
    it('should show error message when error is present', () => {
      // Given ein Error-Zustand
      mockUseKategorienByEinsatz.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Netzwerkfehler'),
      });

      // When die Komponente gerendert wird
      renderWithProviders(<KategorieList {...defaultProps} />);

      // Then wird die Fehlermeldung angezeigt
      expect(screen.getByText('Netzwerkfehler')).toBeInTheDocument();
    });

    it('should show default error message when error is not an Error instance', () => {
      // Given ein Error ohne Error-Instanz
      mockUseKategorienByEinsatz.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: 'Some error',
      });

      // When die Komponente gerendert wird
      renderWithProviders(<KategorieList {...defaultProps} />);

      // Then wird eine Standard-Fehlermeldung angezeigt
      expect(screen.getByText('Fehler beim Laden der Kategorien')).toBeInTheDocument();
    });
  });

  // --- Empty State ---
  describe('Empty State', () => {
    it('should show empty message when kategorien array is empty', () => {
      // Given leere Kategorien-Liste
      mockUseKategorienByEinsatz.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      });

      // When die Komponente gerendert wird
      renderWithProviders(<KategorieList {...defaultProps} />);

      // Then wird die leere-Nachricht angezeigt
      expect(screen.getByText('Noch keine Kategorien vorhanden')).toBeInTheDocument();
      expect(screen.getByText('Erstellen Sie eine neue Kategorie mit dem Button oben')).toBeInTheDocument();
    });
  });

  // --- List Rendering ---
  describe('List Rendering', () => {
    it('should render all kategorien with name and color', () => {
      // Given Kategorien mit Daten
      mockUseKategorienByEinsatz.mockReturnValue({
        data: [
          { id: 'kat-1', name: 'Einsatzleitung', farbe: '#3b82f6' },
          { id: 'kat-2', name: 'Lage', farbe: '#ef4444' },
          { id: 'kat-3', name: 'Personal', farbe: '#22c55e' },
        ],
        isLoading: false,
        isError: false,
        error: null,
      });

      // When die Komponente gerendert wird
      renderWithProviders(<KategorieList {...defaultProps} />);

      // Then werden alle Kategorien angezeigt
      const chips = screen.getAllByTestId('kategorie-chip');
      expect(chips).toHaveLength(3);

      expect(screen.getByText('Einsatzleitung')).toBeInTheDocument();
      expect(screen.getByText('Lage')).toBeInTheDocument();
      expect(screen.getByText('Personal')).toBeInTheDocument();

      // Und die Farben werden korrekt uebergeben
      expect(chips[0]).toHaveAttribute('data-farbe', '#3b82f6');
      expect(chips[1]).toHaveAttribute('data-farbe', '#ef4444');
      expect(chips[2]).toHaveAttribute('data-farbe', '#22c55e');
    });

    it('should render delete button for each kategorie', () => {
      // Given Kategorien mit Daten
      mockUseKategorienByEinsatz.mockReturnValue({
        data: [
          { id: 'kat-1', name: 'Einsatzleitung', farbe: '#3b82f6' },
          { id: 'kat-2', name: 'Lage', farbe: '#ef4444' },
        ],
        isLoading: false,
        isError: false,
        error: null,
      });

      // When die Komponente gerendert wird
      renderWithProviders(<KategorieList {...defaultProps} />);

      // Then hat jede Kategorie einen Loeschen-Button
      expect(screen.getByRole('button', { name: 'Einsatzleitung löschen' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Lage löschen' })).toBeInTheDocument();
    });

    it('should render header with title', () => {
      // Given Kategorien mit Daten
      mockUseKategorienByEinsatz.mockReturnValue({
        data: [{ id: 'kat-1', name: 'Test', farbe: '#3b82f6' }],
        isLoading: false,
        isError: false,
        error: null,
      });

      // When die Komponente gerendert wird
      renderWithProviders(<KategorieList {...defaultProps} />);

      // Then wird der Header angezeigt
      expect(screen.getByText('Kategorien')).toBeInTheDocument();
    });
  });

  // --- Delete Functionality ---
  describe('Delete Functionality', () => {
    it('should open confirmation dialog when delete button clicked', async () => {
      // Given Kategorien mit Daten
      const user = userEvent.setup();
      mockUseKategorienByEinsatz.mockReturnValue({
        data: [{ id: 'kat-1', name: 'Einsatzleitung', farbe: '#3b82f6' }],
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(<KategorieList {...defaultProps} />);

      // Then ist der Bestaetigungsdialog anfangs nicht sichtbar
      expect(screen.queryByText('Kategorie löschen?')).not.toBeInTheDocument();

      // When der Loeschen-Button geklickt wird
      await user.click(screen.getByRole('button', { name: 'Einsatzleitung löschen' }));

      // Then wird der Bestaetigungsdialog angezeigt
      expect(screen.getByText('Kategorie löschen?')).toBeInTheDocument();
      expect(screen.getByText(/"Einsatzleitung"/)).toBeInTheDocument();
    });

    it('should call deleteKategorie mutation when delete confirmed', async () => {
      // Given Kategorien mit Daten
      const user = userEvent.setup();
      mockUseKategorienByEinsatz.mockReturnValue({
        data: [{ id: 'kat-1', name: 'Einsatzleitung', farbe: '#3b82f6' }],
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(<KategorieList {...defaultProps} />);

      // When der Loeschen-Button geklickt wird
      await user.click(screen.getByRole('button', { name: 'Einsatzleitung löschen' }));

      // And der "Loeschen"-Button im Dialog geklickt wird
      await user.click(screen.getByRole('button', { name: 'Löschen' }));

      // Then wird die Mutation aufgerufen
      expect(mockDeleteMutate).toHaveBeenCalledWith({ einsatzId: 'einsatz-123', kategorieId: 'kat-1' }, expect.objectContaining({ onSuccess: expect.any(Function) }));
    });

    it('should not call mutation when delete cancelled', async () => {
      // Given Kategorien mit Daten
      const user = userEvent.setup();
      mockUseKategorienByEinsatz.mockReturnValue({
        data: [{ id: 'kat-1', name: 'Einsatzleitung', farbe: '#3b82f6' }],
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(<KategorieList {...defaultProps} />);

      // When der Loeschen-Button geklickt wird
      await user.click(screen.getByRole('button', { name: 'Einsatzleitung löschen' }));

      // And der "Abbrechen"-Button im Dialog geklickt wird
      await user.click(screen.getByRole('button', { name: 'Abbrechen' }));

      // Then wird die Mutation NICHT aufgerufen
      expect(mockDeleteMutate).not.toHaveBeenCalled();

      // And der Dialog ist geschlossen (warte auf Animation)
      await waitFor(() => {
        expect(screen.queryByText('Kategorie löschen?')).not.toBeInTheDocument();
      });
    });

    it('should disable delete buttons when isPending', () => {
      // Given isPending = true
      mockDeleteIsPending.value = true;
      mockUseKategorienByEinsatz.mockReturnValue({
        data: [{ id: 'kat-1', name: 'Einsatzleitung', farbe: '#3b82f6' }],
        isLoading: false,
        isError: false,
        error: null,
      });

      // When die Komponente gerendert wird
      renderWithProviders(<KategorieList {...defaultProps} />);

      // Then ist der Loeschen-Button deaktiviert
      expect(screen.getByRole('button', { name: 'Einsatzleitung löschen' })).toBeDisabled();
    });
  });

  // --- Create Dialog ---
  describe('Create Dialog', () => {
    it('should open CreateKategorieDialog when add button clicked', async () => {
      // Given erfolgreicher Datenzustand
      const user = userEvent.setup();
      mockUseKategorienByEinsatz.mockReturnValue({
        data: [{ id: 'kat-1', name: 'Test', farbe: '#3b82f6' }],
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(<KategorieList {...defaultProps} />);

      // Then ist der Dialog anfangs nicht sichtbar
      expect(screen.queryByTestId('create-kategorie-dialog')).not.toBeInTheDocument();

      // When der "Neue Kategorie" Button geklickt wird
      await user.click(screen.getByRole('button', { name: /Neue Kategorie/ }));

      // Then wird der Dialog geoeffnet
      expect(screen.getByTestId('create-kategorie-dialog')).toBeInTheDocument();
    });

    it('should render "Neue Kategorie" button', () => {
      // Given erfolgreicher Datenzustand
      mockUseKategorienByEinsatz.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      });

      // When die Komponente gerendert wird
      renderWithProviders(<KategorieList {...defaultProps} />);

      // Then ist der Button sichtbar
      expect(screen.getByRole('button', { name: /Neue Kategorie/ })).toBeInTheDocument();
    });

    it('should pass correct einsatzId to CreateKategorieDialog', async () => {
      // Given erfolgreicher Datenzustand
      const user = userEvent.setup();
      mockUseKategorienByEinsatz.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(<KategorieList {...defaultProps} />);

      // When der "Neue Kategorie" Button geklickt wird
      await user.click(screen.getByRole('button', { name: /Neue Kategorie/ }));

      // Then wird der Dialog mit der richtigen einsatzId geoeffnet
      await waitFor(() => {
        expect(mockCreateKategorieDialog).toHaveBeenCalledWith(
          expect.objectContaining({
            isOpen: true,
            einsatzId: 'einsatz-123',
          }),
        );
      });
    });
  });

  // --- Custom className ---
  describe('Styling', () => {
    it('should apply custom className', () => {
      // Given erfolgreicher Datenzustand und custom className
      mockUseKategorienByEinsatz.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      });

      // When die Komponente mit className gerendert wird
      const { container } = renderWithProviders(<KategorieList {...defaultProps} className="my-custom-class" />);

      // Then wird die custom className angewendet
      expect(container.firstChild).toHaveClass('my-custom-class');
    });
  });
});
