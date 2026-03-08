/**
 * Unit Tests fuer DeleteNotizDialog Component (Story 7.4).
 *
 * AC2: Bestaetigungsdialog mit Warnung, Notiz-Details und Abbrechen/Loeschen Buttons.
 * AC6: Frontend-Tests fuer DeleteNotizDialog.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeleteNotizDialog } from '@/features/notizen';

const mockMutate = vi.fn();
vi.mock('../../../api', () => ({
  useDeleteNotiz: () => ({ mutate: mockMutate, isPending: false }),
}));

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

describe('DeleteNotizDialog', () => {
  let queryClient: QueryClient;
  const defaultNotiz = {
    id: 'notiz-1',
    titel: 'Lagebericht',
    inhalt: 'Aktuelle Lage',
    kategorie: 'Lage',
    erstelltVon: 'user-1',
    createdAt: '2026-02-04T10:00:00.000Z',
    updatedAt: '2026-02-04T10:00:00.000Z',
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
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderDialog = (props = defaultProps) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <DeleteNotizDialog {...props} />
      </QueryClientProvider>,
    );
  };

  describe('Rendering (AC2)', () => {
    it('sollte den Dialog-Titel mit dem Notiz-Titel anzeigen', () => {
      // Given (Arrange) - Default props

      // When (Act)
      renderDialog();

      // Then (Assert)
      expect(screen.getByTestId('dialog-title')).toHaveTextContent("Notiz 'Lagebericht' löschen?");
    });

    it('sollte die Warnung anzeigen', () => {
      // Given & When
      renderDialog();

      // Then (Assert)
      expect(screen.getByText('Diese Aktion kann nicht rückgängig gemacht werden.')).toBeInTheDocument();
    });

    it('sollte Notiz-Details anzeigen (Titel, Kategorie, Erstellungsdatum)', () => {
      // Given & When
      renderDialog();

      // Then (Assert)
      expect(screen.getByText('Lagebericht')).toBeInTheDocument();
      expect(screen.getByText('Lage')).toBeInTheDocument();
      // Datum im deutschen Format
      expect(screen.getByText(/04\.02\.2026/)).toBeInTheDocument();
    });

    it('sollte Kategorie nicht anzeigen wenn null', () => {
      // Given (Arrange)
      const notizOhneKategorie = { ...defaultNotiz, kategorie: null };

      // When (Act)
      renderDialog({ ...defaultProps, notiz: notizOhneKategorie });

      // Then (Assert)
      expect(screen.queryByText('Kategorie:')).not.toBeInTheDocument();
    });

    it('sollte Abbrechen- und Loeschen-Buttons anzeigen', () => {
      // Given & When
      renderDialog();

      // Then (Assert)
      expect(screen.getByRole('button', { name: /Abbrechen/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Löschen/ })).toBeInTheDocument();
    });

    it('sollte nichts rendern wenn isOpen=false', () => {
      // Given & When
      renderDialog({ ...defaultProps, isOpen: false });

      // Then (Assert)
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('sollte nichts rendern wenn notiz=null', () => {
      // Given & When
      renderDialog({ ...defaultProps, notiz: null });

      // Then (Assert)
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Loeschen (AC3)', () => {
    it('sollte useDeleteNotiz mit korrekten Daten aufrufen', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderDialog();

      // When (Act)
      await user.click(screen.getByRole('button', { name: /Löschen/ }));

      // Then (Assert)
      expect(mockMutate).toHaveBeenCalledWith(
        {
          einsatzId: 'einsatz-123',
          notizId: 'notiz-1',
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
        }),
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
      await user.click(screen.getByRole('button', { name: /Abbrechen/ }));

      // Then (Assert)
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
