/**
 * Unit Tests fuer StatusFilterDropdown Komponente
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 8.4 Task 5.2:**
 * - AC1: Filter-Dropdown mit allen Status plus "Alle Status"
 * - AC3: Visuelles Feedback bei aktivem Filter (Primary-Farben)
 * - AC5: Status-Icons mit Farb-Klassen
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusFilterDropdown } from '../StatusFilterDropdown';
import type { StatusFilterType } from '@/features/reminders/stores';

describe('StatusFilterDropdown', () => {
  const mockOnFilterChange = vi.fn();

  // Tagged Union Filter Types
  const filterAll: StatusFilterType = { type: 'all' };
  const filterGeplant: StatusFilterType = { type: 'status', status: 'GEPLANT' };
  const filterAusgeloest: StatusFilterType = { type: 'status', status: 'AUSGELOEST' };
  const filterAcknowledged: StatusFilterType = { type: 'status', status: 'ACKNOWLEDGED' };
  const filterSnoozed: StatusFilterType = { type: 'status', status: 'SNOOZED' };
  const filterEskaliert: StatusFilterType = { type: 'status', status: 'ESKALIERT' };
  const filterErledigt: StatusFilterType = { type: 'status', status: 'ERLEDIGT' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with default "Alle Status" label', () => {
      // Given (Arrange)
      // When (Act)
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} />);

      // Then (Assert)
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Alle Status')).toBeInTheDocument();
    });

    it('should render PiFunnel icon', () => {
      // Given (Arrange)
      // When (Act)
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} />);

      // Then (Assert)
      const button = screen.getByRole('button');
      // Funnel icon sollte vorhanden sein (als svg)
      const icons = button.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render all 7 status options when opened', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} />);

      // When (Act)
      await user.click(screen.getByRole('button'));

      // Then (Assert)
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      // 7 Optionen: Alle Status + 6 Status-Werte
      expect(screen.getByRole('option', { name: /Alle Status/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Geplant/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Ausgelöst/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Bestätigt/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Verschoben/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Eskaliert/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Erledigt/i })).toBeInTheDocument();
      expect(screen.getAllByRole('option')).toHaveLength(7);
    });
  });

  describe('selection', () => {
    it('should call onFilterChange with status filter when selecting GEPLANT', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} />);

      // When (Act)
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByRole('option', { name: /Geplant/i }));

      // Then (Assert) - Tagged Union Type mit status
      expect(mockOnFilterChange).toHaveBeenCalledWith({ type: 'status', status: 'GEPLANT' });
    });

    it('should call onFilterChange with all filter when selecting "Alle Status"', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterGeplant} onFilterChange={mockOnFilterChange} />);

      // When (Act)
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByRole('option', { name: /Alle Status/i }));

      // Then (Assert) - Tagged Union Type
      expect(mockOnFilterChange).toHaveBeenCalledWith({ type: 'all' });
    });

    it('should update label on selection', () => {
      // Given (Arrange) - Filter ist auf GEPLANT gesetzt
      // When (Act)
      render(<StatusFilterDropdown selectedFilter={filterGeplant} onFilterChange={mockOnFilterChange} />);

      // Then (Assert) - Label sollte "Geplant" anzeigen
      expect(screen.getByText('Geplant')).toBeInTheDocument();
    });

    it('should call onFilterChange with different status on second selection', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterGeplant} onFilterChange={mockOnFilterChange} />);

      // When (Act)
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByRole('option', { name: /Ausgelöst/i }));

      // Then (Assert)
      expect(mockOnFilterChange).toHaveBeenCalledWith({ type: 'status', status: 'AUSGELOEST' });
    });

    it('should call onFilterChange with ACKNOWLEDGED when selecting "Bestätigt"', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} />);

      // When (Act)
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByRole('option', { name: /Bestätigt/i }));

      // Then (Assert)
      expect(mockOnFilterChange).toHaveBeenCalledWith({ type: 'status', status: 'ACKNOWLEDGED' });
    });

    it('should call onFilterChange with SNOOZED when selecting "Verschoben"', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} />);

      // When (Act)
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByRole('option', { name: /Verschoben/i }));

      // Then (Assert)
      expect(mockOnFilterChange).toHaveBeenCalledWith({ type: 'status', status: 'SNOOZED' });
    });

    it('should call onFilterChange with ESKALIERT when selecting "Eskaliert"', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} />);

      // When (Act)
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByRole('option', { name: /Eskaliert/i }));

      // Then (Assert)
      expect(mockOnFilterChange).toHaveBeenCalledWith({ type: 'status', status: 'ESKALIERT' });
    });

    it('should call onFilterChange with ERLEDIGT when selecting "Erledigt"', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} />);

      // When (Act)
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByRole('option', { name: /Erledigt/i }));

      // Then (Assert)
      expect(mockOnFilterChange).toHaveBeenCalledWith({ type: 'status', status: 'ERLEDIGT' });
    });
  });

  describe('active state styling (AC3)', () => {
    it('should show primary colors when filter is active (status filter)', () => {
      // Given (Arrange)
      // When (Act)
      render(<StatusFilterDropdown selectedFilter={filterGeplant} onFilterChange={mockOnFilterChange} />);

      // Then (Assert)
      const button = screen.getByRole('button');
      expect(button.className).toMatch(/bg-primary|text-primary/);
    });

    it('should show primary colors for all status filters', () => {
      // Given (Arrange)
      const statusFilters = [filterAusgeloest, filterAcknowledged, filterSnoozed, filterEskaliert, filterErledigt];

      for (const filter of statusFilters) {
        // When (Act)
        const { unmount } = render(<StatusFilterDropdown selectedFilter={filter} onFilterChange={mockOnFilterChange} />);

        // Then (Assert)
        const button = screen.getByRole('button');
        expect(button.className).toMatch(/bg-primary|text-primary/);
        unmount();
      }
    });

    it('should show default colors when filter is inactive (all filter)', () => {
      // Given (Arrange)
      // When (Act)
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} />);

      // Then (Assert)
      const button = screen.getByRole('button');
      // Default state should not have primary background colors
      expect(button.className).not.toMatch(/bg-primary-[56]00/);
    });
  });

  describe('status icons and colors (AC5)', () => {
    it('should render correct icon for each status option', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} />);

      // When (Act)
      await user.click(screen.getByRole('button'));

      // Then (Assert) - Jede Option sollte ein Icon (svg) haben
      const options = screen.getAllByRole('option');
      for (const option of options) {
        const icon = option.querySelector('svg');
        expect(icon).toBeInTheDocument();
      }
    });

    it('should render correct color class for GEPLANT option', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} />);

      // When (Act)
      await user.click(screen.getByRole('button'));

      // Then (Assert)
      const geplantOption = screen.getByRole('option', { name: /Geplant/i });
      const icon = geplantOption.querySelector('svg');
      // SVG className ist ein SVGAnimatedString, daher getAttribute nutzen
      expect(icon?.getAttribute('class')).toMatch(/text-status-success/);
    });

    it('should render correct color class for AUSGELOEST option', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} />);

      // When (Act)
      await user.click(screen.getByRole('button'));

      // Then (Assert)
      const ausgeloestOption = screen.getByRole('option', { name: /Ausgelöst/i });
      const icon = ausgeloestOption.querySelector('svg');
      // SVG className ist ein SVGAnimatedString, daher getAttribute nutzen
      expect(icon?.getAttribute('class')).toMatch(/text-status-danger/);
    });

    it('should render correct color class for ACKNOWLEDGED option', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} />);

      // When (Act)
      await user.click(screen.getByRole('button'));

      // Then (Assert)
      const acknowledgedOption = screen.getByRole('option', { name: /Bestätigt/i });
      const icon = acknowledgedOption.querySelector('svg');
      // SVG className ist ein SVGAnimatedString, daher getAttribute nutzen
      expect(icon?.getAttribute('class')).toMatch(/text-status-info/);
    });

    it('should render correct color class for SNOOZED option', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} />);

      // When (Act)
      await user.click(screen.getByRole('button'));

      // Then (Assert)
      const snoozedOption = screen.getByRole('option', { name: /Verschoben/i });
      const icon = snoozedOption.querySelector('svg');
      // SVG className ist ein SVGAnimatedString, daher getAttribute nutzen
      expect(icon?.getAttribute('class')).toMatch(/text-status-warning/);
    });

    it('should render correct color class for ESKALIERT option', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} />);

      // When (Act)
      await user.click(screen.getByRole('button'));

      // Then (Assert)
      const eskaliertOption = screen.getByRole('option', { name: /Eskaliert/i });
      const icon = eskaliertOption.querySelector('svg');
      // SVG className ist ein SVGAnimatedString, daher getAttribute nutzen
      expect(icon?.getAttribute('class')).toMatch(/text-action-primary/);
    });

    it('should render correct color class for ERLEDIGT option', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} />);

      // When (Act)
      await user.click(screen.getByRole('button'));

      // Then (Assert)
      const erledigtOption = screen.getByRole('option', { name: /Erledigt/i });
      const icon = erledigtOption.querySelector('svg');
      // SVG className ist ein SVGAnimatedString, daher getAttribute nutzen
      expect(icon?.getAttribute('class')).toMatch(/text-text-muted/);
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      // Given (Arrange)
      // When (Act)
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} disabled />);

      // Then (Assert)
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should not open dropdown when disabled', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} disabled />);

      // When (Act)
      await user.click(screen.getByRole('button'));

      // Then (Assert)
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('should have opacity styling when disabled', () => {
      // Given (Arrange)
      // When (Act)
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} disabled />);

      // Then (Assert)
      const button = screen.getByRole('button');
      expect(button.className).toMatch(/opacity-50/);
    });
  });

  describe('accessibility', () => {
    it('should have listbox role', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} />);

      // When (Act)
      await user.click(screen.getByRole('button'));

      // Then (Assert)
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should have option role for each option', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} />);

      // When (Act)
      await user.click(screen.getByRole('button'));

      // Then (Assert) - 7 Optionen
      expect(screen.getAllByRole('option')).toHaveLength(7);
    });

    it('should show checkmark for selected option', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterGeplant} onFilterChange={mockOnFilterChange} />);

      // When (Act)
      await user.click(screen.getByRole('button'));

      // Then (Assert) - Die Geplant-Option sollte als selected markiert sein
      const geplantOption = screen.getByRole('option', { name: /Geplant/i });
      // Das selected-Element hat einen Checkmark (PiCheck)
      const checkIcon = geplantOption.querySelectorAll('svg');
      // Mindestens 2 Icons: Status-Icon + Check-Icon
      expect(checkIcon.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('edge cases', () => {
    it('should accept custom className', () => {
      // Given (Arrange)
      // When (Act)
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} className="custom-class" />);

      // Then (Assert)
      const container = screen.getByRole('button').parentElement;
      expect(container?.className).toContain('custom-class');
    });

    it('should display correct label for each status', () => {
      // Given (Arrange)
      const statusLabels = [
        { filter: filterGeplant, label: 'Geplant' },
        { filter: filterAusgeloest, label: 'Ausgelöst' },
        { filter: filterAcknowledged, label: 'Bestätigt' },
        { filter: filterSnoozed, label: 'Verschoben' },
        { filter: filterEskaliert, label: 'Eskaliert' },
        { filter: filterErledigt, label: 'Erledigt' },
      ];

      for (const { filter, label } of statusLabels) {
        // When (Act)
        const { unmount } = render(<StatusFilterDropdown selectedFilter={filter} onFilterChange={mockOnFilterChange} />);

        // Then (Assert)
        expect(screen.getByText(label)).toBeInTheDocument();
        unmount();
      }
    });

    it('should handle rapid filter changes', async () => {
      // Given (Arrange)
      const user = userEvent.setup();
      render(<StatusFilterDropdown selectedFilter={filterAll} onFilterChange={mockOnFilterChange} />);

      // When (Act) - Schnelle Wechsel
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByRole('option', { name: /Geplant/i }));

      // Then (Assert)
      expect(mockOnFilterChange).toHaveBeenCalledWith({ type: 'status', status: 'GEPLANT' });
    });
  });
});
