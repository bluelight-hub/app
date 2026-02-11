/**
 * Unit Tests fuer EskalationsAnalyse Komponente
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 9.4 Tasks 7+9:**
 * - Korrekte Darstellung der Eskalations-KPIs (AC1)
 * - Sortierbare Detail-Tabelle (AC2)
 * - Loading State mit Skeleton (AC3)
 * - Empty State bei keinen Eskalationen (AC4)
 * - Error State (AC5)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EskalationsAnalyse } from '../EskalationsAnalyse';

// Mock useEskalationsAnalyse hook
const mockUseEskalationsAnalyse = vi.fn();
vi.mock('../../../api/queries', () => ({
  useEskalationsAnalyse: (...args: unknown[]) => mockUseEskalationsAnalyse(...args),
}));

const mockData = {
  totalEscalated: 3,
  totalErinnerungen: 20,
  eskalationsRate: 0.15,
  avgZeitBisEskalationSeconds: 272,
  topReceivers: [
    { userId: 'user-1', userName: 'Max Müller', count: 2 },
    { userId: 'user-2', userName: 'Anna Schmidt', count: 1 },
  ],
  topSources: [
    { userId: 'user-3', userName: 'Tim Wolf', count: 2 },
    { userId: 'user-1', userName: 'Max Müller', count: 1 },
  ],
  items: [
    {
      erinnerungId: 'erinnerung-1',
      titel: 'Lagebesprechung',
      ausgeloestAm: '2026-02-08T14:00:00.000Z',
      eskaliertAm: '2026-02-08T14:05:00.000Z',
      zeitBisEskalationSeconds: 300,
      eskaliertAn: 'Max Müller',
      previousAssignee: 'Tim Wolf',
    },
    {
      erinnerungId: 'erinnerung-2',
      titel: 'Wasserversorgung prüfen',
      ausgeloestAm: '2026-02-08T15:00:00.000Z',
      eskaliertAm: '2026-02-08T15:04:04.000Z',
      zeitBisEskalationSeconds: 244,
      eskaliertAn: 'Anna Schmidt',
      previousAssignee: null,
    },
  ],
};

describe('EskalationsAnalyse', () => {
  beforeEach(() => {
    mockUseEskalationsAnalyse.mockReset();
  });

  // --- AC1: Summary-KPIs ---

  it('should render summary cards with correct values (AC1)', () => {
    // Given
    mockUseEskalationsAnalyse.mockReturnValue({ data: mockData, isLoading: false, isError: false });

    // When
    render(<EskalationsAnalyse einsatzId="einsatz-1" />);

    // Then
    expect(screen.getByText('Eskalationen gesamt')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Eskalationsrate')).toBeInTheDocument();
    expect(screen.getByText('15.0%')).toBeInTheDocument();
    expect(screen.getByText('Ø Zeit bis Eskalation')).toBeInTheDocument();
    // 272 seconds = 4m 32s
    expect(screen.getByText('4m 32s')).toBeInTheDocument();
  });

  it('should render top receivers list (AC1)', () => {
    // Given
    mockUseEskalationsAnalyse.mockReturnValue({ data: mockData, isLoading: false, isError: false });

    // When
    render(<EskalationsAnalyse einsatzId="einsatz-1" />);

    // Then
    expect(screen.getByText('Häufigste Empfänger')).toBeInTheDocument();
    expect(screen.getByText('Max Müller (2)')).toBeInTheDocument();
    expect(screen.getByText('Anna Schmidt (1)')).toBeInTheDocument();
  });

  it('should render top sources list (AC1)', () => {
    // Given
    mockUseEskalationsAnalyse.mockReturnValue({ data: mockData, isLoading: false, isError: false });

    // When
    render(<EskalationsAnalyse einsatzId="einsatz-1" />);

    // Then
    expect(screen.getByText('Häufigste Quellen')).toBeInTheDocument();
    expect(screen.getByText('Tim Wolf (2)')).toBeInTheDocument();
    // Max Müller (1) appears in both lists - check both exist
    const maxMuellerEntries = screen.getAllByText('Max Müller (1)');
    expect(maxMuellerEntries.length).toBeGreaterThanOrEqual(1);
  });

  // --- AC2: Detail-Tabelle ---

  it('should render detail table with all columns (AC2)', () => {
    // Given
    mockUseEskalationsAnalyse.mockReturnValue({ data: mockData, isLoading: false, isError: false });

    // When
    render(<EskalationsAnalyse einsatzId="einsatz-1" />);

    // Then - Headers
    expect(screen.getByText('Titel')).toBeInTheDocument();
    expect(screen.getByText('Ausgelöst am')).toBeInTheDocument();
    expect(screen.getByText('Eskaliert am')).toBeInTheDocument();
    expect(screen.getByText('Dauer')).toBeInTheDocument();
    expect(screen.getByText('Eskaliert an')).toBeInTheDocument();
    expect(screen.getByText('Vorheriger Assignee')).toBeInTheDocument();

    // Then - Data
    expect(screen.getByText('Lagebesprechung')).toBeInTheDocument();
    expect(screen.getByText('Wasserversorgung prüfen')).toBeInTheDocument();
  });

  it('should format timestamps as dd.MM. HH:mm (AC2)', () => {
    // Given
    mockUseEskalationsAnalyse.mockReturnValue({ data: mockData, isLoading: false, isError: false });

    // When
    render(<EskalationsAnalyse einsatzId="einsatz-1" />);

    // Then - 2026-02-08T14:00:00.000Z → "08.02. 15:00" (CET = UTC+1)
    // Note: Exact format depends on timezone, checking pattern presence
    const cells = screen.getAllByRole('cell');
    const timestampCells = cells.filter((c) => /\d{2}\.\d{2}\.\s\d{2}:\d{2}/.test(c.textContent ?? ''));
    expect(timestampCells.length).toBeGreaterThanOrEqual(2);
  });

  it('should show "–" for null previousAssignee (AC2)', () => {
    // Given
    mockUseEskalationsAnalyse.mockReturnValue({ data: mockData, isLoading: false, isError: false });

    // When
    render(<EskalationsAnalyse einsatzId="einsatz-1" />);

    // Then
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('should sort by column when clicking header (AC2)', () => {
    // Given
    mockUseEskalationsAnalyse.mockReturnValue({ data: mockData, isLoading: false, isError: false });
    render(<EskalationsAnalyse einsatzId="einsatz-1" />);

    // When - Click "Titel" header to sort by titel desc
    fireEvent.click(screen.getByText('Titel'));
    // Click again for asc
    fireEvent.click(screen.getByText('Titel'));

    // Then - "Lagebesprechung" should come before "Wasserversorgung" (asc)
    const rows = screen.getAllByRole('row');
    // rows[0] = header, rows[1] = first data row
    expect(rows[1]).toHaveTextContent('Lagebesprechung');
  });

  it('should toggle sort direction on repeated click (AC2)', () => {
    // Given
    mockUseEskalationsAnalyse.mockReturnValue({ data: mockData, isLoading: false, isError: false });
    render(<EskalationsAnalyse einsatzId="einsatz-1" />);

    // Default sort: eskaliertAm desc → Wasserversorgung first (15:04 > 14:05)
    const rows1 = screen.getAllByRole('row');
    expect(rows1[1]).toHaveTextContent('Wasserversorgung');

    // When - Click "Eskaliert am" again to toggle to asc
    fireEvent.click(screen.getByText('Eskaliert am'));

    // Then - Lagebesprechung first (14:05 < 15:04)
    const rows2 = screen.getAllByRole('row');
    expect(rows2[1]).toHaveTextContent('Lagebesprechung');
  });

  // --- AC3: Loading State ---

  it('should show skeleton loading state (AC3)', () => {
    // Given
    mockUseEskalationsAnalyse.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    // When
    render(<EskalationsAnalyse einsatzId="einsatz-1" />);

    // Then
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  // --- AC4: Empty State ---

  it('should show empty state when no escalations (AC4)', () => {
    // Given
    const emptyData = { ...mockData, totalEscalated: 0, items: [], topReceivers: [], topSources: [] };
    mockUseEskalationsAnalyse.mockReturnValue({ data: emptyData, isLoading: false, isError: false });

    // When
    render(<EskalationsAnalyse einsatzId="einsatz-1" />);

    // Then
    expect(screen.getByText('Keine Eskalationen in diesem Einsatz')).toBeInTheDocument();
    // Should NOT show summary cards or table
    expect(screen.queryByText('Eskalationen gesamt')).not.toBeInTheDocument();
  });

  // --- AC5: Error State ---

  it('should show error state when query fails (AC5)', () => {
    // Given
    mockUseEskalationsAnalyse.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() });

    // When
    render(<EskalationsAnalyse einsatzId="einsatz-1" />);

    // Then
    expect(screen.getByText('Eskalations-Analyse konnte nicht geladen werden.')).toBeInTheDocument();
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
  });

  // --- Collapsible Panel ---

  it('should be expanded by default', () => {
    // Given
    mockUseEskalationsAnalyse.mockReturnValue({ data: mockData, isLoading: false, isError: false });

    // When
    render(<EskalationsAnalyse einsatzId="einsatz-1" />);

    // Then
    const toggleButton = screen.getByRole('button', { name: /Eskalations-Analyse/ });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('should collapse when toggle is clicked', () => {
    // Given
    mockUseEskalationsAnalyse.mockReturnValue({ data: mockData, isLoading: false, isError: false });
    render(<EskalationsAnalyse einsatzId="einsatz-1" />);
    const toggleButton = screen.getByRole('button', { name: /Eskalations-Analyse/ });

    // When
    fireEvent.click(toggleButton);

    // Then
    expect(screen.queryByText('Eskalationen gesamt')).not.toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  // --- Hook Integration ---

  it('should pass einsatzId to useEskalationsAnalyse hook', () => {
    // Given
    mockUseEskalationsAnalyse.mockReturnValue({ data: undefined, isLoading: false, isError: false });

    // When
    render(<EskalationsAnalyse einsatzId="my-einsatz-456" />);

    // Then
    expect(mockUseEskalationsAnalyse).toHaveBeenCalledWith('my-einsatz-456');
  });
});
