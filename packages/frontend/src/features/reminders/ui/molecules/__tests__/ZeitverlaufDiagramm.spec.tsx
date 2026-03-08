/**
 * Unit Tests fuer ZeitverlaufDiagramm Komponente
 *
 * **Story 9.3 Tasks 10.1:**
 * - Rendering mit Daten
 * - Loading State (Skeleton)
 * - Empty State
 * - Error State
 * - Collapsible Toggle
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ZeitverlaufDiagramm } from '@/features/reminders';

// Mock recharts - SVG rendering ist in jsdom schwierig
vi.mock('recharts', () => ({
  AreaChart: ({ children, data }: { children: React.ReactNode; data?: unknown[] }) => (
    <div data-testid="area-chart" data-bucket-count={data?.length ?? 0}>
      {children}
    </div>
  ),
  Area: ({ dataKey, name }: { dataKey: string; name: string }) => <div data-testid={`area-${dataKey}`} data-name={name} />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  Brush: () => <div data-testid="brush" />,
}));

// Mock den API Hook
const mockUseZeitverlaufStatistik = vi.fn();
vi.mock('../../../api/queries', () => ({
  useZeitverlaufStatistik: (...args: unknown[]) => mockUseZeitverlaufStatistik(...args),
}));

const mockData = {
  intervalMinutes: 15,
  buckets: [
    { timestamp: '2026-02-01T10:00:00.000Z', erstellt: 3, ausgeloest: 1, eskaliert: 0 },
    { timestamp: '2026-02-01T10:15:00.000Z', erstellt: 1, ausgeloest: 2, eskaliert: 1 },
  ],
};

describe('ZeitverlaufDiagramm', () => {
  const einsatzId = 'einsatz-test-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render chart when data is available', () => {
    // Given
    mockUseZeitverlaufStatistik.mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
    });

    // When
    render(<ZeitverlaufDiagramm einsatzId={einsatzId} />);

    // Then
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByText('Zeitverlauf')).toBeInTheDocument();
    // Verify Area components with correct dataKeys
    expect(screen.getByTestId('area-erstellt')).toBeInTheDocument();
    expect(screen.getByTestId('area-ausgeloest')).toBeInTheDocument();
    expect(screen.getByTestId('area-eskaliert')).toBeInTheDocument();
    // Verify bucket count
    expect(screen.getByTestId('area-chart')).toHaveAttribute('data-bucket-count', '2');
  });

  it('should show skeleton loading state', () => {
    // Given
    mockUseZeitverlaufStatistik.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    // When
    render(<ZeitverlaufDiagramm einsatzId={einsatzId} />);

    // Then
    expect(screen.getByTestId('zeitverlauf-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument();
  });

  it('should show empty state when no buckets', () => {
    // Given
    mockUseZeitverlaufStatistik.mockReturnValue({
      data: { intervalMinutes: 60, buckets: [] },
      isLoading: false,
      isError: false,
    });

    // When
    render(<ZeitverlaufDiagramm einsatzId={einsatzId} />);

    // Then
    expect(screen.getByText('Noch keine Erinnerungen vorhanden')).toBeInTheDocument();
    expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument();
  });

  it('should render chart with single bucket', () => {
    // Given
    mockUseZeitverlaufStatistik.mockReturnValue({
      data: {
        intervalMinutes: 15,
        buckets: [{ timestamp: '2026-02-01T10:00:00.000Z', erstellt: 5, ausgeloest: 2, eskaliert: 1 }],
      },
      isLoading: false,
      isError: false,
    });

    // When
    render(<ZeitverlaufDiagramm einsatzId={einsatzId} />);

    // Then
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toHaveAttribute('data-bucket-count', '1');
  });

  it('should show error state on failure', () => {
    // Given
    mockUseZeitverlaufStatistik.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    // When
    render(<ZeitverlaufDiagramm einsatzId={einsatzId} />);

    // Then
    expect(screen.getByText('Fehler beim Laden der Zeitverlauf-Statistiken.')).toBeInTheDocument();
  });

  it('should be expanded by default with aria-expanded=true', () => {
    // Given
    mockUseZeitverlaufStatistik.mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
    });

    // When
    render(<ZeitverlaufDiagramm einsatzId={einsatzId} />);

    // Then
    const toggle = screen.getByRole('button', { name: /Zeitverlauf/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('should collapse when toggle is clicked', () => {
    // Given
    mockUseZeitverlaufStatistik.mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
    });
    render(<ZeitverlaufDiagramm einsatzId={einsatzId} />);
    const toggle = screen.getByRole('button', { name: /Zeitverlauf/ });

    // When
    fireEvent.click(toggle);

    // Then
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument();
  });

  it('should call hook with correct einsatzId', () => {
    // Given
    mockUseZeitverlaufStatistik.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    // When
    render(<ZeitverlaufDiagramm einsatzId={einsatzId} />);

    // Then
    expect(mockUseZeitverlaufStatistik).toHaveBeenCalledWith(einsatzId);
  });
});
