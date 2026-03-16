import { renderWithProviders, screen } from '@/test/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SingleEinsatzDashboard } from '../SingleEinsatzDashboard';
import { RING_2_PERFORMANCE_SCENARIOS, RING_2_PERFORMANCE_THRESHOLDS, buildOverviewDashboardFixture } from '@/test/performance/ring-2-performance-fixtures';
import { createStructuredPerformanceReport, formatStructuredPerformanceReport, measureRenderCycle, runIterations } from '@/test/performance/ring-2-performance-metrics';

const mockSetActiveEinsatz = vi.fn();

const overviewFixture = buildOverviewDashboardFixture();

const mockOverviewState = {
  isLoading: false,
  error: null as Error | null,
  einsatz: overviewFixture.einsatz,
  fahrzeuge: overviewFixture.fahrzeuge,
  etbEntries: overviewFixture.etbEntries,
  pois: overviewFixture.pois,
  isLoadingFahrzeuge: false,
  isLoadingEtb: false,
  isLoadingLagekarte: false,
};

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ einsatzId: 'einsatz-1' }),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();

  return {
    ...actual,
    useQuery: () => ({
      data: mockOverviewState.einsatz ? { data: mockOverviewState.einsatz } : undefined,
      isLoading: mockOverviewState.isLoading,
      error: mockOverviewState.error,
    }),
  };
});

vi.mock('@/features/einsatz', () => ({
  EINSATZ_QUERY_KEYS: {
    detail: (einsatzId: string) => ['einsatz', einsatzId],
  },
  useActiveEinsatz: () => ({
    activeEinsatz: null,
    setActiveEinsatz: mockSetActiveEinsatz,
    isEinsatzActive: false,
  }),
  useEinsatzFahrzeuge: () => ({
    data: mockOverviewState.fahrzeuge,
    isLoading: mockOverviewState.isLoadingFahrzeuge,
  }),
  useMyEinsatzTeilnahme: () => ({
    data: {
      data: {
        einsatzPersonId: 'einsatz-person-1',
      },
    },
  }),
  useUpdateFmsStatus: () => ({
    mutate: vi.fn(),
  }),
}));

vi.mock('@/features/etb', () => ({
  useEtb: () => ({
    data: {
      eintraege: mockOverviewState.etbEntries,
    },
    isLoading: mockOverviewState.isLoadingEtb,
  }),
}));

vi.mock('@/features/lagekarte', () => ({
  useLagekarte: () => ({
    data: {
      pois: mockOverviewState.pois,
    },
    isLoading: mockOverviewState.isLoadingLagekarte,
  }),
}));

vi.mock('@/features/einsatz/ui/molecules/EinsatzStatsCard', () => ({
  EinsatzStatsCard: ({ title, value, description }: { title: string; value: string; description: string }) => (
    <div>
      <span>{title}</span>
      <span>{value}</span>
      <span>{description}</span>
    </div>
  ),
}));

vi.mock('@/features/einsatz/ui/molecules/EinsatzResourceWidget', () => ({
  EinsatzResourceWidget: () => <div data-testid="einsatz-resource-widget" />,
}));

vi.mock('@/features/einsatz/ui/molecules/EinsatzTimelineWidget', () => ({
  EinsatzTimelineWidget: () => <div data-testid="einsatz-timeline-widget" />,
}));

vi.mock('@/features/einsatz/ui/organisms/FahrzeugHinzufuegenDialog.organism', () => ({
  FahrzeugHinzufuegenDialog: () => null,
}));

vi.mock('@/features/einsatz/ui/organisms/PersonHinzufuegenDialog.organism', () => ({
  PersonHinzufuegenDialog: () => null,
}));

vi.mock('@/features/reminders', () => ({
  DashboardErinnerungen: () => <div data-testid="dashboard-erinnerungen" />,
  ErinnerungStatistik: () => <div data-testid="erinnerung-statistik" />,
}));

describe('SingleEinsatzDashboard Performance-Gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockOverviewState, {
      isLoading: false,
      error: null,
      einsatz: overviewFixture.einsatz,
      fahrzeuge: overviewFixture.fahrzeuge,
      etbEntries: overviewFixture.etbEntries,
      pois: overviewFixture.pois,
      isLoadingFahrzeuge: false,
      isLoadingEtb: false,
      isLoadingLagekarte: false,
    });
  });

  it('zeigt beim Überblick ein textliches Ladefeedback sofort an', () => {
    mockOverviewState.isLoading = true;

    renderWithProviders(<SingleEinsatzDashboard />);

    expect(screen.getByRole('status')).toHaveTextContent('Lade Einsatzdaten...');
  });

  it('zeigt Kartenzustände mit textlichem Status für verzögerte Teilabfragen', () => {
    mockOverviewState.isLoadingFahrzeuge = true;
    mockOverviewState.isLoadingEtb = true;
    mockOverviewState.isLoadingLagekarte = true;

    renderWithProviders(<SingleEinsatzDashboard />);

    expect(screen.getAllByText('Wird geladen...')).toHaveLength(3);
  });

  it('liefert einen P95-Gate-Report für den nutzbaren Überblickszustand mit 100 Überblicksobjekten', async () => {
    const samples = await runIterations({
      iterations: RING_2_PERFORMANCE_THRESHOLDS.iterations,
      measure: () =>
        measureRenderCycle(
          () => renderWithProviders(<SingleEinsatzDashboard />),
          async () => {
            expect(screen.getByText('Schnellzugriffe')).toBeInTheDocument();
            expect(screen.getByTestId('einsatz-resource-widget')).toBeInTheDocument();
          },
        ),
    });

    const report = createStructuredPerformanceReport({
      scenario: RING_2_PERFORMANCE_SCENARIOS.overview.id,
      metric: 'usable-state',
      thresholdMs: RING_2_PERFORMANCE_THRESHOLDS.usableStateP95Ms,
      samples,
      device: 'Desktop >= 1024px',
      browser: 'Chrome 146',
      requiredPassRate: RING_2_PERFORMANCE_THRESHOLDS.requiredPassRate,
    });

    console.info(formatStructuredPerformanceReport(report));

    expect(report.iterations).toBe(RING_2_PERFORMANCE_THRESHOLDS.iterations);
    expect(report.pass).toBe(true);
  });
});
