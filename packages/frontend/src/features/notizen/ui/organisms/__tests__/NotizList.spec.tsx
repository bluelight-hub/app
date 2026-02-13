/**
 * Unit Tests fuer NotizList Component
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 7.1:** Liste der Notizen fuer einen Einsatz mit Create-Dialog
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotizList } from '../NotizList';

// Mock useCurrentUser Hook (Story 7.7: Team-Sichtbarkeit)
vi.mock('@/features/auth/api', () => ({
  useCurrentUser: () => ({ user: { id: 'user-1', name: 'Test User' }, isLoading: false }),
}));

// Mock useNotizenByEinsatz Hook
const mockUseNotizenByEinsatz = vi.fn();

vi.mock('../../../api', () => ({
  useNotizenByEinsatz: () => mockUseNotizenByEinsatz(),
  useCreateNotiz: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateNotiz: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteNotiz: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Mock NotizCard Subcomponent
vi.mock('../../atoms/NotizCard', () => ({
  NotizCard: ({
    titel,
    kategorieName,
    kategorieFarbe,
    searchQuery,
    onEdit,
    onDelete,
    onConvertToErinnerung,
  }: {
    titel: string;
    kategorieName?: string | null;
    kategorieFarbe?: string | null;
    searchQuery?: string;
    onEdit?: () => void;
    onDelete?: () => void;
    onConvertToErinnerung?: () => void;
  }) => (
    <div data-testid="notiz-card" data-search-query={searchQuery ?? ''}>
      <span>{titel}</span>
      {kategorieName && kategorieFarbe && <span>{kategorieName}</span>}
      {onConvertToErinnerung && (
        <button type="button" data-testid="convert-button" onClick={onConvertToErinnerung}>
          Zu Erinnerung
        </button>
      )}
      {onEdit && (
        <button type="button" data-testid="edit-button" onClick={onEdit}>
          Bearbeiten
        </button>
      )}
      {onDelete && (
        <button type="button" data-testid="delete-button" onClick={onDelete}>
          Löschen
        </button>
      )}
    </div>
  ),
}));

// Mock NotizSearchBar (Story 7.8)
vi.mock('../../molecules/NotizSearchBar', () => ({
  NotizSearchBar: ({ value, onChange, onClear, resultCount, totalCount }: { value: string; onChange: (v: string) => void; onClear: () => void; resultCount?: number; totalCount?: number }) => (
    <div data-testid="notiz-search-bar">
      <input data-testid="search-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Notizen durchsuchen..." />
      {value && (
        <button data-testid="search-clear" type="button" onClick={onClear}>
          Clear
        </button>
      )}
      {resultCount !== undefined && value && (
        <span data-testid="result-count">
          {resultCount} von {totalCount}
        </span>
      )}
    </div>
  ),
}));

// Mock CreateNotizDialog
const mockCreateNotizDialog = vi.fn();
vi.mock('../CreateNotizDialog', () => ({
  CreateNotizDialog: (props: { isOpen: boolean; onClose: () => void; einsatzId: string }) => {
    mockCreateNotizDialog(props);
    return props.isOpen ? <div data-testid="create-notiz-dialog">Create Dialog</div> : null;
  },
}));

// Mock EditNotizDialog
const mockEditNotizDialog = vi.fn();
vi.mock('../EditNotizDialog', () => ({
  EditNotizDialog: (props: { isOpen: boolean; onClose: () => void; einsatzId: string; notiz: { id: string } }) => {
    mockEditNotizDialog(props);
    return props.isOpen ? <div data-testid="edit-notiz-dialog">Edit Dialog</div> : null;
  },
}));

// Mock DeleteNotizDialog (Story 7.4)
const mockDeleteNotizDialog = vi.fn();
vi.mock('../DeleteNotizDialog', () => ({
  DeleteNotizDialog: (props: { isOpen: boolean; onClose: () => void; einsatzId: string; notiz: { id: string } | null }) => {
    mockDeleteNotizDialog(props);
    return props.isOpen ? <div data-testid="delete-notiz-dialog">Delete Dialog</div> : null;
  },
}));

// Mock QuickCreateErinnerungDialog (Story 7.6)
const mockQuickCreateErinnerungDialog = vi.fn();
vi.mock('@/features/reminders', () => ({
  QuickCreateErinnerungDialog: (props: { isOpen: boolean; onClose: () => void; einsatzId: string; fromNotiz?: { notizId: string; titel: string; inhalt?: string | null } }) => {
    mockQuickCreateErinnerungDialog(props);
    return props.isOpen ? <div data-testid="convert-erinnerung-dialog">Convert Dialog</div> : null;
  },
  KategorieFilterDropdown: ({ selectedFilter, onFilterChange }: { selectedFilter: { type: string }; onFilterChange: (f: { type: string }) => void }) => (
    <button type="button" data-testid="kategorie-filter-dropdown" onClick={() => onFilterChange({ type: 'kategorie', kategorieId: 'kat-1' })}>
      Kategorie-Filter: {selectedFilter.type}
    </button>
  ),
  // Story 8.6: Mock ActiveFiltersBar
  ActiveFiltersBar: ({ kategorieFilter, onClearKategorieFilter }: { kategorieFilter?: { type: string }; onClearKategorieFilter?: () => void }) =>
    kategorieFilter && kategorieFilter.type !== 'all' ? (
      <div data-testid="active-filters-bar">
        <button type="button" data-testid="clear-kategorie-filter" onClick={onClearKategorieFilter}>
          Clear Kategorie
        </button>
      </div>
    ) : null,
}));

// Mock Kategorie-Filter Store (Story 8.3 Task 5)
const mockUseKategorieFilter = vi.fn().mockReturnValue({ type: 'all' });
const mockSetKategorieFilter = vi.fn();
const mockResetKategorieFilterStore = vi.fn();

vi.mock('@/features/reminders/stores', () => ({
  useKategorieFilter: () => mockUseKategorieFilter(),
  setKategorieFilter: (...args: unknown[]) => mockSetKategorieFilter(...args),
  resetKategorieFilterStore: () => mockResetKategorieFilterStore(),
}));

// Mock useKategorienByEinsatz (Story 8.3)
vi.mock('@/features/kategorien', () => ({
  useKategorienByEinsatz: vi.fn().mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
  }),
}));

describe('NotizList', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    mockUseNotizenByEinsatz.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
  });

  const renderList = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NotizList einsatzId="einsatz-123" />
      </QueryClientProvider>,
    );
  };

  describe('Header', () => {
    it('sollte die Ueberschrift "Notizen" anzeigen', () => {
      // Given (Arrange) - Default State

      // When (Act)
      renderList();

      // Then (Assert)
      expect(screen.getByText('Notizen')).toBeInTheDocument();
    });

    it('sollte den "Neue Notiz" Button anzeigen', () => {
      // Given (Arrange)

      // When (Act)
      renderList();

      // Then (Assert)
      expect(screen.getByRole('button', { name: /Neue Notiz/ })).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('sollte den Loading-Spinner anzeigen waehrend isLoading=true', () => {
      // Given (Arrange) - Loading state
      mockUseNotizenByEinsatz.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      // When (Act)
      renderList();

      // Then (Assert) - Spinner ist sichtbar (animate-spin Element)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('sollte Fehlermeldung anzeigen bei Error', () => {
      // Given (Arrange) - Error state
      mockUseNotizenByEinsatz.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      // When (Act)
      renderList();

      // Then (Assert)
      expect(screen.getByText('Fehler beim Laden der Notizen')).toBeInTheDocument();
    });
  });

  describe('Leere Liste', () => {
    it('sollte eine leere Anzeige mit CTA anzeigen', () => {
      // Given (Arrange) - Leere Notizen-Liste
      mockUseNotizenByEinsatz.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      // When (Act)
      renderList();

      // Then (Assert)
      expect(screen.getByText('Noch keine Notizen vorhanden')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Erste Notiz erstellen/ })).toBeInTheDocument();
    });

    it('sollte den Dialog oeffnen beim Klick auf "Erste Notiz erstellen"', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockUseNotizenByEinsatz.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });
      renderList();

      // When (Act)
      await user.click(screen.getByRole('button', { name: /Erste Notiz erstellen/ }));

      // Then (Assert)
      expect(screen.getByTestId('create-notiz-dialog')).toBeInTheDocument();
    });
  });

  describe('Notiz-Karten', () => {
    it('sollte Notiz-Karten rendern wenn Daten vorhanden sind', () => {
      // Given (Arrange) - Notizen mit Daten
      mockUseNotizenByEinsatz.mockReturnValue({
        data: [
          { id: '1', titel: 'Lagebericht', inhalt: 'Text', kategorie: 'Lage', erstelltVon: 'user-1', createdAt: '2026-02-03T15:00:00.000Z' },
          { id: '2', titel: 'Einsatztagebuch', inhalt: 'Eintrag', kategorie: null, erstelltVon: 'user-2', createdAt: '2026-02-03T16:00:00.000Z' },
        ],
        isLoading: false,
        error: null,
      });

      // When (Act)
      renderList();

      // Then (Assert)
      const cards = screen.getAllByTestId('notiz-card');
      expect(cards).toHaveLength(2);
      expect(screen.getByText('Lagebericht')).toBeInTheDocument();
      expect(screen.getByText('Einsatztagebuch')).toBeInTheDocument();
    });

    it('sollte Notizen in der vom Backend gelieferten Reihenfolge rendern (neueste zuerst, AC1)', () => {
      // Given (Arrange) - Notizen in DESC Reihenfolge (wie Backend liefert)
      mockUseNotizenByEinsatz.mockReturnValue({
        data: [
          { id: '3', titel: 'Neueste Notiz', inhalt: null, kategorie: 'Lage', erstelltVon: 'user-1', createdAt: '2026-02-03T18:00:00.000Z' },
          { id: '2', titel: 'Mittlere Notiz', inhalt: null, kategorie: null, erstelltVon: 'user-1', createdAt: '2026-02-03T16:00:00.000Z' },
          { id: '1', titel: 'Aelteste Notiz', inhalt: null, kategorie: null, erstelltVon: 'user-1', createdAt: '2026-02-03T14:00:00.000Z' },
        ],
        isLoading: false,
        error: null,
      });

      // When (Act)
      renderList();

      // Then (Assert) - Reihenfolge pruefen
      const cards = screen.getAllByTestId('notiz-card');
      expect(cards).toHaveLength(3);
      expect(cards[0]).toHaveTextContent('Neueste Notiz');
      expect(cards[1]).toHaveTextContent('Mittlere Notiz');
      expect(cards[2]).toHaveTextContent('Aelteste Notiz');
    });
  });

  describe('Dialog Interaktion', () => {
    it('sollte den CreateNotizDialog oeffnen beim Klick auf "Neue Notiz"', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockUseNotizenByEinsatz.mockReturnValue({
        data: [{ id: '1', titel: 'Lagebericht', inhalt: 'Text', kategorie: 'Lage', erstelltVon: 'user-1', createdAt: '2026-02-03T15:00:00.000Z' }],
        isLoading: false,
        error: null,
      });
      renderList();

      // When (Act)
      await user.click(screen.getByRole('button', { name: /Neue Notiz/ }));

      // Then (Assert) - Dialog sollte geoeffnet sein
      expect(screen.getByTestId('create-notiz-dialog')).toBeInTheDocument();
    });

    it('sollte den EditNotizDialog oeffnen beim Klick auf "Bearbeiten" (Story 7.3)', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockUseNotizenByEinsatz.mockReturnValue({
        data: [{ id: '1', titel: 'Lagebericht', inhalt: 'Text', kategorie: 'Lage', erstelltVon: 'user-1', createdAt: '2026-02-03T15:00:00.000Z', updatedAt: '2026-02-03T15:00:00.000Z' }],
        isLoading: false,
        error: null,
      });
      renderList();

      // When (Act)
      await user.click(screen.getByTestId('edit-button'));

      // Then (Assert) - Edit Dialog sollte geoeffnet sein
      expect(screen.getByTestId('edit-notiz-dialog')).toBeInTheDocument();
      expect(mockEditNotizDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          isOpen: true,
          einsatzId: 'einsatz-123',
          notiz: expect.objectContaining({ id: '1', titel: 'Lagebericht' }),
        }),
      );
    });
  });

  describe('Edit-Button (Story 7.3)', () => {
    it('sollte jede NotizCard mit onEdit-Callback rendern', () => {
      // Given (Arrange) - Notizen mit Daten
      mockUseNotizenByEinsatz.mockReturnValue({
        data: [
          { id: '1', titel: 'Notiz A', inhalt: null, kategorie: null, erstelltVon: 'user-1', createdAt: '2026-02-03T15:00:00.000Z', updatedAt: '2026-02-03T15:00:00.000Z' },
          { id: '2', titel: 'Notiz B', inhalt: null, kategorie: null, erstelltVon: 'user-1', createdAt: '2026-02-03T16:00:00.000Z', updatedAt: '2026-02-03T16:00:00.000Z' },
        ],
        isLoading: false,
        error: null,
      });

      // When (Act)
      renderList();

      // Then (Assert) - Jede Karte hat einen Edit-Button
      const editButtons = screen.getAllByTestId('edit-button');
      expect(editButtons).toHaveLength(2);
    });
  });

  describe('Delete-Button (Story 7.4)', () => {
    it('sollte jede NotizCard mit onDelete-Callback rendern', () => {
      // Given (Arrange) - Notizen mit Daten
      mockUseNotizenByEinsatz.mockReturnValue({
        data: [
          { id: '1', titel: 'Notiz A', inhalt: null, kategorie: null, erstelltVon: 'user-1', createdAt: '2026-02-03T15:00:00.000Z', updatedAt: '2026-02-03T15:00:00.000Z' },
          { id: '2', titel: 'Notiz B', inhalt: null, kategorie: null, erstelltVon: 'user-1', createdAt: '2026-02-03T16:00:00.000Z', updatedAt: '2026-02-03T16:00:00.000Z' },
        ],
        isLoading: false,
        error: null,
      });

      // When (Act)
      renderList();

      // Then (Assert) - Jede Karte hat einen Delete-Button
      const deleteButtons = screen.getAllByTestId('delete-button');
      expect(deleteButtons).toHaveLength(2);
    });

    it('sollte den DeleteNotizDialog oeffnen beim Klick auf "Löschen"', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockUseNotizenByEinsatz.mockReturnValue({
        data: [{ id: '1', titel: 'Lagebericht', inhalt: 'Text', kategorie: 'Lage', erstelltVon: 'user-1', createdAt: '2026-02-03T15:00:00.000Z', updatedAt: '2026-02-03T15:00:00.000Z' }],
        isLoading: false,
        error: null,
      });
      renderList();

      // When (Act)
      await user.click(screen.getByTestId('delete-button'));

      // Then (Assert) - Delete Dialog sollte geoeffnet sein
      expect(screen.getByTestId('delete-notiz-dialog')).toBeInTheDocument();
      expect(mockDeleteNotizDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          isOpen: true,
          einsatzId: 'einsatz-123',
          notiz: expect.objectContaining({ id: '1', titel: 'Lagebericht' }),
        }),
      );
    });
  });

  describe('Convert-to-Erinnerung (Story 7.6)', () => {
    it('sollte jede NotizCard mit onConvertToErinnerung-Callback rendern', () => {
      // Given (Arrange) - Notizen mit Daten
      mockUseNotizenByEinsatz.mockReturnValue({
        data: [
          { id: '1', titel: 'Notiz A', inhalt: null, kategorie: null, erstelltVon: 'user-1', createdAt: '2026-02-03T15:00:00.000Z', updatedAt: '2026-02-03T15:00:00.000Z' },
          { id: '2', titel: 'Notiz B', inhalt: null, kategorie: null, erstelltVon: 'user-1', createdAt: '2026-02-03T16:00:00.000Z', updatedAt: '2026-02-03T16:00:00.000Z' },
        ],
        isLoading: false,
        error: null,
      });

      // When (Act)
      renderList();

      // Then (Assert) - Jede Karte hat einen Convert-Button
      const convertButtons = screen.getAllByTestId('convert-button');
      expect(convertButtons).toHaveLength(2);
    });

    it('sollte den QuickCreateErinnerungDialog oeffnen beim Klick auf "Zu Erinnerung"', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockUseNotizenByEinsatz.mockReturnValue({
        data: [{ id: '1', titel: 'Lagebericht', inhalt: 'Wichtige Info', kategorie: 'Lage', erstelltVon: 'user-1', createdAt: '2026-02-03T15:00:00.000Z', updatedAt: '2026-02-03T15:00:00.000Z' }],
        isLoading: false,
        error: null,
      });
      renderList();

      // When (Act)
      await user.click(screen.getByTestId('convert-button'));

      // Then (Assert) - Convert Dialog sollte geoeffnet sein
      expect(screen.getByTestId('convert-erinnerung-dialog')).toBeInTheDocument();
      expect(mockQuickCreateErinnerungDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          isOpen: true,
          einsatzId: 'einsatz-123',
          fromNotiz: {
            notizId: '1',
            titel: 'Lagebericht',
            inhalt: 'Wichtige Info',
          },
        }),
      );
    });

    it('sollte den QuickCreateErinnerungDialog nicht rendern wenn keine Notiz konvertiert wird', () => {
      // Given (Arrange) - Notizen vorhanden, aber keine Konvertierung aktiv
      mockUseNotizenByEinsatz.mockReturnValue({
        data: [{ id: '1', titel: 'Lagebericht', inhalt: 'Text', kategorie: 'Lage', erstelltVon: 'user-1', createdAt: '2026-02-03T15:00:00.000Z', updatedAt: '2026-02-03T15:00:00.000Z' }],
        isLoading: false,
        error: null,
      });

      // When (Act)
      renderList();

      // Then (Assert) - Convert Dialog sollte nicht sichtbar sein
      expect(screen.queryByTestId('convert-erinnerung-dialog')).not.toBeInTheDocument();
    });
  });

  describe('Suchfeld Sichtbarkeit (Story 7.8)', () => {
    it('sollte das Suchfeld anzeigen wenn Notizen vorhanden sind', () => {
      // Given (Arrange) - Notizen mit Daten
      mockUseNotizenByEinsatz.mockReturnValue({
        data: [{ id: '1', titel: 'Lagebericht', inhalt: 'Text', kategorie: 'Lage', erstelltVon: 'user-1', createdAt: '2026-02-03T15:00:00.000Z', updatedAt: '2026-02-03T15:00:00.000Z' }],
        isLoading: false,
        error: null,
      });

      // When (Act)
      renderList();

      // Then (Assert) - Suchfeld ist sichtbar
      expect(screen.getByTestId('notiz-search-bar')).toBeInTheDocument();
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });

    it('sollte das Suchfeld NICHT anzeigen wenn keine Notizen vorhanden sind', () => {
      // Given (Arrange) - Leere Notizen-Liste
      mockUseNotizenByEinsatz.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      // When (Act)
      renderList();

      // Then (Assert) - Suchfeld ist nicht sichtbar
      expect(screen.queryByTestId('notiz-search-bar')).not.toBeInTheDocument();
    });
  });

  describe('Such-Filterung (Story 7.8)', () => {
    const searchTestNotizen = [
      {
        id: '1',
        titel: 'Material bestellt',
        inhalt: 'RTW Material angefordert',
        kategorie: 'Lage',
        erstelltVon: 'user-1',
        createdAt: '2026-02-03T15:00:00.000Z',
        updatedAt: '2026-02-03T15:00:00.000Z',
      },
      { id: '2', titel: 'Lagebericht', inhalt: 'Keine besonderen Vorkommnisse', kategorie: null, erstelltVon: 'user-1', createdAt: '2026-02-03T16:00:00.000Z', updatedAt: '2026-02-03T16:00:00.000Z' },
      { id: '3', titel: 'Personalübersicht', inhalt: null, kategorie: null, erstelltVon: 'user-1', createdAt: '2026-02-03T17:00:00.000Z', updatedAt: '2026-02-03T17:00:00.000Z' },
    ];

    it('sollte Notizen nach Titel filtern', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockUseNotizenByEinsatz.mockReturnValue({
        data: searchTestNotizen,
        isLoading: false,
        error: null,
      });
      renderList();

      // When (Act) - Suche nach "Lage" (matched Titel "Lagebericht")
      await user.type(screen.getByTestId('search-input'), 'Lage');

      // Then (Assert) - Nur "Lagebericht" sollte sichtbar sein
      const cards = screen.getAllByTestId('notiz-card');
      expect(cards).toHaveLength(1);
      expect(cards[0]).toHaveTextContent('Lagebericht');
    });

    it('sollte Notizen nach Inhalt filtern', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockUseNotizenByEinsatz.mockReturnValue({
        data: searchTestNotizen,
        isLoading: false,
        error: null,
      });
      renderList();

      // When (Act) - Suche nach "RTW" (matched Inhalt von "Material bestellt")
      await user.type(screen.getByTestId('search-input'), 'RTW');

      // Then (Assert) - Nur "Material bestellt" sollte sichtbar sein
      const cards = screen.getAllByTestId('notiz-card');
      expect(cards).toHaveLength(1);
      expect(cards[0]).toHaveTextContent('Material bestellt');
    });

    it('sollte case-insensitive filtern', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockUseNotizenByEinsatz.mockReturnValue({
        data: searchTestNotizen,
        isLoading: false,
        error: null,
      });
      renderList();

      // When (Act) - Suche nach "material" (Kleinbuchstaben, matched Titel "Material bestellt")
      await user.type(screen.getByTestId('search-input'), 'material');

      // Then (Assert) - "Material bestellt" sollte gefunden werden
      const cards = screen.getAllByTestId('notiz-card');
      expect(cards).toHaveLength(1);
      expect(cards[0]).toHaveTextContent('Material bestellt');
    });

    it('sollte Such-Empty-State anzeigen wenn keine Treffer', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockUseNotizenByEinsatz.mockReturnValue({
        data: searchTestNotizen,
        isLoading: false,
        error: null,
      });
      renderList();

      // When (Act) - Suche nach nicht existierendem Begriff
      await user.type(screen.getByTestId('search-input'), 'xyz');

      // Then (Assert) - Such-Empty-State angezeigt
      expect(screen.queryByTestId('notiz-card')).not.toBeInTheDocument();
      expect(screen.getByText(/Keine Notizen für/)).toBeInTheDocument();
      expect(screen.getByText(/xyz/)).toBeInTheDocument();
    });

    it('sollte alle Notizen anzeigen nach Clear', async () => {
      // Given (Arrange) - Erst filtern, dann clearen
      const user = userEvent.setup();
      mockUseNotizenByEinsatz.mockReturnValue({
        data: searchTestNotizen,
        isLoading: false,
        error: null,
      });
      renderList();

      // Erst filtern
      await user.type(screen.getByTestId('search-input'), 'Lage');
      expect(screen.getAllByTestId('notiz-card')).toHaveLength(1);

      // When (Act) - Clear klicken
      await user.click(screen.getByTestId('search-clear'));

      // Then (Assert) - Alle Notizen wieder sichtbar
      const cards = screen.getAllByTestId('notiz-card');
      expect(cards).toHaveLength(3);
    });

    it('sollte searchQuery an NotizCard Komponenten weitergeben', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockUseNotizenByEinsatz.mockReturnValue({
        data: searchTestNotizen,
        isLoading: false,
        error: null,
      });
      renderList();

      // When (Act) - Suche nach "Material"
      await user.type(screen.getByTestId('search-input'), 'Material');

      // Then (Assert) - NotizCard erhält searchQuery als Prop
      const cards = screen.getAllByTestId('notiz-card');
      expect(cards[0]).toHaveAttribute('data-search-query', 'Material');
    });

    it('sollte Result-Counter anzeigen bei aktiver Suche', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockUseNotizenByEinsatz.mockReturnValue({
        data: searchTestNotizen,
        isLoading: false,
        error: null,
      });
      renderList();

      // When (Act) - Suche nach "Material" (1 Treffer von 3)
      await user.type(screen.getByTestId('search-input'), 'Material');

      // Then (Assert) - Result-Counter zeigt "1 von 3"
      const resultCount = screen.getByTestId('result-count');
      expect(resultCount).toHaveTextContent('1 von 3');
    });
  });

  describe('Kategorie-Filter (Story 8.3 Task 5)', () => {
    /** Helper fuer Mock-Notiz-Erstellung */
    const createMockNotiz = (overrides: Partial<{ id: string; titel: string; inhalt: string | null; kategorie: string | null; erstelltVon: string; createdAt: string; updatedAt: string }>) => ({
      id: 'default-id',
      titel: 'Default Titel',
      inhalt: null,
      kategorie: null,
      erstelltVon: 'user-1',
      createdAt: '2026-02-03T15:00:00.000Z',
      updatedAt: '2026-02-03T15:00:00.000Z',
      ...overrides,
    });

    beforeEach(() => {
      // Reset mocks
      mockUseKategorieFilter.mockReturnValue({ type: 'all' });
    });

    it('sollte KategorieFilterDropdown anzeigen wenn Notizen vorhanden (AC3)', () => {
      // Given (Arrange)
      mockUseNotizenByEinsatz.mockReturnValue({
        data: [createMockNotiz({ id: '1', titel: 'Test' })],
        isLoading: false,
        error: null,
      });

      // When (Act)
      renderList();

      // Then (Assert)
      expect(screen.getByTestId('kategorie-filter-dropdown')).toBeInTheDocument();
    });

    it('sollte resetKategorieFilterStore bei Unmount aufrufen (AC6)', () => {
      // Given (Arrange)
      mockUseNotizenByEinsatz.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      const { unmount } = renderList();

      // When (Act)
      unmount();

      // Then (Assert)
      expect(mockResetKategorieFilterStore).toHaveBeenCalled();
    });
  });
});
