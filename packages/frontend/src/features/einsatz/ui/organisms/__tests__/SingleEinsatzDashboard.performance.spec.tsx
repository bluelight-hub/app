import { EINSATZ_WORKSPACE_MODULES, WorkspaceShell, type WorkspaceContextBarModel, type WorkspaceStatusItem } from '@/features/workspace';
import { act, renderWithProviders, screen, waitFor, within } from '@/test/utils';
import type { AnchorHTMLAttributes } from 'react';
import { PiPulse, PiWarning } from 'react-icons/pi';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SingleEinsatzDashboard } from '../SingleEinsatzDashboard';
import { RING_2_PERFORMANCE_SCENARIOS, RING_2_PERFORMANCE_THRESHOLDS, buildOverviewDashboardFixture } from '@/test/performance/ring-2-performance-fixtures';
import { createStructuredPerformanceReport, formatStructuredPerformanceReport, measureInteractionCycle, runIterations } from '@/test/performance/ring-2-performance-metrics';

const mockSetActiveEinsatz = vi.fn();

const overviewFixture = buildOverviewDashboardFixture();
const overviewWarningCount = overviewFixture.statusObjects.filter((item) => item.state === 'warning').length;

const overviewContextBar: WorkspaceContextBarModel = {
  title: 'Einsatz 12-34 | Wohnungsbrand Musterstraße',
  subtitle: 'B3Y • Musterstraße 7',
  backAction: {
    label: 'Einsätze',
    href: '/app/einsaetze',
  },
};

const overviewStatusItems: WorkspaceStatusItem[] = [
  {
    id: 'overview-load',
    label: 'Überblicksobjekte',
    value: overviewFixture.statusObjects.length,
    description: `${overviewFixture.fahrzeuge.length} Ressourcen · ${overviewFixture.pois.length} Ortsmarken`,
    tone: 'active',
    icon: PiPulse,
  },
  {
    id: 'overview-warnings',
    label: 'Warnsignale',
    value: overviewWarningCount,
    description: 'Priorisierte Statushinweise aus der Referenzlast',
    tone: 'warning',
    icon: PiWarning,
  },
];

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

interface OverviewWorkspaceHarnessProps {
  activeModuleId: string;
  activePageHref: string;
}

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();

  return {
    ...actual,
    Link: ({ children, to, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to?: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useNavigate: () => vi.fn(),
    useParams: () => ({ einsatzId: 'einsatz-1' }),
    useRouter: () => ({
      history: {
        location: {
          pathname: '/app/einsatz/einsatz-1/übersicht',
        },
      },
      state: {
        location: {
          pathname: '/app/einsatz/einsatz-1/übersicht',
        },
        resolvedLocation: {
          pathname: '/app/einsatz/einsatz-1/übersicht',
        },
      },
    }),
  };
});

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

vi.mock('@/features/einsatz', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/einsatz')>();

  return {
    ...actual,
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
  };
});

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

function OverviewWorkspaceHarness({ activeModuleId, activePageHref }: OverviewWorkspaceHarnessProps) {
  return (
    <WorkspaceShell
      contextBar={overviewContextBar}
      modules={EINSATZ_WORKSPACE_MODULES}
      activeModuleId={activeModuleId}
      activePageHref={activePageHref}
      routeParams={{ einsatzId: 'einsatz-1' }}
      statusItems={overviewStatusItems}
    >
      {activeModuleId === 'übersicht' ? (
        <SingleEinsatzDashboard />
      ) : (
        <section aria-label="Führungsarbeitsbereich" className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h1 className="font-semibold text-lg">Führungsarbeitsbereich</h1>
          <p className="mt-2 text-sm">ETB und Befehle bleiben aktiv, bis in den Überblick gewechselt wird.</p>
        </section>
      )}
    </WorkspaceShell>
  );
}

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

  it('liefert einen P95-Gate-Report für den nutzbaren Überblickszustand nach Modulwechsel mit 100 Überblicksobjekten', async () => {
    const samples = await runIterations({
      iterations: RING_2_PERFORMANCE_THRESHOLDS.iterations,
      measure: async () => {
        const result = renderWithProviders(<OverviewWorkspaceHarness activeModuleId="führung" activePageHref="/app/einsatz/$einsatzId/führung/etb" />);

        try {
          expect(screen.getByRole('heading', { name: 'Führungsarbeitsbereich' })).toBeInTheDocument();

          return await measureInteractionCycle(
            async () => {
              await act(async () => {
                result.rerender(<OverviewWorkspaceHarness activeModuleId="übersicht" activePageHref="/app/einsatz/$einsatzId/übersicht" />);
              });
            },
            async () => {
              await waitFor(() => {
                expect(screen.getByRole('heading', { name: 'Schnellzugriffe' })).toBeInTheDocument();
                expect(screen.getByRole('region', { name: 'Workspace-Status' })).toBeInTheDocument();
              });

              const workspaceStatus = screen.getByRole('region', { name: 'Workspace-Status' });

              expect(within(workspaceStatus).getByText('Überblicksobjekte')).toBeInTheDocument();
              expect(within(workspaceStatus).getByText(String(overviewFixture.statusObjects.length))).toBeInTheDocument();
              expect(within(workspaceStatus).getByText(`${overviewFixture.fahrzeuge.length} Ressourcen · ${overviewFixture.pois.length} Ortsmarken`)).toBeInTheDocument();
              expect(within(workspaceStatus).getByText('Warnsignale')).toBeInTheDocument();
              expect(within(workspaceStatus).getByText(String(overviewWarningCount))).toBeInTheDocument();
              expect(screen.getAllByText(String(overviewFixture.fahrzeuge.length)).length).toBeGreaterThan(0);
              expect(screen.getAllByText(String(overviewFixture.pois.length)).length).toBeGreaterThan(0);
            },
          );
        } finally {
          result.unmount();
        }
      },
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
  }, 15000);
});
