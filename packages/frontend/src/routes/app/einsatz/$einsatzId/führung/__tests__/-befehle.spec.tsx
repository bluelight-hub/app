/**
 * Tests fuer Export-Button Conditional Rendering
 * in der BefehleSeite Route-Komponente.
 *
 * Verifiziert:
 * - Export-Button enabled wenn canExport = true
 * - Export-Button disabled mit aria-disabled wenn canExport = false
 * - Korrekter State waehrend isLoading = true
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import type { BefehlPermissions } from '@/features/befehl/hooks/use-befehl-permissions';

// ============================================
// Hoisted Variablen (verfuegbar in vi.mock Callbacks)
// ============================================
const { mockPermissions, captured, mockNavigate, mockUseParams, mockUseSearch } = vi.hoisted(() => ({
  mockPermissions: {
    canCreate: true,
    canQuittieren: false,
    canKorrigieren: true,
    canExport: true,
    canViewAll: true,
    isBeobachter: false,
    rolle: 'BEFEHLSGEBER',
    isLoading: false,
  } as BefehlPermissions,
  captured: { component: null as (() => React.JSX.Element) | null },
  mockNavigate: vi.fn(),
  mockUseParams: vi.fn(() => ({ einsatzId: 'einsatz-1' })),
  mockUseSearch: vi.fn(() => ({})),
}));

// ============================================
// Mocks (muessen vor Imports stehen)
// ============================================

// TanStack Router: createFileRoute abfangen + Link mocken
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    createFileRoute: (_path: string) => {
      return (options: { component: () => React.JSX.Element }) => {
        captured.component = options.component;
        // Route-Objekt das useParams/useSearch/useNavigate bereitstellt
        const route = {
          useParams: mockUseParams,
          useSearch: mockUseSearch,
          useNavigate: () => mockNavigate,
          options,
        };
        return route;
      };
    },
    Link: ({ children, to, ...props }: { children: React.ReactNode; to: string; [key: string]: unknown }) => (
      <a href={to} data-testid="router-link" {...props}>
        {children}
      </a>
    ),
  };
});

// useBefehlPermissions
vi.mock('@/features/befehl/hooks/use-befehl-permissions', () => ({
  useBefehlPermissions: () => mockPermissions,
}));

// useBefehlWebSocketStatus (WebSocket-Verbindung laeuft im SingleEinsatzLayout)
vi.mock('@/features/befehl/api/use-befehl-websocket', () => ({
  useBefehlWebSocketStatus: () => true,
}));

// useBefehleByEinsatz
vi.mock('@/features/befehl/api/use-befehle-by-einsatz', () => ({
  useBefehleByEinsatz: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

// View-Store
vi.mock('@/features/befehl/hooks/use-befehle-view-store', () => ({
  useBefehleView: () => ['tabelle', vi.fn()],
  setBefehleView: vi.fn(),
  toggleBefehleView: vi.fn(),
  useCurrentBefehleView: () => 'tabelle',
  befehleViewStore: { subscribe: vi.fn(() => vi.fn()), getState: () => ({ view: 'tabelle' }) },
}));

// Filter-Store
vi.mock('@/features/befehl/hooks/use-befehle-filter-store', () => ({
  useBefehleFilter: () => ({
    statusFilter: null,
    searchText: '',
    empfaengerName: null,
    befehlsgeberName: null,
    von: null,
    bis: null,
  }),
  useActiveFilterCount: () => 0,
  useHasActiveFilters: () => false,
  setStatusFilter: vi.fn(),
  setSearchText: vi.fn(),
  setEmpfaengerName: vi.fn(),
  setBefehlsgeberName: vi.fn(),
  setVon: vi.fn(),
  setBis: vi.fn(),
  resetBefehleFilter: vi.fn(),
  befehleFilterStore: { subscribe: vi.fn(() => vi.fn()), getState: () => ({}) },
}));

// toQueryFilters
vi.mock('@/features/befehl/api/queries', () => ({
  toQueryFilters: () => ({}),
  hasActiveQueryFilters: () => false,
  BEFEHL_QUERY_KEYS: { all: ['befehle'], meineBefehle: () => ['befehle', 'meine'] },
  calculateRetryDelay: () => 0,
}));

// useMeineBefehle
vi.mock('@/features/befehl/api/use-meine-befehle', () => ({
  useMeineBefehle: () => ({ data: undefined, isLoading: false, isError: false }),
}));

// useCurrentUser
vi.mock('@/features/auth/api', () => ({
  useCurrentUser: () => ({ user: { id: 'user-1', name: 'Test User' }, isLoading: false }),
}));

// Meine Befehle Filter
vi.mock('@/features/befehl/hooks/use-meine-befehle-filter', () => ({
  useMeineBefehleFilter: () => [false, vi.fn()],
  useShowMeineBefehle: () => false,
  useOffeneRueckfragenFilter: () => [false, vi.fn()],
  useShowOffeneRueckfragen: () => false,
  setShowMeineBefehle: vi.fn(),
  setShowOffeneRueckfragen: vi.fn(),
  toggleMeineBefehle: vi.fn(),
  toggleOffeneRueckfragen: vi.fn(),
  resetMeineBefehleFilterStore: vi.fn(),
  meineBefehleFilterStore: { subscribe: vi.fn(() => vi.fn()), getState: () => ({ showMeineBefehle: false, showOffeneRueckfragen: false }) },
}));

// extract-filter-options
vi.mock('@/features/befehl/lib/extract-filter-options', () => ({
  extractEmpfaengerNames: () => [],
  extractBefehlsgeberNames: () => [],
}));

// befehl-priority
vi.mock('@/features/befehl/lib/befehl-priority', () => ({
  getBefehlKritikalitaet: () => 'NORMAL',
  parseZeitvorgabe: () => null,
  isBefehlUeberfaellig: () => false,
  getSortWeight: () => 0,
  sortByPriority: (arr: unknown[]) => arr,
}));

// UI Kinder-Komponenten mocken um Tests zu isolieren
vi.mock('@/features/befehl/ui/organisms/BefehlDetailPanel.organism', () => ({
  BefehlDetailPanel: () => <div data-testid="befehl-detail-panel" />,
}));

vi.mock('@/features/befehl/ui/organisms/BefehlsListeMitEingabe.organism', () => ({
  BefehlsListeMitEingabe: () => <div data-testid="befehls-liste-mit-eingabe" />,
}));

vi.mock('@/features/befehl/ui/organisms/BefehlExportDialog.organism', () => ({
  BefehlExportDialog: () => <div data-testid="befehl-export-dialog" />,
}));

vi.mock('@/features/befehl/ui/organisms/BefehlKanbanView.organism', () => ({
  BefehlKanbanView: () => <div data-testid="befehl-kanban-view" />,
}));

vi.mock('@/features/befehl/ui/organisms/BefehlTabellenView.organism', () => ({
  BefehlTabellenView: () => <div data-testid="befehl-tabellen-view" />,
}));

vi.mock('@/features/befehl/ui/organisms/HandlungsbedarfSection.organism', () => ({
  HandlungsbedarfSection: () => <div data-testid="handlungsbedarf-section" />,
}));

vi.mock('@/features/befehl/ui/molecules/BefehlFilterRow.molecule', () => ({
  BefehlFilterRow: () => <div data-testid="befehl-filter-row" />,
}));

vi.mock('@/features/befehl/ui/molecules/BefehleViewToggle.molecule', () => ({
  BefehleViewToggle: () => <div data-testid="befehle-view-toggle" />,
}));

vi.mock('@/features/befehl/ui/molecules/BefehlCompactCard.molecule', () => ({
  BefehlCompactCard: () => <div data-testid="befehl-compact-card" />,
}));

vi.mock('@/features/befehl/ui/molecules/ConnectionStatusBanner.molecule', () => ({
  ConnectionStatusBanner: () => <div data-testid="connection-status-banner" />,
}));

vi.mock('@/features/befehl/ui/molecules/KritischeBefehleCounter.molecule', () => ({
  KritischeBefehleCounter: () => <div data-testid="kritische-befehle-counter" />,
}));

// useHandlungsbedarf mock
vi.mock('@/features/befehl/hooks/use-handlungsbedarf', () => ({
  useHandlungsbedarf: () => ({ kritisch: [], warnung: [], zuQuittieren: [], gesamtCount: 0, hatHandlungsbedarf: false }),
  getKritischGrund: () => 'ueberfaellig',
  getRueckfrageInfo: () => 'Rückfrage',
}));

// Tooltip-Mock: Rendert children + role="tooltip" fuer Assertions
vi.mock('@/shared/ui/atoms/tooltip.atom', () => ({
  Tooltip: ({ content, children }: { content: string; children: React.ReactNode }) => (
    <span data-testid="tooltip" title={content}>
      {children}
    </span>
  ),
}));

// cn utility (Pass-Through)
vi.mock('@/shared/ui/cn', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// ============================================
// Importiere Route-Datei (triggert createFileRoute-Aufruf)
// ============================================
// biome-ignore lint: dynamic import nach Mocks
import '../befehle';

/** Helper: Rendert die gecapturete BefehleSeite-Komponente */
function renderBefehleSeite() {
  if (!captured.component) {
    throw new Error('BefehleSeite component wurde nicht von createFileRoute erfasst');
  }
  const Component = captured.component;
  return renderWithProviders(<Component />);
}

// ============================================
// Test Suites
// ============================================

describe('BefehleSeite - Export-Button Conditional Rendering', () => {
  beforeEach(() => {
    // Reset zu BEFEHLSGEBER-Permissions (voller Zugriff)
    Object.assign(mockPermissions, {
      canCreate: true,
      canQuittieren: false,
      canKorrigieren: true,
      canExport: true,
      canViewAll: true,
      isBeobachter: false,
      rolle: 'BEFEHLSGEBER',
      isLoading: false,
    });
    mockNavigate.mockClear();
  });

  it('zeigt Export-Button enabled wenn canExport = true', () => {
    renderBefehleSeite();

    const exportButton = screen.getByRole('button', { name: /befehle exportieren/i });
    expect(exportButton).toBeInTheDocument();
    expect(exportButton).not.toBeDisabled();
    expect(exportButton).not.toHaveAttribute('aria-disabled');
  });

  it('zeigt Export-Button disabled mit aria-disabled wenn canExport = false', () => {
    Object.assign(mockPermissions, {
      canExport: false,
      rolle: 'BEOBACHTER',
    });

    renderBefehleSeite();

    const exportButton = screen.getByRole('button', { name: /befehle exportieren/i });
    expect(exportButton).toBeInTheDocument();
    expect(exportButton).toBeDisabled();
    expect(exportButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('zeigt Tooltip mit Berechtigungshinweis wenn canExport = false', () => {
    Object.assign(mockPermissions, {
      canExport: false,
      rolle: 'EMPFAENGER',
    });

    renderBefehleSeite();

    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveAttribute('title', expect.stringContaining('Ersteller/Befehlsgeber'));
  });

  it('zeigt keinen Tooltip wenn canExport = true', () => {
    renderBefehleSeite();

    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
  });

  it('zeigt unterschiedliche aria-labels fuer enabled vs disabled Export-Button', () => {
    // Enabled: "Befehle exportieren"
    renderBefehleSeite();
    const enabledButton = screen.getByRole('button', { name: /befehle exportieren$/i });
    expect(enabledButton).toHaveAttribute('aria-label', 'Befehle exportieren');
  });

  it('zeigt "keine Berechtigung" im aria-label wenn disabled', () => {
    Object.assign(mockPermissions, { canExport: false });

    renderBefehleSeite();

    const disabledButton = screen.getByRole('button', { name: /keine berechtigung/i });
    expect(disabledButton).toHaveAttribute('aria-label', 'Befehle exportieren (keine Berechtigung)');
  });
});

describe('BefehleSeite - Loading State', () => {
  beforeEach(() => {
    Object.assign(mockPermissions, {
      canCreate: false,
      canQuittieren: false,
      canKorrigieren: false,
      canExport: false,
      canViewAll: false,
      isBeobachter: false,
      rolle: null,
      isLoading: true,
    });
  });

  it('zeigt disabled Export-Button waehrend Permissions laden', () => {
    renderBefehleSeite();

    // Waehrend isLoading sind canExport false
    // => disabled Export-Button wird gerendert
    const exportButton = screen.getByRole('button', { name: /befehle exportieren/i });
    expect(exportButton).toBeDisabled();
    expect(exportButton).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('BefehleSeite - Kombinierte Szenarien', () => {
  beforeEach(() => {
    Object.assign(mockPermissions, {
      canCreate: true,
      canQuittieren: false,
      canKorrigieren: true,
      canExport: true,
      canViewAll: true,
      isBeobachter: false,
      rolle: 'BEFEHLSGEBER',
      isLoading: false,
    });
  });

  it('BEFEHLSGEBER sieht Export-Button', () => {
    renderBefehleSeite();

    // Export-Button aktiv
    const exportButton = screen.getByRole('button', { name: /^befehle exportieren$/i });
    expect(exportButton).not.toBeDisabled();
  });

  it('ERSTELLER sieht aktiven Export-Button', () => {
    Object.assign(mockPermissions, {
      canExport: true,
      rolle: 'ERSTELLER',
    });

    renderBefehleSeite();

    const exportButton = screen.getByRole('button', { name: /^befehle exportieren$/i });
    expect(exportButton).not.toBeDisabled();
  });

  it('EMPFAENGER sieht disabled Export-Button', () => {
    Object.assign(mockPermissions, {
      canCreate: false,
      canKorrigieren: false,
      canExport: false,
      canQuittieren: true,
      rolle: 'EMPFAENGER',
    });

    renderBefehleSeite();

    const exportButton = screen.getByRole('button', { name: /befehle exportieren/i });
    expect(exportButton).toBeDisabled();
  });

  it('BEOBACHTER sieht disabled Export-Button', () => {
    Object.assign(mockPermissions, {
      canCreate: false,
      canKorrigieren: false,
      canExport: false,
      isBeobachter: true,
      rolle: 'BEOBACHTER',
    });

    renderBefehleSeite();

    const exportButton = screen.getByRole('button', { name: /befehle exportieren/i });
    expect(exportButton).toBeDisabled();
  });
});
