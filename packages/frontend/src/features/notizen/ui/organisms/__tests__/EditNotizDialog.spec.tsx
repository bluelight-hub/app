/**
 * Unit Tests fuer EditNotizDialog Component
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 7.3:** Notiz bearbeiten
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditNotizDialog } from '../EditNotizDialog';

// Mock useUpdateNotiz Hook
const mockMutate = vi.fn();
vi.mock('../../../api', () => ({
  useUpdateNotiz: () => ({ mutate: mockMutate, isPending: false }),
}));

// Mock KategorieSelector
vi.mock('@/features/kategorien', () => ({
  KategorieSelector: ({ value, onChange, disabled }: { value?: string | null; onChange: (val: string | null) => void; disabled?: boolean }) => (
    <select data-testid="kategorie-selector" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} disabled={disabled} aria-label="Kategorie">
      <option value="">Keine Kategorie</option>
      <option value="kat-1">Lage</option>
      <option value="kat-2">Personal</option>
    </select>
  ),
}));

// Mock Dialog component
vi.mock('@/shared/ui/molecules/dialog.molecule', () => ({
  Dialog: Object.assign(
    ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) => {
      if (!isOpen) return null;
      return (
        <div data-testid="dialog" role="dialog">
          <button type="button" data-testid="dialog-close" onClick={onClose}>
            Close
          </button>
          {children}
        </div>
      );
    },
    {
      Title: ({ children }: { children: React.ReactNode }) => <h2 data-testid="dialog-title">{children}</h2>,
      Body: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-body">{children}</div>,
      Footer: ({ children }: { children: React.ReactNode; loading?: boolean }) => <div data-testid="dialog-footer">{children}</div>,
    },
  ),
}));

describe('EditNotizDialog', () => {
  let queryClient: QueryClient;
  const defaultNotiz = {
    id: 'notiz-1',
    titel: 'Lagebericht',
    inhalt: 'Aktuelle Lage beschrieben',
    kategorieId: 'kat-1',
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    einsatzId: 'einsatz-123',
    notiz: defaultNotiz,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderDialog = (props = defaultProps) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <EditNotizDialog {...props} />
      </QueryClientProvider>,
    );
  };

  describe('Rendering', () => {
    it('sollte den Dialog mit Titel "Notiz bearbeiten" anzeigen', () => {
      // Given (Arrange) - Default props

      // When (Act)
      renderDialog();

      // Then (Assert)
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Notiz bearbeiten');
    });

    it('sollte die Form-Felder mit den aktuellen Notiz-Werten befuellen', () => {
      // Given (Arrange) - Notiz mit allen Feldern

      // When (Act)
      renderDialog();

      // Then (Assert) - Felder sind vorbefuellt
      const titelInput = screen.getByLabelText(/Titel/);
      expect(titelInput).toHaveValue('Lagebericht');

      const inhaltTextarea = screen.getByLabelText(/Inhalt/);
      expect(inhaltTextarea).toHaveValue('Aktuelle Lage beschrieben');

      const kategorieSelector = screen.getByTestId('kategorie-selector');
      expect(kategorieSelector).toHaveValue('kat-1');
    });

    it('sollte nichts rendern wenn isOpen=false', () => {
      // Given (Arrange) - Dialog geschlossen

      // When (Act)
      renderDialog({ ...defaultProps, isOpen: false });

      // Then (Assert)
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Form Interaktion', () => {
    it('sollte den Titel ändern können', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderDialog();

      // When (Act)
      const titelInput = screen.getByLabelText(/Titel/);
      await user.clear(titelInput);
      await user.type(titelInput, 'Neuer Titel');

      // Then (Assert)
      expect(titelInput).toHaveValue('Neuer Titel');
    });

    it('sollte den Inhalt ändern können', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderDialog();

      // When (Act)
      const inhaltTextarea = screen.getByLabelText(/Inhalt/);
      await user.clear(inhaltTextarea);
      await user.type(inhaltTextarea, 'Neuer Inhalt');

      // Then (Assert)
      expect(inhaltTextarea).toHaveValue('Neuer Inhalt');
    });
  });

  describe('Submit', () => {
    it('sollte useUpdateNotiz mit den richtigen Daten aufrufen', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderDialog();

      // When (Act) - Titel ändern und absenden
      const titelInput = screen.getByLabelText(/Titel/);
      await user.clear(titelInput);
      await user.type(titelInput, 'Aktualisierter Lagebericht');

      const submitButton = screen.getByRole('button', { name: /Speichern/ });
      await user.click(submitButton);

      // Then (Assert)
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          einsatzId: 'einsatz-123',
          notizId: 'notiz-1',
          data: expect.objectContaining({
            titel: 'Aktualisierter Lagebericht',
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('Abbrechen', () => {
    it('sollte onClose aufrufen beim Klick auf Abbrechen', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderDialog({ ...defaultProps, onClose });

      // When (Act)
      const cancelButton = screen.getByRole('button', { name: /Abbrechen/ });
      await user.click(cancelButton);

      // Then (Assert)
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Team-Sichtbarkeit Toggle (Story 7.7)', () => {
    it('should render team visibility toggle', () => {
      // Given (Arrange) - Dialog mit Standard-Notiz

      // When (Act)
      renderDialog();

      // Then (Assert) - Toggle-Label ist sichtbar
      expect(screen.getByText('Für das Team sichtbar')).toBeInTheDocument();
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('should show toggle with initial value from notiz', () => {
      // Given (Arrange) - Notiz mit istTeamsichtbar: true
      const notizTeamsichtbar = {
        ...defaultNotiz,
        istTeamsichtbar: true,
      };

      // When (Act)
      renderDialog({ ...defaultProps, notiz: notizTeamsichtbar });

      // Then (Assert) - Switch ist aktiviert
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('should show toggle as unchecked when notiz.istTeamsichtbar is false', () => {
      // Given (Arrange) - Notiz mit istTeamsichtbar: false
      const notizNichtTeamsichtbar = {
        ...defaultNotiz,
        istTeamsichtbar: false,
      };

      // When (Act)
      renderDialog({ ...defaultProps, notiz: notizNichtTeamsichtbar });

      // Then (Assert) - Switch ist deaktiviert
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('Leere optionale Felder', () => {
    it('sollte ohne Inhalt und Kategorie korrekt rendern', () => {
      // Given (Arrange) - Notiz ohne optionale Felder
      const notizOhneOptionale = {
        id: 'notiz-2',
        titel: 'Nur Titel',
        inhalt: null,
        kategorieId: null,
      };

      // When (Act)
      renderDialog({ ...defaultProps, notiz: notizOhneOptionale });

      // Then (Assert)
      const titelInput = screen.getByLabelText(/Titel/);
      expect(titelInput).toHaveValue('Nur Titel');

      const inhaltTextarea = screen.getByLabelText(/Inhalt/);
      expect(inhaltTextarea).toHaveValue('');

      const kategorieSelector = screen.getByTestId('kategorie-selector');
      expect(kategorieSelector).toHaveValue('');
    });
  });
});
