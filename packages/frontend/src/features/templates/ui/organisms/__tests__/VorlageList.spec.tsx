/**
 * Unit Tests fuer VorlageList Component
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 6.1 AC2:** Liste der Vorlagen mit "Neue Vorlage" Button
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VorlageList } from '../VorlageList';

// Mock useVorlagen Hook
const mockUseVorlagen = vi.fn();

vi.mock('../../../api', () => ({
  useVorlagen: () => mockUseVorlagen(),
}));

// Mock VorlageCard Subcomponent
vi.mock('../../atoms/VorlageCard', () => ({
  VorlageCard: ({ titel, minuten, beschreibung }: { titel: string; minuten: number; beschreibung: string | null }) => (
    <div data-testid="vorlage-card">
      <span>{titel}</span>
      <span>{minuten} Min</span>
      {beschreibung && <span>{beschreibung}</span>}
    </div>
  ),
}));

// Mock CreateVorlageDialog
const mockCreateVorlageDialog = vi.fn();
vi.mock('../CreateVorlageDialog', () => ({
  CreateVorlageDialog: (props: { isOpen: boolean; onClose: () => void }) => {
    mockCreateVorlageDialog(props);
    return props.isOpen ? <div data-testid="create-vorlage-dialog">Create Dialog</div> : null;
  },
}));

describe('VorlageList', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    mockUseVorlagen.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
  });

  const renderList = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <VorlageList />
      </QueryClientProvider>,
    );
  };

  describe('Header', () => {
    it('sollte die Ueberschrift "Vorlagen" anzeigen', () => {
      // Given (Arrange) - Default State

      // When (Act)
      renderList();

      // Then (Assert)
      expect(screen.getByText('Vorlagen')).toBeInTheDocument();
    });

    it('sollte den "Neue Vorlage" Button anzeigen', () => {
      // Given (Arrange)

      // When (Act)
      renderList();

      // Then (Assert)
      expect(screen.getByRole('button', { name: /Neue Vorlage/ })).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('sollte den Loading-Spinner anzeigen waehrend isLoading=true', () => {
      // Given (Arrange) - Loading state
      mockUseVorlagen.mockReturnValue({
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
      mockUseVorlagen.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
      });

      // When (Act)
      renderList();

      // Then (Assert)
      expect(screen.getByText('Fehler beim Laden der Vorlagen')).toBeInTheDocument();
    });
  });

  describe('Leere Liste', () => {
    it('sollte eine leere Liste mit CTA anzeigen', () => {
      // Given (Arrange) - Leere Vorlagen-Liste
      mockUseVorlagen.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      // When (Act)
      renderList();

      // Then (Assert)
      expect(screen.getByText('Noch keine Vorlagen erstellt')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Erste Vorlage erstellen/ })).toBeInTheDocument();
    });

    it('sollte den Dialog oeffnen beim Klick auf "Erste Vorlage erstellen"', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockUseVorlagen.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });
      renderList();

      // When (Act)
      await user.click(screen.getByRole('button', { name: /Erste Vorlage erstellen/ }));

      // Then (Assert)
      expect(screen.getByTestId('create-vorlage-dialog')).toBeInTheDocument();
    });
  });

  describe('Vorlagen-Karten', () => {
    it('sollte Vorlagen-Karten rendern wenn Daten vorhanden sind', () => {
      // Given (Arrange) - Vorlagen mit Daten
      mockUseVorlagen.mockReturnValue({
        data: [
          { id: '1', titel: 'Lagebesprechung', minuten: 30, beschreibung: 'Alle 30 Minuten' },
          { id: '2', titel: 'Funkrunde', minuten: 60, beschreibung: null },
        ],
        isLoading: false,
        error: null,
      });

      // When (Act)
      renderList();

      // Then (Assert)
      const cards = screen.getAllByTestId('vorlage-card');
      expect(cards).toHaveLength(2);
      expect(screen.getByText('Lagebesprechung')).toBeInTheDocument();
      expect(screen.getByText('Funkrunde')).toBeInTheDocument();
    });

    it('sollte Beschreibung in Karten anzeigen wenn vorhanden', () => {
      // Given (Arrange)
      mockUseVorlagen.mockReturnValue({
        data: [{ id: '1', titel: 'Lagebesprechung', minuten: 30, beschreibung: 'Alle 30 Minuten' }],
        isLoading: false,
        error: null,
      });

      // When (Act)
      renderList();

      // Then (Assert)
      expect(screen.getByText('Alle 30 Minuten')).toBeInTheDocument();
    });
  });

  describe('Dialog Interaktion', () => {
    it('sollte den CreateVorlageDialog oeffnen beim Klick auf "Neue Vorlage"', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      mockUseVorlagen.mockReturnValue({
        data: [{ id: '1', titel: 'Test', minuten: 15, beschreibung: null }],
        isLoading: false,
        error: null,
      });
      renderList();

      // When (Act)
      await user.click(screen.getByRole('button', { name: /Neue Vorlage/ }));

      // Then (Assert) - Dialog sollte geoeffnet sein
      expect(screen.getByTestId('create-vorlage-dialog')).toBeInTheDocument();
    });
  });
});
