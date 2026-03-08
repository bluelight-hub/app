/**
 * Unit Tests fuer FuehrungsrhythmusStatistik Komponente
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 9.8 Tasks 6+8:**
 * - Korrekte Darstellung der Summary Cards (AC1)
 * - Detail-Tabelle pro Erinnerungstyp (AC1)
 * - Loading State mit Skeleton (AC3)
 * - Empty State bei keinem Fuehrungsrhythmus (AC2)
 * - Error State (AC4)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FuehrungsrhythmusStatistik } from '@/features/reminders';

// Mock useFuehrungsrhythmusStatistik hook
const mockUseFuehrungsrhythmusStatistik = vi.fn();
vi.mock('../../../api/queries', () => ({
  useFuehrungsrhythmusStatistik: (...args: unknown[]) => mockUseFuehrungsrhythmusStatistik(...args),
}));

const mockData = {
  activations: [
    {
      activationTimestamp: '2026-02-08T14:00:00.000Z',
      reminderCount: 3,
      totalCycles: 12,
      completedParents: 2,
      completionRate: 0.667,
      escalatedCount: 1,
      reminderTypeStats: [
        {
          reminderType: 'Lagebesprechung',
          totalOccurrences: 2,
          snoozeCount: 3,
          snoozeRate: 0.5,
          escalationCount: 1,
          escalationRate: 0.5,
        },
        {
          reminderType: 'Wasserversorgung',
          totalOccurrences: 1,
          snoozeCount: 0,
          snoozeRate: 0,
          escalationCount: 0,
          escalationRate: 0,
        },
      ],
    },
  ],
  totalActivations: 1,
  totalCycles: 12,
  avgCompletionRate: 0.667,
  totalEscalations: 1,
  overallSnoozeRate: 0.333,
};

describe('FuehrungsrhythmusStatistik', () => {
  beforeEach(() => {
    mockUseFuehrungsrhythmusStatistik.mockReset();
  });

  // --- AC1: Summary Cards ---

  it('should render summary cards with correct values (AC1)', () => {
    // Given
    mockUseFuehrungsrhythmusStatistik.mockReturnValue({ data: mockData, isLoading: false, isError: false });

    // When
    render(<FuehrungsrhythmusStatistik einsatzId="einsatz-1" />);

    // Then - Card Titles vorhanden
    expect(screen.getByText('Aktivierungen')).toBeInTheDocument();
    expect(screen.getByText('Gesamt-Zyklen')).toBeInTheDocument();
    expect(screen.getByText('Abschlussrate')).toBeInTheDocument();
    expect(screen.getByText('Eskalationen')).toBeInTheDocument();
    // Card Values: Verify values appear within their correct card context
    const zyklenCard = screen.getByText('Gesamt-Zyklen').closest('div')?.parentElement!;
    expect(within(zyklenCard).getByText('12')).toBeInTheDocument();

    const abschlussCard = screen.getByText('Abschlussrate').closest('div')?.parentElement!;
    expect(within(abschlussCard).getByText('66.7%')).toBeInTheDocument();
  });

  // --- AC1: Detail-Tabelle ---

  it('should show detail table per reminder type (AC1)', () => {
    // Given
    mockUseFuehrungsrhythmusStatistik.mockReturnValue({ data: mockData, isLoading: false, isError: false });

    // When
    render(<FuehrungsrhythmusStatistik einsatzId="einsatz-1" />);

    // Then - Headers
    expect(screen.getByText('Erinnerungstyp')).toBeInTheDocument();
    expect(screen.getByText('Vorkommen')).toBeInTheDocument();
    expect(screen.getByText('Snooze-Rate')).toBeInTheDocument();
    expect(screen.getByText('Eskalationsrate')).toBeInTheDocument();

    // Then - Data
    expect(screen.getByText('Lagebesprechung')).toBeInTheDocument();
    expect(screen.getByText('Wasserversorgung')).toBeInTheDocument();
    // 50.0% erscheint 2x (Snooze-Rate + Eskalationsrate Lagebesprechung)
    expect(screen.getAllByText('50.0%')).toHaveLength(2);
    // 0.0% erscheint 2x (Snooze-Rate + Eskalationsrate Wasserversorgung)
    expect(screen.getAllByText('0.0%')).toHaveLength(2);
  });

  // --- AC3: Loading State ---

  it('should show skeleton loading state (AC3)', () => {
    // Given
    mockUseFuehrungsrhythmusStatistik.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    // When
    render(<FuehrungsrhythmusStatistik einsatzId="einsatz-1" />);

    // Then
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  // --- AC2: Empty State ---

  it('should show empty state when no activations (AC2)', () => {
    // Given
    const emptyData = { ...mockData, totalActivations: 0, activations: [] };
    mockUseFuehrungsrhythmusStatistik.mockReturnValue({ data: emptyData, isLoading: false, isError: false });

    // When
    render(<FuehrungsrhythmusStatistik einsatzId="einsatz-1" />);

    // Then
    expect(screen.getByText('Kein Führungsrhythmus in diesem Einsatz aktiviert')).toBeInTheDocument();
    expect(screen.queryByText('Aktivierungen')).not.toBeInTheDocument();
  });

  // --- AC4: Error State ---

  it('should show error state with retry button (AC4)', () => {
    // Given
    mockUseFuehrungsrhythmusStatistik.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() });

    // When
    render(<FuehrungsrhythmusStatistik einsatzId="einsatz-1" />);

    // Then
    expect(screen.getByText('Führungsrhythmus-Statistik konnte nicht geladen werden.')).toBeInTheDocument();
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
  });

  it('should call refetch when retry button is clicked (AC4)', () => {
    // Given
    const mockRefetch = vi.fn();
    mockUseFuehrungsrhythmusStatistik.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    });

    // When
    render(<FuehrungsrhythmusStatistik einsatzId="einsatz-1" />);
    fireEvent.click(screen.getByText('Erneut versuchen'));

    // Then
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  // --- Collapsible Panel ---

  it('should be expanded by default', () => {
    // Given
    mockUseFuehrungsrhythmusStatistik.mockReturnValue({ data: mockData, isLoading: false, isError: false });

    // When
    render(<FuehrungsrhythmusStatistik einsatzId="einsatz-1" />);

    // Then
    const toggleButton = screen.getByRole('button', { name: /Führungsrhythmus-Statistik/ });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('should collapse when toggle clicked', () => {
    // Given
    mockUseFuehrungsrhythmusStatistik.mockReturnValue({ data: mockData, isLoading: false, isError: false });
    render(<FuehrungsrhythmusStatistik einsatzId="einsatz-1" />);
    const toggleButton = screen.getByRole('button', { name: /Führungsrhythmus-Statistik/ });

    // When
    fireEvent.click(toggleButton);

    // Then
    expect(screen.queryByText('Aktivierungen')).not.toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  // --- Hook Integration ---

  it('should pass einsatzId to hook', () => {
    // Given
    mockUseFuehrungsrhythmusStatistik.mockReturnValue({ data: undefined, isLoading: false, isError: false });

    // When
    render(<FuehrungsrhythmusStatistik einsatzId="my-einsatz-456" />);

    // Then
    expect(mockUseFuehrungsrhythmusStatistik).toHaveBeenCalledWith('my-einsatz-456');
  });
});
