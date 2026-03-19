import { SingleEinsatzDashboard } from '@/features/einsatz/ui/organisms/SingleEinsatzDashboard';
import { EINSATZ_WORKSPACE_MODULES, WorkspaceShell, type WorkspaceContextBarModel, type WorkspaceStatusItem } from '@/features/workspace';
import { createStructuredPerformanceReport, formatStructuredPerformanceReport, measureInteractionCycle, runIterations } from '@/test/performance/ring-2-performance-metrics';
import { RING_2_PERFORMANCE_SCENARIOS, RING_2_PERFORMANCE_THRESHOLDS, buildOverviewDashboardFixture } from '@/test/performance/ring-2-performance-fixtures';
import { act, renderWithProviders, screen, waitFor, within } from '@/test/utils';
import type { AnchorHTMLAttributes } from 'react';
import { PiPulse, PiWarning } from 'react-icons/pi';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSetActiveEinsatz, mockIsWorkspaceRouteAccessible, mockOverviewState } = vi.hoisted(() => ({
  mockSetActiveEinsatz: vi.fn(),
  mockIsWorkspaceRouteAccessible: vi.fn(() => true),
  mockOverviewState: {
    isLoading: false,
    isFetching: false,
    error: null as Error | null,
    einsatz: undefined as unknown,
    etb: undefined as unknown,
    lagekarte: undefined as unknown,
    fahrzeuge: [] as unknown[],
    isLoadingFahrzeuge: false,
    isFetchingFahrzeuge: false,
  },
}));

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

interface OverviewWorkspaceHarnessProps {
  activeModuleId: string;
  activePageHref: string;
}

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();

  return {
    ...actual,
    Link: ({ children, to, search, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to?: string; search?: unknown }) => (
      <a href={to} data-preserves-search={typeof search === 'function' ? 'true' : undefined} {...props}>
        {children}
      </a>
    ),
    useParams: () => ({ einsatzId: 'einsatz-1' }),
    useRouter: () => ({
      isServer: false,
      options: {},
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

vi.mock('@/features/auth/api/use-users', () => ({
  useUserNames: () => ({
    getUserName: (id: string) => `TestUser-${id.slice(0, 4)}`,
    getUserNames: (ids: string | string[]) => (typeof ids === 'string' ? `TestUser-${ids.slice(0, 4)}` : ids.map((id) => `TestUser-${id.slice(0, 4)}`)),
    userMap: new Map(),
  }),
}));

vi.mock('@/features/workspace', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/workspace')>();

  return {
    ...actual,
    isWorkspaceRouteAccessible: mockIsWorkspaceRouteAccessible,
  };
});

vi.mock('@/features/einsatz', () => ({
  FMS_STATUS_LABELS: {
    3: 'Einsatzbereit auf Wache',
    4: 'Ankunft an Einsatzstelle',
  },
  useActiveEinsatz: () => ({
    activeEinsatz: null,
    setActiveEinsatz: mockSetActiveEinsatz,
    isEinsatzActive: false,
  }),
  useEinsatzDetails: () => ({
    einsatz: mockOverviewState.einsatz,
    etb: mockOverviewState.etb,
    lagekarte: mockOverviewState.lagekarte,
    isLoading: mockOverviewState.isLoading,
    isFetching: mockOverviewState.isFetching,
    error: mockOverviewState.error,
    data: undefined,
  }),
  useEinsatzFahrzeuge: () => ({
    data: mockOverviewState.fahrzeuge,
    isLoading: mockOverviewState.isLoadingFahrzeuge,
    isFetching: mockOverviewState.isFetchingFahrzeuge,
  }),
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
    vi.useRealTimers();
    vi.clearAllMocks();
    mockIsWorkspaceRouteAccessible.mockReturnValue(true);

    Object.assign(mockOverviewState, {
      isLoading: false,
      isFetching: false,
      error: null,
      einsatz: {
        ...overviewFixture.einsatz,
        createdAt: new Date(overviewFixture.einsatz.createdAt),
        einsatzort: {
          strasse: 'Musterstraße',
          hausnummer: '7',
          plz: '12345',
          ort: 'Teststadt',
        },
      },
      etb: {
        id: 'etb-1',
        einsatzId: 'einsatz-1',
        status: 'ACTIVE',
        eintraege: overviewFixture.etbEntries,
        version: {},
        createdAt: new Date('2026-03-16T11:45:00.000Z'),
      },
      lagekarte: {
        id: 'lage-1',
        einsatzId: 'einsatz-1',
        pois: overviewFixture.pois,
        createdAt: new Date('2026-03-16T11:50:00.000Z'),
      },
      fahrzeuge: overviewFixture.fahrzeuge.map((fahrzeug) => ({
        ...fahrzeug,
        einsatzId: 'einsatz-1',
        fahrzeugtypId: 'typ-1',
        createdAt: '2026-03-16T11:45:00.000Z',
        updatedAt: '2026-03-16T11:50:00.000Z',
        createdBy: 'user-1',
        fahrzeugtyp: {},
      })),
      isLoadingFahrzeuge: false,
      isFetchingFahrzeuge: false,
    });
  });

  it('zeigt beim Überblick ein textliches Ladefeedback sofort an', () => {
    mockOverviewState.isLoading = true;

    renderWithProviders(<SingleEinsatzDashboard />);

    expect(screen.getByRole('status')).toHaveTextContent('Lade priorisierte Lageübersicht...');
  });

  it('zeigt textliches Aktualisierungsfeedback für verzögerte Refreshes nach 300 Millisekunden', () => {
    vi.useFakeTimers();
    mockOverviewState.isFetching = true;

    renderWithProviders(<SingleEinsatzDashboard />);

    expect(screen.queryByText(/Lageübersicht wird aktualisiert/i)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText(/Lageübersicht wird aktualisiert/i)).toBeInTheDocument();
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
                expect(screen.getByRole('region', { name: 'Einsatz-Dashboard' })).toBeInTheDocument();
                expect(screen.getByRole('region', { name: 'Workspace-Status' })).toBeInTheDocument();
              });

              const workspaceStatus = screen.getByRole('region', { name: 'Workspace-Status' });
              const dashboardRegion = screen.getByRole('region', { name: 'Einsatz-Dashboard' });

              expect(within(workspaceStatus).getByText('Überblicksobjekte')).toBeInTheDocument();
              expect(within(workspaceStatus).getByText(String(overviewFixture.statusObjects.length))).toBeInTheDocument();
              expect(within(workspaceStatus).getByText(`${overviewFixture.fahrzeuge.length} Ressourcen · ${overviewFixture.pois.length} Ortsmarken`)).toBeInTheDocument();
              expect(within(workspaceStatus).getByText('Warnsignale')).toBeInTheDocument();
              expect(within(workspaceStatus).getByText(String(overviewWarningCount))).toBeInTheDocument();
              expect(within(dashboardRegion).getByRole('heading', { name: 'Lagebild' })).toBeInTheDocument();
              expect(within(dashboardRegion).getByRole('heading', { name: 'Direktzugriffe' })).toBeInTheDocument();
              expect(screen.getByRole('heading', { name: 'Einsatzinformationen' })).toBeInTheDocument();
              expect(screen.getByRole('heading', { name: 'Ressourcenlage' })).toBeInTheDocument();
              expect(within(dashboardRegion).getByRole('img', { name: 'ETB-Aktivität' })).toBeInTheDocument();
              expect(screen.getByRole('img', { name: 'Ressourcenverteilung' })).toBeInTheDocument();
              expect(screen.getByText(String(overviewFixture.etbEntries.length))).toBeInTheDocument();
              expect(screen.getAllByText(`${overviewFixture.pois.length} Ortsmarken`).length).toBeGreaterThan(0);
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
  }, 30000);
});
