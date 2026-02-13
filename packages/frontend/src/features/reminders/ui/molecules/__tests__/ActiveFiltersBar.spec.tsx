/**
 * Unit Tests fuer ActiveFiltersBar Component
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 8.3/8.4:** ActiveFiltersBar zeigt aktive Filter als Chips
 * - Team-Filter: Meine, Unzugewiesen, User-Name
 * - Kategorie-Filter: Kategorie-Name oder "Ohne Kategorie"
 * - Status-Filter: Status-Label
 * - "Alle loeschen" Button bei 2+ aktiven Filtern
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActiveFiltersBar } from '../ActiveFiltersBar';
import type { TeamFilterType, KategorieFilterType, StatusFilterType, Teilnehmer, ErinnerungStatus } from '../../stores';
import type { KategorieResponseDto } from '@bluelight-hub/shared/client';

// Mock-Daten
const mockTeilnehmer: Teilnehmer[] = [
  { id: 'user-1', name: 'Max Mustermann' },
  { id: 'user-2', name: 'Erika Musterfrau' },
];

const mockKategorien: KategorieResponseDto[] = [
  { id: 'kat-1', name: 'Leitstelle', farbe: '#FF5733', einsatzId: 'e1', createdAt: '', updatedAt: '' },
  { id: 'kat-2', name: 'Fahrzeuge', farbe: '#33FF57', einsatzId: 'e1', createdAt: '', updatedAt: '' },
];

describe('ActiveFiltersBar', () => {
  describe('rendering', () => {
    it('should not render when no filters are active', () => {
      // Given (Arrange) - Alle Filter auf 'all'
      // When (Act)
      const { container } = render(
        <ActiveFiltersBar
          teamFilter={{ type: 'all' }}
          kategorieFilter={{ type: 'all' }}
          statusFilter={{ type: 'all' }}
          onClearTeamFilter={vi.fn()}
          onClearKategorieFilter={vi.fn()}
          onClearStatusFilter={vi.fn()}
          onClearAll={vi.fn()}
        />,
      );

      // Then (Assert)
      expect(container.firstChild).toBeNull();
    });

    it('should render team filter chip when mine filter is active', () => {
      // Given (Arrange) - Team-Filter auf 'mine'
      // When (Act)
      render(
        <ActiveFiltersBar
          teamFilter={{ type: 'mine' }}
          kategorieFilter={{ type: 'all' }}
          statusFilter={{ type: 'all' }}
          onClearTeamFilter={vi.fn()}
          onClearKategorieFilter={vi.fn()}
          onClearStatusFilter={vi.fn()}
        />,
      );

      // Then (Assert)
      expect(screen.getByText('Meine')).toBeInTheDocument();
    });

    it('should render team filter chip with user name when user filter is active', () => {
      // Given (Arrange) - Team-Filter auf User mit ID 'user-1'
      // When (Act)
      render(
        <ActiveFiltersBar
          teamFilter={{ type: 'user', userId: 'user-1' }}
          teilnehmer={mockTeilnehmer}
          kategorieFilter={{ type: 'all' }}
          statusFilter={{ type: 'all' }}
          onClearTeamFilter={vi.fn()}
          onClearKategorieFilter={vi.fn()}
          onClearStatusFilter={vi.fn()}
        />,
      );

      // Then (Assert)
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    });

    it('should render "Unzugewiesen" for unassigned team filter', () => {
      // Given (Arrange) - Team-Filter auf 'unassigned'
      // When (Act)
      render(
        <ActiveFiltersBar
          teamFilter={{ type: 'unassigned' }}
          kategorieFilter={{ type: 'all' }}
          statusFilter={{ type: 'all' }}
          onClearTeamFilter={vi.fn()}
          onClearKategorieFilter={vi.fn()}
          onClearStatusFilter={vi.fn()}
        />,
      );

      // Then (Assert)
      expect(screen.getByText('Unzugewiesen')).toBeInTheDocument();
    });

    it('should render kategorie filter chip with kategorie name', () => {
      // Given (Arrange) - Kategorie-Filter auf 'kat-1'
      // When (Act)
      render(
        <ActiveFiltersBar
          teamFilter={{ type: 'all' }}
          kategorieFilter={{ type: 'kategorie', kategorieId: 'kat-1' }}
          kategorien={mockKategorien}
          statusFilter={{ type: 'all' }}
          onClearTeamFilter={vi.fn()}
          onClearKategorieFilter={vi.fn()}
          onClearStatusFilter={vi.fn()}
        />,
      );

      // Then (Assert)
      expect(screen.getByText('Leitstelle')).toBeInTheDocument();
    });

    it('should render "Ohne Kategorie" for untagged filter', () => {
      // Given (Arrange) - Kategorie-Filter auf 'untagged'
      // When (Act)
      render(
        <ActiveFiltersBar
          teamFilter={{ type: 'all' }}
          kategorieFilter={{ type: 'untagged' }}
          statusFilter={{ type: 'all' }}
          onClearTeamFilter={vi.fn()}
          onClearKategorieFilter={vi.fn()}
          onClearStatusFilter={vi.fn()}
        />,
      );

      // Then (Assert)
      expect(screen.getByText('Ohne Kategorie')).toBeInTheDocument();
    });

    it('should render status filter chip with correct label', () => {
      // Given (Arrange) - Status-Filter auf 'AUSGELOEST'
      // When (Act)
      render(
        <ActiveFiltersBar
          teamFilter={{ type: 'all' }}
          kategorieFilter={{ type: 'all' }}
          statusFilter={{ type: 'status', status: 'AUSGELOEST' }}
          onClearTeamFilter={vi.fn()}
          onClearKategorieFilter={vi.fn()}
          onClearStatusFilter={vi.fn()}
        />,
      );

      // Then (Assert)
      expect(screen.getByText('Ausgelöst')).toBeInTheDocument();
    });

    it('should render multiple chips for multiple active filters', () => {
      // Given (Arrange) - Mehrere Filter aktiv
      // When (Act)
      render(
        <ActiveFiltersBar
          teamFilter={{ type: 'mine' }}
          kategorieFilter={{ type: 'kategorie', kategorieId: 'kat-1' }}
          kategorien={mockKategorien}
          statusFilter={{ type: 'status', status: 'GEPLANT' }}
          onClearTeamFilter={vi.fn()}
          onClearKategorieFilter={vi.fn()}
          onClearStatusFilter={vi.fn()}
          onClearAll={vi.fn()}
        />,
      );

      // Then (Assert)
      expect(screen.getByText('Meine')).toBeInTheDocument();
      expect(screen.getByText('Leitstelle')).toBeInTheDocument();
      expect(screen.getByText('Geplant')).toBeInTheDocument();
    });
  });

  describe('clear all button', () => {
    it('should NOT show clear all button with only 1 active filter', () => {
      // Given (Arrange) - Nur ein Filter aktiv
      // When (Act)
      render(
        <ActiveFiltersBar
          teamFilter={{ type: 'mine' }}
          kategorieFilter={{ type: 'all' }}
          statusFilter={{ type: 'all' }}
          onClearTeamFilter={vi.fn()}
          onClearKategorieFilter={vi.fn()}
          onClearStatusFilter={vi.fn()}
          onClearAll={vi.fn()}
        />,
      );

      // Then (Assert)
      expect(screen.queryByText('Alle löschen')).not.toBeInTheDocument();
    });

    it('should show clear all button with 2 or more active filters', () => {
      // Given (Arrange) - Zwei Filter aktiv
      // When (Act)
      render(
        <ActiveFiltersBar
          teamFilter={{ type: 'mine' }}
          kategorieFilter={{ type: 'kategorie', kategorieId: 'kat-1' }}
          kategorien={mockKategorien}
          statusFilter={{ type: 'all' }}
          onClearTeamFilter={vi.fn()}
          onClearKategorieFilter={vi.fn()}
          onClearStatusFilter={vi.fn()}
          onClearAll={vi.fn()}
        />,
      );

      // Then (Assert)
      expect(screen.getByText('Alle löschen')).toBeInTheDocument();
    });

    it('should call onClearAll when clicked', () => {
      // Given (Arrange)
      const handleClearAll = vi.fn();
      render(
        <ActiveFiltersBar
          teamFilter={{ type: 'mine' }}
          kategorieFilter={{ type: 'kategorie', kategorieId: 'kat-1' }}
          kategorien={mockKategorien}
          statusFilter={{ type: 'all' }}
          onClearTeamFilter={vi.fn()}
          onClearKategorieFilter={vi.fn()}
          onClearStatusFilter={vi.fn()}
          onClearAll={handleClearAll}
        />,
      );

      // When (Act)
      fireEvent.click(screen.getByText('Alle löschen'));

      // Then (Assert)
      expect(handleClearAll).toHaveBeenCalledTimes(1);
    });

    it('should work correctly with all three filters active', () => {
      // Given (Arrange) - Alle 3 Filter aktiv
      const handleClearAll = vi.fn();
      render(
        <ActiveFiltersBar
          teamFilter={{ type: 'mine' }}
          kategorieFilter={{ type: 'kategorie', kategorieId: 'kat-1' }}
          kategorien={mockKategorien}
          statusFilter={{ type: 'status', status: 'AUSGELOEST' }}
          onClearTeamFilter={vi.fn()}
          onClearKategorieFilter={vi.fn()}
          onClearStatusFilter={vi.fn()}
          onClearAll={handleClearAll}
        />,
      );

      // Then (Assert) - Alle 3 Chips + Clear All sichtbar
      expect(screen.getByText('Meine')).toBeInTheDocument();
      expect(screen.getByText(mockKategorien[0].name)).toBeInTheDocument();
      expect(screen.getByText('Ausgelöst')).toBeInTheDocument();
      expect(screen.getByText('Alle löschen')).toBeInTheDocument();

      // When (Act) - Clear All klicken
      fireEvent.click(screen.getByText('Alle löschen'));

      // Then (Assert)
      expect(handleClearAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear individual filters', () => {
    it('should call onClearTeamFilter when team chip is removed', () => {
      // Given (Arrange)
      const handleClearTeam = vi.fn();
      render(
        <ActiveFiltersBar
          teamFilter={{ type: 'mine' }}
          kategorieFilter={{ type: 'all' }}
          statusFilter={{ type: 'all' }}
          onClearTeamFilter={handleClearTeam}
          onClearKategorieFilter={vi.fn()}
          onClearStatusFilter={vi.fn()}
        />,
      );

      // When (Act) - Finde den Remove-Button im Chip via aria-label
      const removeButton = screen.getByRole('button', { name: /filter.*entfernen/i });
      fireEvent.click(removeButton);

      // Then (Assert)
      expect(handleClearTeam).toHaveBeenCalledTimes(1);
    });

    it('should call onClearKategorieFilter when kategorie chip is removed', () => {
      // Given (Arrange)
      const handleClearKategorie = vi.fn();
      render(
        <ActiveFiltersBar
          teamFilter={{ type: 'all' }}
          kategorieFilter={{ type: 'kategorie', kategorieId: 'kat-1' }}
          kategorien={mockKategorien}
          statusFilter={{ type: 'all' }}
          onClearTeamFilter={vi.fn()}
          onClearKategorieFilter={handleClearKategorie}
          onClearStatusFilter={vi.fn()}
        />,
      );

      // When (Act)
      const removeButton = screen.getByRole('button', { name: /filter.*entfernen/i });
      fireEvent.click(removeButton);

      // Then (Assert)
      expect(handleClearKategorie).toHaveBeenCalledTimes(1);
    });

    it('should call onClearStatusFilter when status chip is removed', () => {
      // Given (Arrange)
      const handleClearStatus = vi.fn();
      render(
        <ActiveFiltersBar
          teamFilter={{ type: 'all' }}
          kategorieFilter={{ type: 'all' }}
          statusFilter={{ type: 'status', status: 'AUSGELOEST' }}
          onClearTeamFilter={vi.fn()}
          onClearKategorieFilter={vi.fn()}
          onClearStatusFilter={handleClearStatus}
        />,
      );

      // When (Act)
      const removeButton = screen.getByRole('button', { name: /filter.*entfernen/i });
      fireEvent.click(removeButton);

      // Then (Assert)
      expect(handleClearStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('status labels', () => {
    const statusCases: Array<{ status: ErinnerungStatus; label: string }> = [
      { status: 'GEPLANT', label: 'Geplant' },
      { status: 'AUSGELOEST', label: 'Ausgelöst' },
      { status: 'ACKNOWLEDGED', label: 'Bestätigt' },
      { status: 'SNOOZED', label: 'Verschoben' },
      { status: 'ESKALIERT', label: 'Eskaliert' },
      { status: 'ERLEDIGT', label: 'Erledigt' },
    ];

    it.each(statusCases)('should show "$label" for status $status', ({ status, label }) => {
      // Given (Arrange) - Status-Filter mit entsprechendem Status
      // When (Act)
      render(
        <ActiveFiltersBar
          teamFilter={{ type: 'all' }}
          kategorieFilter={{ type: 'all' }}
          statusFilter={{ type: 'status', status }}
          onClearTeamFilter={vi.fn()}
          onClearKategorieFilter={vi.fn()}
          onClearStatusFilter={vi.fn()}
        />,
      );

      // Then (Assert)
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});
