import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EinsatzResponseDtoStatusEnum } from '@/shared';
import { EinsatzDashboard } from '../EinsatzDashboard';
import { resetDashboardState, resetEinsatzUIStore } from '@/features/einsatz';

const mockUseActiveEinsaetzeWithCounts = vi.fn();
const mockUseEinsatzStatusCounts = vi.fn();
const mockUseActiveEinsatz = vi.fn();
const mockRefetch = vi.fn();

vi.mock('@/features/einsatz', async () => {
  const actual = await vi.importActual<typeof import('@/features/einsatz')>('@/features/einsatz');

  return {
    ...actual,
    useActiveEinsaetzeWithCounts: (...args: unknown[]) => mockUseActiveEinsaetzeWithCounts(...args),
    useEinsatzStatusCounts: (...args: unknown[]) => mockUseEinsatzStatusCounts(...args),
    useActiveEinsatz: () => mockUseActiveEinsatz(),
  };
});

vi.mock('@/features/einsatz/ui/organisms/EinsatzCreateForm', () => ({
  EinsatzCreateForm: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="einsatz-create-form">Create Form</div> : null),
}));

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');

  return {
    ...actual,
    Link: ({ children, to, params, className, ...props }: Record<string, unknown>) => (
      <a
        href={to === '/app/einsatz/$einsatzId' ? `/app/einsatz/${String((params as { einsatzId: string } | undefined)?.einsatzId ?? '')}` : String(to)}
        data-param-einsatz-id={String((params as { einsatzId: string } | undefined)?.einsatzId ?? '')}
        data-to={String(to)}
        className={typeof className === 'string' ? className : undefined}
        {...props}
      >
        {children}
      </a>
    ),
  };
});

const einsatzFixture = {
  id: 'einsatz-1',
  nummer: 'E-2026-001',
  alarmstichwort: 'Wohnungsbrand',
  status: EinsatzResponseDtoStatusEnum.InBearbeitung,
  einsatzort: {
    ort: 'Musterstadt',
    strasse: 'Hauptstraße 1',
  },
  createdAt: '2026-03-12T08:00:00.000Z',
  etbEintraegeCount: 3,
  poisCount: 1,
};

function setupDashboardState(overrides?: {
  einsaetze?: (typeof einsatzFixture)[];
  isLoading?: boolean;
  error?: Error | null;
  total?: number;
  counts?: {
    angelegt: number;
    inBearbeitung: number;
    abgeschlossen: number;
    archiviert: number;
  };
  activeEinsatzId?: string | null;
  resumeStatus?: 'idle' | 'checking' | 'ready' | 'unavailable';
  resumeReason?: 'no-context' | 'invalid-context' | 'unauthorized' | 'storage-unavailable' | 'unknown' | null;
}) {
  mockUseActiveEinsaetzeWithCounts.mockReturnValue({
    data: overrides?.einsaetze ?? [einsatzFixture],
    isLoading: overrides?.isLoading ?? false,
    error: overrides?.error ?? null,
    refetch: mockRefetch,
  });

  mockUseEinsatzStatusCounts.mockReturnValue({
    total: overrides?.total ?? 1,
    counts: overrides?.counts ?? {
      angelegt: 0,
      inBearbeitung: 1,
      abgeschlossen: 0,
      archiviert: 0,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });

  mockUseActiveEinsatz.mockReturnValue({
    activeEinsatz: overrides?.activeEinsatzId ? { id: overrides.activeEinsatzId } : null,
    resumeStatus: overrides?.resumeStatus ?? (overrides?.activeEinsatzId ? 'ready' : 'idle'),
    resumeReason: overrides?.resumeReason ?? null,
  });
}

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EinsatzDashboard />
    </QueryClientProvider>,
  );
}

describe('EinsatzDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetDashboardState();
    resetEinsatzUIStore();
    setupDashboardState();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('zeigt einen klaren Ladezustand für die Einsatzauswahl', () => {
    setupDashboardState({
      einsaetze: [],
      isLoading: true,
      total: 0,
      counts: {
        angelegt: 0,
        inBearbeitung: 0,
        abgeschlossen: 0,
        archiviert: 0,
      },
    });

    renderDashboard();

    expect(screen.getByText(/einsatzauswahl wird geladen/i)).toBeInTheDocument();
    expect(screen.getByText(/arbeitskontext wird vorbereitet/i)).toBeInTheDocument();
  });

  it('bietet bei technischem Fehler einen verständlichen Retry an', () => {
    setupDashboardState({
      einsaetze: [],
      error: new Error('boom'),
      total: 0,
      counts: {
        angelegt: 0,
        inBearbeitung: 0,
        abgeschlossen: 0,
        archiviert: 0,
      },
    });

    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: /erneut laden/i }));

    expect(screen.getByText(/einsätze konnten nicht geladen werden/i)).toBeInTheDocument();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('trennt leeren Bestand von Filter-ohne-Treffer', async () => {
    renderDashboard();

    fireEvent.change(screen.getByPlaceholderText(/einsätze durchsuchen/i), {
      target: { value: 'xyz' },
    });

    await waitFor(() => {
      expect(screen.getByText(/keine treffer für die aktuelle auswahl/i)).toBeInTheDocument();
    });
  });

  it('zeigt einen eigenen Leerzustand, wenn keine Einsätze verfügbar sind', () => {
    setupDashboardState({
      einsaetze: [],
      total: 0,
      counts: {
        angelegt: 0,
        inBearbeitung: 0,
        abgeschlossen: 0,
        archiviert: 0,
      },
    });

    renderDashboard();

    expect(screen.getByText(/keine verfügbaren einsätze/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ersten einsatz erstellen/i })).toBeInTheDocument();
  });

  it('verlinkt Auswahlkarten direkt in den Workspace-Pfad', () => {
    renderDashboard();

    const link = screen.getByRole('link', {
      name: /einsatz e-2026-001 öffnen/i,
    });

    expect(link).toHaveAttribute('data-to', '/app/einsatz/$einsatzId');
    expect(link).toHaveAttribute('data-param-einsatz-id', 'einsatz-1');
    expect(screen.getByText(/öffnen/i)).toBeInTheDocument();
  });

  it('priorisiert den aktiven Arbeitskontext über eine eigene Wiedereinstiegsfläche', () => {
    setupDashboardState({
      activeEinsatzId: 'einsatz-1',
    });

    renderDashboard();

    expect(screen.getByText(/direkter wiedereinstieg öffnet den zuletzt genutzten arbeitsbereich/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /weiterarbeiten/i })).toHaveAttribute('data-to', '/app/einsatz/$einsatzId');
  });

  it('erklärt inline, wenn ein gespeicherter Kontext nicht mehr fortgesetzt werden kann', () => {
    setupDashboardState({
      resumeStatus: 'unavailable',
      resumeReason: 'unauthorized',
    });

    renderDashboard();

    expect(screen.getByText(/direkte fortsetzung ist gerade nicht möglich/i)).toBeInTheDocument();
    expect(screen.getByText(/nicht mehr verfügbar oder dein zugriff hat sich geändert/i)).toBeInTheDocument();
    expect(screen.getByText(/öffne einen bestehenden arbeitskontext oder starte einen neuen einsatz/i)).toBeInTheDocument();
  });

  it('stellt archiv-only als eigenen Zugriffskontext dar', () => {
    setupDashboardState({
      einsaetze: [],
      total: 2,
      counts: {
        angelegt: 0,
        inBearbeitung: 0,
        abgeschlossen: 0,
        archiviert: 2,
      },
    });

    renderDashboard();

    expect(screen.getByText(/aktuell sind nur archivierte einsätze verfügbar/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /archiv einblenden/i }).length).toBeGreaterThan(0);
  });
});
