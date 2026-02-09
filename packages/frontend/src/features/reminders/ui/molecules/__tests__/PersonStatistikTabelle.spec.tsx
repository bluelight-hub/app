/**
 * Unit Tests fuer PersonStatistikTabelle Komponente
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 9.2 Tasks 7+9:**
 * - Korrekte Darstellung der Personen-Statistiken (AC1)
 * - Sortierbare Spalten (AC1)
 * - Loading State mit Skeleton (AC3)
 * - Empty State bei keinen Teilnehmern (AC4)
 * - Collapsible Panel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PersonStatistikTabelle } from '../PersonStatistikTabelle';

// Mock usePersonStatistik hook
const mockUsePersonStatistik = vi.fn();
vi.mock('../../../api/queries', () => ({
  usePersonStatistik: (...args: unknown[]) => mockUsePersonStatistik(...args),
}));

const mockItems = [
  { userId: 'user-1', userName: 'Max Mustermann', zugewiesen: 5, acknowledged: 3, eskalationen: 1, avgReaktionszeitSeconds: 45.5 },
  { userId: 'user-2', userName: 'Erika Musterfrau', zugewiesen: 2, acknowledged: 1, eskalationen: 0, avgReaktionszeitSeconds: null },
  { userId: 'user-3', userName: 'Anna Schmidt', zugewiesen: 8, acknowledged: 6, eskalationen: 2, avgReaktionszeitSeconds: 120 },
];

describe('PersonStatistikTabelle', () => {
  beforeEach(() => {
    mockUsePersonStatistik.mockReset();
  });

  it('should render table with person statistics (AC1)', () => {
    // Given
    mockUsePersonStatistik.mockReturnValue({ data: { items: mockItems }, isLoading: false });

    // When
    render(<PersonStatistikTabelle einsatzId="einsatz-1" />);

    // Then
    expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    expect(screen.getByText('Erika Musterfrau')).toBeInTheDocument();
    expect(screen.getByText('Anna Schmidt')).toBeInTheDocument();
    // Check header columns
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Zugewiesen')).toBeInTheDocument();
    expect(screen.getByText('Acknowledged')).toBeInTheDocument();
    expect(screen.getByText('Eskalationen')).toBeInTheDocument();
    expect(screen.getByText('Ø Reaktionszeit')).toBeInTheDocument();
  });

  it('should format reaction time using formatDuration (AC1)', () => {
    // Given
    mockUsePersonStatistik.mockReturnValue({
      data: { items: [{ userId: 'u1', userName: 'Test', zugewiesen: 1, acknowledged: 1, eskalationen: 0, avgReaktionszeitSeconds: 45.5 }] },
      isLoading: false,
    });

    // When
    render(<PersonStatistikTabelle einsatzId="einsatz-1" />);

    // Then - 45.5s rounds to "46s" (formatDuration rounds)
    expect(screen.getByText('46s')).toBeInTheDocument();
  });

  it('should show "–" for null reaction time (AC1)', () => {
    // Given
    mockUsePersonStatistik.mockReturnValue({
      data: { items: [{ userId: 'u1', userName: 'Test', zugewiesen: 1, acknowledged: 0, eskalationen: 0, avgReaktionszeitSeconds: null }] },
      isLoading: false,
    });

    // When
    render(<PersonStatistikTabelle einsatzId="einsatz-1" />);

    // Then
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('should show skeleton loading state (AC3)', () => {
    // Given
    mockUsePersonStatistik.mockReturnValue({ data: undefined, isLoading: true });

    // When
    render(<PersonStatistikTabelle einsatzId="einsatz-1" />);

    // Then - Skeleton has animated pulse divs
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('should show empty state when no persons present (AC4)', () => {
    // Given
    mockUsePersonStatistik.mockReturnValue({ data: { items: [] }, isLoading: false });

    // When
    render(<PersonStatistikTabelle einsatzId="einsatz-1" />);

    // Then
    expect(screen.getByText('Keine Teilnehmer im Einsatz vorhanden.')).toBeInTheDocument();
  });

  it('should sort by column when clicking header', () => {
    // Given
    mockUsePersonStatistik.mockReturnValue({ data: { items: mockItems }, isLoading: false });
    render(<PersonStatistikTabelle einsatzId="einsatz-1" />);

    // When - Click "Name" header to sort by name desc (first click = desc)
    fireEvent.click(screen.getByText('Name'));
    // Click again for asc
    fireEvent.click(screen.getByText('Name'));

    // Then - Anna should come first (alphabetical asc)
    const rows = screen.getAllByRole('row');
    // rows[0] is header, rows[1] is first data row
    expect(rows[1]).toHaveTextContent('Anna Schmidt');
  });

  it('should toggle sort direction on repeated click', () => {
    // Given
    mockUsePersonStatistik.mockReturnValue({ data: { items: mockItems }, isLoading: false });
    render(<PersonStatistikTabelle einsatzId="einsatz-1" />);

    // Default sort: zugewiesen desc → Anna(8), Max(5), Erika(2)
    const rows1 = screen.getAllByRole('row');
    expect(rows1[1]).toHaveTextContent('Anna Schmidt');

    // When - Click "Zugewiesen" again to toggle to asc
    fireEvent.click(screen.getByText('Zugewiesen'));

    // Then - Erika(2), Max(5), Anna(8)
    const rows2 = screen.getAllByRole('row');
    expect(rows2[1]).toHaveTextContent('Erika Musterfrau');
  });

  it('should collapse and show no table when toggle is clicked', () => {
    // Given
    mockUsePersonStatistik.mockReturnValue({ data: { items: mockItems }, isLoading: false });
    render(<PersonStatistikTabelle einsatzId="einsatz-1" />);
    const toggleButton = screen.getByRole('button', { name: /Personen-Statistik/ });

    // When
    fireEvent.click(toggleButton);

    // Then
    expect(screen.queryByText('Max Mustermann')).not.toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('should be expanded by default with aria-expanded="true"', () => {
    // Given
    mockUsePersonStatistik.mockReturnValue({ data: { items: [] }, isLoading: false });

    // When
    render(<PersonStatistikTabelle einsatzId="einsatz-1" />);

    // Then
    const toggleButton = screen.getByRole('button', { name: /Personen-Statistik/ });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('should pass einsatzId to usePersonStatistik hook', () => {
    // Given
    mockUsePersonStatistik.mockReturnValue({ data: { items: [] }, isLoading: false });

    // When
    render(<PersonStatistikTabelle einsatzId="my-einsatz-123" />);

    // Then
    expect(mockUsePersonStatistik).toHaveBeenCalledWith('my-einsatz-123');
  });

  it('should show error message when query fails', () => {
    // Given
    mockUsePersonStatistik.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    // When
    render(<PersonStatistikTabelle einsatzId="test-id" />);

    // Then
    expect(screen.getByText('Statistiken konnten nicht geladen werden.')).toBeInTheDocument();
  });

  it('should render person with all zero values (AC2)', () => {
    // Given
    const zeroItem = { userId: 'user-zero', userName: 'Zero User', zugewiesen: 0, acknowledged: 0, eskalationen: 0, avgReaktionszeitSeconds: null };
    mockUsePersonStatistik.mockReturnValue({ data: { items: [zeroItem] }, isLoading: false, isError: false });

    // When
    render(<PersonStatistikTabelle einsatzId="test-id" />);

    // Then
    expect(screen.getByText('Zero User')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(3); // zugewiesen, acknowledged, eskalationen
    expect(screen.getByText('–')).toBeInTheDocument(); // null reaktionszeit
  });
});
