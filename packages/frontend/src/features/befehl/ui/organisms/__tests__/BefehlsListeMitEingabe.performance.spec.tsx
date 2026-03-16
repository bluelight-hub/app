import type { BefehlDto } from '@bluelight-hub/shared/client';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/test/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BefehlsListeMitEingabe } from '../BefehlsListeMitEingabe.organism';
import { RING_2_PERFORMANCE_SCENARIOS, RING_2_PERFORMANCE_THRESHOLDS, buildOpenBefehle } from '@/test/performance/ring-2-performance-fixtures';
import { createStructuredPerformanceReport, formatStructuredPerformanceReport, measureInteractionCycle, measureRenderCycle, runIterations } from '@/test/performance/ring-2-performance-metrics';

const mockNavigate = vi.fn();
const mockStatusMutate = vi.fn();

let initialShowMeineBefehle = false;
let initialShowOffeneRueckfragen = false;
let mockAlleIsLoading = false;
let mockMeineIsLoading = false;
let mockRueckfragenIsLoading = false;
let mockDegradedIntegrations: Array<{ serviceName: string }> = [];
let mockAlleBefehle: BefehlDto[] | undefined;
let mockMeineBefehle: BefehlDto[] | undefined;
let mockRueckfragenBefehle: BefehlDto[] | undefined;

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/features/auth/api', () => ({
  useCurrentUser: () => ({
    user: { id: 'user-1', name: 'Test User' },
    isLoading: false,
  }),
}));

vi.mock('../../../api/use-befehle-by-einsatz', () => ({
  useBefehleByEinsatz: () => ({
    data: mockAlleBefehle,
    isLoading: mockAlleIsLoading,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../../api/use-meine-befehle', () => ({
  useMeineBefehle: () => ({
    data: mockMeineBefehle,
    isLoading: mockMeineIsLoading,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../../api/use-offene-rueckfragen', () => ({
  useOffeneRueckfragen: () => ({
    data: mockRueckfragenBefehle,
    isLoading: mockRueckfragenIsLoading,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../../hooks/use-meine-befehle-filter', async () => {
  const React = await import('react');

  return {
    useMeineBefehleFilter: () => {
      const [showMeineBefehle, setShowMeineBefehle] = React.useState(initialShowMeineBefehle);
      return [showMeineBefehle, () => setShowMeineBefehle((current) => !current)] as const;
    },
    useOffeneRueckfragenFilter: () => {
      const [showOffeneRueckfragen, setShowOffeneRueckfragen] = React.useState(initialShowOffeneRueckfragen);
      return [showOffeneRueckfragen, () => setShowOffeneRueckfragen((current) => !current)] as const;
    },
    setShowMeineBefehle: vi.fn(),
    setShowOffeneRueckfragen: vi.fn(),
  };
});

vi.mock('../../../hooks/use-befehl-permissions', () => ({
  useBefehlPermissions: () => ({
    canCreate: true,
    canQuittieren: true,
    canManageStatus: true,
    canViewAll: true,
    isLoading: false,
  }),
}));

vi.mock('../../../api/use-aendere-empfaenger-status', () => ({
  useAendereEmpfaengerStatus: () => ({
    mutate: mockStatusMutate,
  }),
}));

vi.mock('../../../lib/befehl-utils', () => ({
  getOffeneRueckfragenCount: (befehl: BefehlDto) => (befehl.auftrag.includes('Rückfrage') ? 1 : 0),
}));

vi.mock('../../../api/use-integration-status', () => ({
  useDegradedIntegrations: () => mockDegradedIntegrations,
}));

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
}));

vi.mock('../../molecules/BefehlEingabeRow.molecule', () => ({
  BefehlEingabeRow: () => <div data-testid="befehl-eingabe-row" />,
}));

vi.mock('../../molecules/BefehlKarte.molecule', () => ({
  BefehlKarte: ({ nummer }: { nummer: string }) => <div>{nummer}</div>,
}));

vi.mock('../BefehlQuittierenDialog.organism', () => ({
  BefehlQuittierenDialog: () => null,
}));

function createBefehlSubset(amount: number, labelPrefix: string): BefehlDto[] {
  return buildOpenBefehle(amount).map((befehl, index) => ({
    ...befehl,
    nummer: `${labelPrefix}-${String(index + 1).padStart(2, '0')}`,
    auftrag: index % 2 === 0 ? `${befehl.auftrag} Rückfrage` : befehl.auftrag,
  }));
}

describe('BefehlsListeMitEingabe Performance-Gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initialShowMeineBefehle = false;
    initialShowOffeneRueckfragen = false;
    mockAlleIsLoading = false;
    mockMeineIsLoading = false;
    mockRueckfragenIsLoading = false;
    mockDegradedIntegrations = [];
    mockAlleBefehle = createBefehlSubset(20, 'ALLE');
    mockMeineBefehle = createBefehlSubset(8, 'MEINE');
    mockRueckfragenBefehle = createBefehlSubset(6, 'RUECK');
  });

  it('zeigt bei verzögerter Befehlsabfrage sofort einen textlichen Status an', () => {
    mockAlleIsLoading = true;

    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" />);

    expect(screen.getByRole('status', { name: 'Befehle werden geladen' })).toBeInTheDocument();
  });

  it('zeigt degradierte Integrationen mit bestehender Produktstatusfläche an', () => {
    mockDegradedIntegrations = [{ serviceName: 'etb' }];

    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" />);

    expect(screen.getByText('Eingeschraenkte Verfuegbarkeit')).toBeInTheDocument();
    expect(screen.getByText(/ETB-Integration/)).toBeInTheDocument();
  });

  it('liefert einen P95-Gate-Report für den nutzbaren Befehlszustand mit 20 offenen Befehlen', async () => {
    const samples = await runIterations({
      iterations: RING_2_PERFORMANCE_THRESHOLDS.iterations,
      measure: () =>
        measureRenderCycle(
          () => renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" />),
          async () => {
            expect(screen.getByLabelText('Befehlsliste')).toBeInTheDocument();
          },
        ),
    });

    const report = createStructuredPerformanceReport({
      scenario: RING_2_PERFORMANCE_SCENARIOS.befehle.id,
      metric: 'usable-state',
      thresholdMs: RING_2_PERFORMANCE_THRESHOLDS.usableStateP95Ms,
      samples,
      device: 'Desktop >= 1024px',
      browser: 'Chrome 146',
      requiredPassRate: RING_2_PERFORMANCE_THRESHOLDS.requiredPassRate,
    });

    console.info(formatStructuredPerformanceReport(report));

    expect(report.pass).toBe(true);
  });

  it('reagiert auf Filterwechsel innerhalb des 200-ms-Gates', async () => {
    const samples = await runIterations({
      iterations: RING_2_PERFORMANCE_THRESHOLDS.iterations,
      measure: async () => {
        const renderResult = renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" />);

        try {
          const toggleButton = screen.getByRole('button', { name: /Meine Befehle/i });

          return await measureInteractionCycle(
            () => {
              fireEvent.click(toggleButton);
            },
            async () => {
              await waitFor(() => {
                expect(screen.getByLabelText('Meine Befehlsliste')).toBeInTheDocument();
              });
            },
          );
        } finally {
          renderResult.unmount();
        }
      },
    });

    const report = createStructuredPerformanceReport({
      scenario: RING_2_PERFORMANCE_SCENARIOS.befehle.id,
      metric: 'interaction-feedback',
      thresholdMs: RING_2_PERFORMANCE_THRESHOLDS.interactionFeedbackMs,
      samples,
      device: 'Desktop >= 1024px',
      browser: 'Chrome 146',
      requiredPassRate: RING_2_PERFORMANCE_THRESHOLDS.requiredPassRate,
    });

    console.info(formatStructuredPerformanceReport(report));

    expect(report.pass).toBe(true);
  });
});
