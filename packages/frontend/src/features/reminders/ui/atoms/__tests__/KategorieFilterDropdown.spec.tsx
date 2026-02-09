/**
 * Unit Tests fuer KategorieFilterDropdown Komponente
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 8.3 Task 2 + Task 6.1:**
 * - AC1: Filter-Dropdown mit allen Kategorien plus "Alle" und "Ohne Kategorie"
 * - AC3: Visuelles Feedback bei aktivem Filter (Primary-Farben)
 * - AC5: Kategorie-Chip in Optionen (Farb-Kreis)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KategorieFilterDropdown } from '../KategorieFilterDropdown';
import type { KategorieFilterType } from '@/features/reminders/stores';
import type { KategorieResponseDto } from '@bluelight-hub/shared/client';

describe('KategorieFilterDropdown', () => {
  const mockOnFilterChange = vi.fn();
  const defaultKategorien: KategorieResponseDto[] = [
    { id: 'kat-1', name: 'Leitstelle', farbe: '#FF5733', einsatzId: 'einsatz-1', createdAt: '2026-01-01' },
    { id: 'kat-2', name: 'Sanitaet', farbe: '#33FF57', einsatzId: 'einsatz-1', createdAt: '2026-01-01' },
    { id: 'kat-3', name: 'Feuerwehr', farbe: '#3357FF', einsatzId: 'einsatz-1', createdAt: '2026-01-01' },
  ];

  // Tagged Union Filter Types
  const filterAll: KategorieFilterType = { type: 'all' };
  const filterUntagged: KategorieFilterType = { type: 'untagged' };
  const filterKat1: KategorieFilterType = { type: 'kategorie', kategorieId: 'kat-1' };
  const filterUnknownKat: KategorieFilterType = { type: 'kategorie', kategorieId: 'unknown-kat-id' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering (AC1)', () => {
    it('should render dropdown button with "Alle Kategorien" label when filter is all', () => {
      // Given (Arrange)
      // When (Act)
      render(<KategorieFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} kategorien={defaultKategorien} />);

      // Then (Assert)
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Alle Kategorien')).toBeInTheDocument();
    });

    it('should display "Ohne Kategorie" when filter is untagged (AC4)', () => {
      // Given (Arrange)
      // When (Act)
      render(<KategorieFilterDropdown selectedFilter={filterUntagged} onFilterChange={mockOnFilterChange} kategorien={defaultKategorien} />);

      // Then (Assert)
      expect(screen.getByText('Ohne Kategorie')).toBeInTheDocument();
    });

    it('should display kategorie name when filter is kategorie (AC2)', () => {
      // Given (Arrange)
      // When (Act)
      render(<KategorieFilterDropdown selectedFilter={filterKat1} onFilterChange={mockOnFilterChange} kategorien={defaultKategorien} />);

      // Then (Assert)
      expect(screen.getByText('Leitstelle')).toBeInTheDocument();
    });
  });

  describe('dropdown options (AC1)', () => {
    it('should show all filter options when opened', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<KategorieFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} kategorien={defaultKategorien} />);

      // When (Act)
      await user.click(screen.getByRole('button'));

      // Then (Assert)
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      // Base options (AC1)
      expect(screen.getByRole('option', { name: /Alle Kategorien/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Ohne Kategorie/i })).toBeInTheDocument();
      // Kategorie options
      expect(screen.getByRole('option', { name: /Leitstelle/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Sanitaet/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Feuerwehr/i })).toBeInTheDocument();
    });

    it('should render empty kategorien list gracefully', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<KategorieFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} kategorien={[]} />);

      // When (Act)
      await user.click(screen.getByRole('button'));

      // Then (Assert)
      // Base options should still be there
      expect(screen.getByRole('option', { name: /Alle Kategorien/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Ohne Kategorie/i })).toBeInTheDocument();
    });
  });

  describe('kategorie farbe circle (AC5)', () => {
    it('should display color circle for each kategorie option', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<KategorieFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} kategorien={defaultKategorien} />);

      // When (Act)
      await user.click(screen.getByRole('button'));

      // Then (Assert)
      const leitstelleOption = screen.getByRole('option', { name: /Leitstelle/i });
      // Das span-Element mit backgroundColor sollte vorhanden sein
      const colorCircle = leitstelleOption.querySelector('[style*="background-color"]');
      expect(colorCircle).toBeInTheDocument();
      // Farbe sollte korrekt gesetzt sein
      expect(colorCircle).toHaveStyle({ backgroundColor: 'rgb(255, 87, 51)' });
    });
  });

  describe('filter selection', () => {
    it('should call onFilterChange with "untagged" when selecting "Ohne Kategorie" (AC4)', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<KategorieFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} kategorien={defaultKategorien} />);

      // When (Act)
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByRole('option', { name: /Ohne Kategorie/i }));

      // Then (Assert) - Tagged Union Type
      expect(mockOnFilterChange).toHaveBeenCalledWith({ type: 'untagged' });
    });

    it('should call onFilterChange with "all" when selecting "Alle Kategorien" (AC1)', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<KategorieFilterDropdown selectedFilter={filterUntagged} onFilterChange={mockOnFilterChange} kategorien={defaultKategorien} />);

      // When (Act)
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByRole('option', { name: /Alle Kategorien/i }));

      // Then (Assert) - Tagged Union Type
      expect(mockOnFilterChange).toHaveBeenCalledWith({ type: 'all' });
    });

    it('should call onFilterChange with kategorieId when selecting kategorie (AC2)', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<KategorieFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} kategorien={defaultKategorien} />);

      // When (Act)
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByRole('option', { name: /Leitstelle/i }));

      // Then (Assert) - Tagged Union Type with kategorieId
      expect(mockOnFilterChange).toHaveBeenCalledWith({ type: 'kategorie', kategorieId: 'kat-1' });
    });

    it('should call onFilterChange with different kategorieId on second selection', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<KategorieFilterDropdown selectedFilter={filterKat1} onFilterChange={mockOnFilterChange} kategorien={defaultKategorien} />);

      // When (Act)
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByRole('option', { name: /Sanitaet/i }));

      // Then (Assert)
      expect(mockOnFilterChange).toHaveBeenCalledWith({ type: 'kategorie', kategorieId: 'kat-2' });
    });
  });

  describe('visual feedback (AC3)', () => {
    it('should show active filter indicator when filter is not "all"', () => {
      // Given (Arrange)
      // When (Act)
      render(<KategorieFilterDropdown selectedFilter={filterKat1} onFilterChange={mockOnFilterChange} kategorien={defaultKategorien} />);

      // Then (Assert)
      const button = screen.getByRole('button');
      expect(button.className).toMatch(/bg-primary|text-primary/);
    });

    it('should show active filter indicator when filter is "untagged"', () => {
      // Given (Arrange)
      // When (Act)
      render(<KategorieFilterDropdown selectedFilter={filterUntagged} onFilterChange={mockOnFilterChange} kategorien={defaultKategorien} />);

      // Then (Assert)
      const button = screen.getByRole('button');
      expect(button.className).toMatch(/bg-primary|text-primary/);
    });

    it('should not show active filter indicator when filter is "all"', () => {
      // Given (Arrange)
      // When (Act)
      render(<KategorieFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} kategorien={defaultKategorien} />);

      // Then (Assert)
      const button = screen.getByRole('button');
      // Default state should not have primary background colors
      expect(button.className).not.toMatch(/bg-primary-[56]00/);
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      // Given (Arrange)
      // When (Act)
      render(<KategorieFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} kategorien={defaultKategorien} disabled />);

      // Then (Assert)
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should not open dropdown when disabled', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<KategorieFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} kategorien={defaultKategorien} disabled />);

      // When (Act)
      await user.click(screen.getByRole('button'));

      // Then (Assert)
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle unknown kategorieId filter gracefully', () => {
      // Given (Arrange)
      // When (Act)
      render(<KategorieFilterDropdown selectedFilter={filterUnknownKat} onFilterChange={mockOnFilterChange} kategorien={defaultKategorien} />);

      // Then (Assert) - Should show fallback text
      expect(screen.getByRole('button')).toBeInTheDocument();
      // Should display fallback "Kategorie"
      expect(screen.getByText('Kategorie')).toBeInTheDocument();
    });

    it('should handle many kategorien without performance issues', async () => {
      // Given (Arrange)
      const manyKategorien: KategorieResponseDto[] = Array.from({ length: 30 }, (_, i) => ({
        id: `kat-${i}`,
        name: `Kategorie ${i}`,
        farbe: `#${i.toString().padStart(6, '0')}`,
        einsatzId: 'einsatz-1',
        createdAt: '2026-01-01',
      }));
      const user = userEvent.setup();

      // When (Act)
      render(<KategorieFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} kategorien={manyKategorien} />);
      await user.click(screen.getByRole('button'));

      // Then (Assert)
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      // Should have scrollable list (2 base options + 30 kategorien)
      expect(screen.getAllByRole('option').length).toBe(32);
    });

    it('should accept custom className', () => {
      // Given (Arrange)
      // When (Act)
      render(<KategorieFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} kategorien={defaultKategorien} className="custom-class" />);

      // Then (Assert)
      // Der Container div sollte die custom class haben
      const container = screen.getByRole('button').parentElement;
      expect(container?.className).toContain('custom-class');
    });
  });

  describe('accessibility', () => {
    it('should have proper listbox role', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<KategorieFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} kategorien={defaultKategorien} />);

      // When (Act)
      await user.click(screen.getByRole('button'));

      // Then (Assert)
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should have option roles for all items', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<KategorieFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} kategorien={defaultKategorien} />);

      // When (Act)
      await user.click(screen.getByRole('button'));

      // Then (Assert) - 2 base options + 3 kategorien
      expect(screen.getAllByRole('option')).toHaveLength(5);
    });
  });
});
