/**
 * Unit Tests fuer KategorieSelector Component
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 8.2:** Kategorie fuer Notiz/Erinnerung auswaehlen
 * - AC1: Alle Kategorien des Einsatzes als Auswahl
 * - AC2: Jede Kategorie wird mit Name angezeigt
 * - AC3: Optionale Kategorie-Auswahl
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { KategorieSelector } from '../KategorieSelector';

// Mock nur den Hook - nicht das ganze Modul
const mockUseKategorienByEinsatz = vi.fn();

vi.mock('@/features/kategorien/api', () => ({
  useKategorienByEinsatz: (einsatzId: string) => mockUseKategorienByEinsatz(einsatzId),
  KATEGORIE_QUERY_KEYS: {
    all: ['kategorien'] as const,
    lists: () => ['kategorien', 'list'] as const,
    list: (einsatzId: string) => ['kategorien', 'list', einsatzId] as const,
  },
}));

const mockKategorien = [
  { id: 'kat-1', name: 'Lage', farbe: '#ff0000' },
  { id: 'kat-2', name: 'Fuehrung', farbe: '#00ff00' },
  { id: 'kat-3', name: 'Einsatzmittel', farbe: '#0000ff' },
];

describe('KategorieSelector', () => {
  const mockOnChange = vi.fn();
  const mockOnBlur = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: Kategorien geladen
    mockUseKategorienByEinsatz.mockReturnValue({
      data: mockKategorien,
      isLoading: false,
      isError: false,
    });
  });

  const renderSelector = (overrides?: Partial<React.ComponentProps<typeof KategorieSelector>>) => {
    return renderWithProviders(<KategorieSelector einsatzId="test-einsatz-123" onChange={mockOnChange} onBlur={mockOnBlur} {...overrides} />);
  };

  describe('Loading State', () => {
    it('sollte Loading-Skeleton anzeigen waehrend Kategorien laden', () => {
      // Given (Arrange)
      mockUseKategorienByEinsatz.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      // When (Act)
      renderSelector();

      // Then (Assert)
      const loadingElement = document.querySelector('.animate-pulse');
      expect(loadingElement).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('sollte Fehlermeldung anzeigen bei API-Fehler', () => {
      // Given (Arrange)
      mockUseKategorienByEinsatz.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });

      // When (Act)
      renderSelector();

      // Then (Assert)
      expect(screen.getByText('Kategorien konnten nicht geladen werden')).toBeInTheDocument();
    });
  });

  describe('Rendering mit Kategorien (Story 8.2 AC1, AC2)', () => {
    it('sollte Combobox rendern', () => {
      // Given (Arrange) - Kategorien geladen (default mock)

      // When (Act)
      renderSelector();

      // Then (Assert)
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('sollte Kategorien als Optionen anzeigen nach Klick', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderSelector();

      // When (Act) - Combobox oeffnen
      await user.click(screen.getByRole('combobox'));

      // Then (Assert) - Alle Kategorien sichtbar
      await waitFor(() => {
        expect(screen.getByText('Lage')).toBeInTheDocument();
        expect(screen.getByText('Fuehrung')).toBeInTheDocument();
        expect(screen.getByText('Einsatzmittel')).toBeInTheDocument();
      });
    });

    it('sollte Platzhalter-Text anzeigen', () => {
      // Given (Arrange) - Kategorien geladen

      // When (Act)
      renderSelector({ placeholder: 'Bitte waehlen' });

      // Then (Assert)
      expect(screen.getByPlaceholderText('Bitte waehlen')).toBeInTheDocument();
    });
  });

  describe('Kategorie Auswahl (Story 8.2 AC3)', () => {
    it('sollte onChange mit kategorieId aufrufen bei Auswahl', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      renderSelector();

      // When (Act) - Kategorie auswaehlen
      await user.click(screen.getByRole('combobox'));
      await waitFor(() => {
        expect(screen.getByText('Lage')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Lage'));

      // Then (Assert)
      expect(mockOnChange).toHaveBeenCalledWith('kat-1');
    });

    it('sollte null akzeptieren als initialer Wert (keine Kategorie)', () => {
      // Given (Arrange) - Keine Kategorie ausgewaehlt
      renderSelector({ value: null });

      // When (Act) - nichts, Initial-State pruefen
      const combobox = screen.getByRole('combobox');

      // Then (Assert) - Combobox hat keinen Wert
      expect(combobox).toHaveValue('');
    });
  });

  describe('Leere Kategorien-Liste', () => {
    beforeEach(() => {
      mockUseKategorienByEinsatz.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      });
    });

    it('sollte Hinweis anzeigen wenn keine Kategorien vorhanden', () => {
      // Given (Arrange) - Leere Kategorien-Liste

      // When (Act)
      renderSelector();

      // Then (Assert)
      expect(screen.getByText('Keine Kategorien in diesem Einsatz')).toBeInTheDocument();
    });

    it('sollte Combobox deaktivieren wenn keine Kategorien', () => {
      // Given (Arrange) - Leere Kategorien-Liste

      // When (Act)
      renderSelector();

      // Then (Assert)
      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });

  describe('Disabled State', () => {
    it('sollte Combobox deaktivieren wenn disabled=true', () => {
      // Given (Arrange)

      // When (Act)
      renderSelector({ disabled: true });

      // Then (Assert)
      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });

  describe('Error Prop', () => {
    it('sollte error prop an Combobox weiterleiten', () => {
      // Given (Arrange)
      const errorMessage = 'Kategorie ist erforderlich';

      // When (Act)
      renderSelector({ error: errorMessage });

      // Then (Assert)
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});
