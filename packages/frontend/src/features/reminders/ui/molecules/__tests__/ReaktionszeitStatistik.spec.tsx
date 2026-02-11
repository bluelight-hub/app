import { render, screen, fireEvent } from '@testing-library/react';
import type { ReaktionszeitStatistikDto } from '@/shared';

// --- Mocks ---

const mockUseReaktionszeitStatistik = vi.fn();
vi.mock('../../../api/queries', () => ({
  useReaktionszeitStatistik: (...args: unknown[]) => mockUseReaktionszeitStatistik(...args),
}));

vi.mock('recharts', () => ({
  BarChart: ({ children, data }: { children: React.ReactNode; data?: unknown[] }) => (
    <div data-testid="bar-chart" data-bucket-count={data?.length ?? 0}>
      {children}
    </div>
  ),
  Bar: ({ dataKey, name }: { dataKey: string; name: string }) => <div data-testid={`bar-${dataKey}`} data-name={name} />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
}));

vi.mock('@/features/einsatz/ui/molecules/EinsatzStatsCard', () => ({
  EinsatzStatsCard: ({ title, value, variant }: { title: string; value: string | number; variant: string }) => (
    <div data-testid={`stats-card-${variant}`}>
      <span>{title}</span>
      <span>{value}</span>
    </div>
  ),
}));

import { ReaktionszeitStatistik } from '../ReaktionszeitStatistik';

// --- Test Data ---

function createMockData(overrides: Partial<ReaktionszeitStatistikDto> = {}): ReaktionszeitStatistikDto {
  return {
    totalAcknowledged: 5,
    avgReaktionszeitSeconds: 83,
    medianReaktionszeitSeconds: 65,
    minReaktionszeitSeconds: 12,
    maxReaktionszeitSeconds: 525,
    buckets: [
      { label: '0-30s', minSeconds: 0, maxSeconds: 30, count: 1 },
      { label: '30s-1m', minSeconds: 30, maxSeconds: 60, count: 1 },
      { label: '1-2m', minSeconds: 60, maxSeconds: 120, count: 2 },
      { label: '2-5m', minSeconds: 120, maxSeconds: 300, count: 0 },
      { label: '5-10m', minSeconds: 300, maxSeconds: 600, count: 1 },
      { label: '>10m', minSeconds: 600, maxSeconds: Number.POSITIVE_INFINITY, count: 0 },
    ],
    ...overrides,
  };
}

describe('ReaktionszeitStatistik', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- AC1: Summary Cards ---

  it('should render summary cards with formatted durations (AC1)', () => {
    // Given
    const mockData = createMockData();
    mockUseReaktionszeitStatistik.mockReturnValue({ data: mockData, isLoading: false, isError: false });

    // When
    render(<ReaktionszeitStatistik einsatzId="einsatz-1" />);

    // Then
    expect(screen.getByText('Ø Reaktionszeit')).toBeInTheDocument();
    expect(screen.getByText('1m 23s')).toBeInTheDocument(); // 83 seconds
    expect(screen.getByText('Median')).toBeInTheDocument();
    expect(screen.getByText('1m 5s')).toBeInTheDocument(); // 65 seconds
    expect(screen.getByText('Schnellste')).toBeInTheDocument();
    expect(screen.getByText('12s')).toBeInTheDocument(); // 12 seconds
    expect(screen.getByText('Langsamste')).toBeInTheDocument();
    expect(screen.getByText('8m 45s')).toBeInTheDocument(); // 525 seconds
  });

  it('should use correct card variants (AC1)', () => {
    // Given
    mockUseReaktionszeitStatistik.mockReturnValue({ data: createMockData(), isLoading: false, isError: false });

    // When
    render(<ReaktionszeitStatistik einsatzId="einsatz-1" />);

    // Then
    const defaultCards = screen.getAllByTestId('stats-card-default');
    expect(defaultCards).toHaveLength(2); // Avg + Median
    expect(screen.getByTestId('stats-card-success')).toBeInTheDocument(); // Schnellste
    expect(screen.getByTestId('stats-card-danger')).toBeInTheDocument(); // Langsamste
  });

  // --- AC2: Histogramm ---

  it('should render bar chart with bucket data (AC2)', () => {
    // Given
    mockUseReaktionszeitStatistik.mockReturnValue({ data: createMockData(), isLoading: false, isError: false });

    // When
    render(<ReaktionszeitStatistik einsatzId="einsatz-1" />);

    // Then
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    const chart = screen.getByTestId('bar-chart');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveAttribute('data-bucket-count', '6');
    expect(screen.getByTestId('bar-count')).toBeInTheDocument();
  });

  // --- AC3: Loading State ---

  it('should show skeleton loading state (AC3)', () => {
    // Given
    mockUseReaktionszeitStatistik.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    // When
    render(<ReaktionszeitStatistik einsatzId="einsatz-1" />);

    // Then
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
    // 4 skeleton cards + 1 chart area = 5
    expect(skeletonElements.length).toBe(5);
  });

  // --- AC4: Empty State ---

  it('should show empty state when no acknowledged erinnerungen (AC4)', () => {
    // Given
    const emptyData = createMockData({ totalAcknowledged: 0, buckets: [] });
    mockUseReaktionszeitStatistik.mockReturnValue({ data: emptyData, isLoading: false, isError: false });

    // When
    render(<ReaktionszeitStatistik einsatzId="einsatz-1" />);

    // Then
    expect(screen.getByText('Keine Reaktionsdaten vorhanden')).toBeInTheDocument();
    expect(screen.queryByText('Ø Reaktionszeit')).not.toBeInTheDocument();
  });

  // --- AC5: Error State ---

  it('should show error state with retry button (AC5)', () => {
    // Given
    const refetchMock = vi.fn();
    mockUseReaktionszeitStatistik.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: refetchMock });

    // When
    render(<ReaktionszeitStatistik einsatzId="einsatz-1" />);

    // Then
    expect(screen.getByText('Reaktionszeit-Statistik konnte nicht geladen werden.')).toBeInTheDocument();
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
  });

  it('should call refetch when retry button is clicked (AC5)', () => {
    // Given
    const refetchMock = vi.fn();
    mockUseReaktionszeitStatistik.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: refetchMock });
    render(<ReaktionszeitStatistik einsatzId="einsatz-1" />);

    // When
    fireEvent.click(screen.getByText('Erneut versuchen'));

    // Then
    expect(refetchMock).toHaveBeenCalledOnce();
  });

  // --- Collapsible Panel ---

  it('should be expanded by default', () => {
    // Given
    mockUseReaktionszeitStatistik.mockReturnValue({ data: createMockData(), isLoading: false, isError: false });

    // When
    render(<ReaktionszeitStatistik einsatzId="einsatz-1" />);

    // Then
    const toggleButton = screen.getByRole('button', { name: /Reaktionszeit-Statistik/ });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('should collapse when toggle is clicked', () => {
    // Given
    mockUseReaktionszeitStatistik.mockReturnValue({ data: createMockData(), isLoading: false, isError: false });
    render(<ReaktionszeitStatistik einsatzId="einsatz-1" />);
    const toggleButton = screen.getByRole('button', { name: /Reaktionszeit-Statistik/ });

    // When
    fireEvent.click(toggleButton);

    // Then
    expect(screen.queryByText('Ø Reaktionszeit')).not.toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  // --- Hook Integration ---

  it('should pass einsatzId to useReaktionszeitStatistik hook', () => {
    // Given
    mockUseReaktionszeitStatistik.mockReturnValue({ data: undefined, isLoading: false, isError: false });

    // When
    render(<ReaktionszeitStatistik einsatzId="my-einsatz-789" />);

    // Then
    expect(mockUseReaktionszeitStatistik).toHaveBeenCalledWith('my-einsatz-789');
  });
});
