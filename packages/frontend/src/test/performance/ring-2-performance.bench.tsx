import type { BefehlDto } from '@bluelight-hub/shared/client';
import { EtbEntryList } from '@/features/etb/ui/organisms/EtbEntryList';
import { BefehlsListeMitEingabe } from '@/features/befehl/ui/organisms/BefehlsListeMitEingabe.organism';
import { renderWithProviders } from '@/test/utils';
import { bench, describe, vi } from 'vitest';
import { buildEtbEntries, buildOpenBefehle, buildOverviewDashboardFixture } from './ring-2-performance-fixtures';

const benchEntries = buildEtbEntries();
const benchAlleBefehle = buildOpenBefehle();

vi.mock('@/shared/hooks/useConfirm', () => ({
  useConfirm: () => vi.fn(async () => true),
}));

vi.mock('@/features/etb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/etb')>();

  return {
    ...actual,
    useDeleteEtbEntry: () => ({
      mutate: vi.fn(),
    }),
  };
});

vi.mock('@/features/auth', () => ({
  useUserNames: () => ({
    getUserName: () => 'Bench User',
  }),
}));

vi.mock('@/features/auth/api', () => ({
  useCurrentUser: () => ({
    user: { id: 'user-1', name: 'Bench User' },
    isLoading: false,
  }),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();

  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/features/befehl/api/use-befehle-by-einsatz', () => ({
  useBefehleByEinsatz: () => ({
    data: benchAlleBefehle,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/befehl/api/use-meine-befehle', () => ({
  useMeineBefehle: () => ({
    data: benchAlleBefehle.slice(0, 8),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/befehl/api/use-offene-rueckfragen', () => ({
  useOffeneRueckfragen: () => ({
    data: benchAlleBefehle.slice(0, 6),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/befehl/hooks/use-meine-befehle-filter', () => ({
  useMeineBefehleFilter: () => [false, vi.fn()] as const,
  useOffeneRueckfragenFilter: () => [false, vi.fn()] as const,
  setShowMeineBefehle: vi.fn(),
  setShowOffeneRueckfragen: vi.fn(),
}));

vi.mock('@/features/befehl/hooks/use-befehl-permissions', () => ({
  useBefehlPermissions: () => ({
    canCreate: true,
    canQuittieren: true,
    canManageStatus: true,
    canViewAll: true,
    isLoading: false,
  }),
}));

vi.mock('@/features/befehl/api/use-aendere-empfaenger-status', () => ({
  useAendereEmpfaengerStatus: () => ({
    mutate: vi.fn(),
  }),
}));

vi.mock('@/features/befehl/lib/befehl-utils', () => ({
  getOffeneRueckfragenCount: (befehl: BefehlDto) => (befehl.auftrag.includes('Rückfrage') ? 1 : 0),
}));

vi.mock('@/features/befehl/api/use-integration-status', () => ({
  useDegradedIntegrations: () => [],
}));

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
}));

vi.mock('@/features/befehl/ui/molecules/BefehlEingabeRow.molecule', () => ({
  BefehlEingabeRow: () => <div data-testid="befehl-eingabe-row" />,
}));

vi.mock('@/features/befehl/ui/molecules/BefehlKarte.molecule', () => ({
  BefehlKarte: ({ nummer }: { nummer: string }) => <div>{nummer}</div>,
}));

vi.mock('@/features/befehl/ui/organisms/BefehlQuittierenDialog.organism', () => ({
  BefehlQuittierenDialog: () => null,
}));

function OverviewBenchmarkHarness() {
  const fixture = buildOverviewDashboardFixture();

  return (
    <section aria-label="Überblick Benchmark">
      <h1>Überblick</h1>
      <div>
        {fixture.statusObjects.map((item) => (
          <article key={item.id}>
            <h2>{item.label}</h2>
            <p>{item.state}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function EtbBenchmarkHarness() {
  return <EtbEntryList entries={benchEntries} einsatzId="einsatz-1" etbId="etb-1" isLoading={false} enableInlineEdit={false} sortBy="sequenceNumber" sortOrder="desc" />;
}

function BefehleBenchmarkHarness() {
  return <BefehlsListeMitEingabe einsatzId="einsatz-1" />;
}

describe('Ring-2 Performance Benchmarks', () => {
  bench(
    'overview proxy baseline render',
    () => {
      const result = renderWithProviders(<OverviewBenchmarkHarness />);
      result.unmount();
    },
    { iterations: 30, warmupIterations: 2 },
  );

  bench(
    'etb anchor render baseline',
    () => {
      const result = renderWithProviders(<EtbBenchmarkHarness />);
      result.unmount();
    },
    { iterations: 30, warmupIterations: 2 },
  );

  bench(
    'befehle anchor render baseline',
    () => {
      const result = renderWithProviders(<BefehleBenchmarkHarness />);
      result.unmount();
    },
    { iterations: 30, warmupIterations: 2 },
  );
});
