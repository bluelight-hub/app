/**
 * Tests fuer Export-Button und Metriken-Link Conditional Rendering
 * in der BefehleSeite Route-Komponente.
 *
 * Verifiziert:
 * - Export-Button enabled wenn canExport = true
 * - Export-Button disabled mit aria-disabled wenn canExport = false
 * - Metriken-Link sichtbar wenn canViewMetriken = true
 * - Metriken-Link nicht gerendert wenn canViewMetriken = false
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
    canViewMetriken: true,
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

// useBefehlNotifications
vi.mock('@/features/befehl/api/use-befehl-notifications', () => ({
  useBefehlNotifications: () => ({
    onBefehlErstellt: vi.fn(),
    onBefehlQuittiert: vi.fn(),
  }),
}));

// useBefehlWebSocket
vi.mock('@/features/befehl/api/use-befehl-websocket', () => ({
  useBefehlWebSocket: () => ({ isConnected: true }),
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
  BEFEHL_QUERY_KEYS: { all: ['befehle'] },
  calculateRetryDelay: () => 0,
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

vi.mock('@/features/befehl/ui/organisms/BefehlExportDialog.organism', () => ({
  BefehlExportDialog: () => <div data-testid="befehl-export-dialog" />,
}));

vi.mock('@/features/befehl/ui/organisms/BefehlKanbanView.organism', () => ({
  BefehlKanbanView: () => <div data-testid="befehl-kanban-view" />,
}));

vi.mock('@/features/befehl/ui/organisms/BefehlTabellenView.organism', () => ({
  BefehlTabellenView: () => <div data-testid="befehl-tabellen-view" />,
}));

vi.mock('@/features/befehl/ui/molecules/BefehlFilterRow.molecule', () => ({
  BefehlFilterRow: () => <div data-testid="befehl-filter-row" />,
}));

vi.mock('@/features/befehl/ui/molecules/BefehleViewToggle.molecule', () => ({
  BefehleViewToggle: () => <div data-testid="befehle-view-toggle" />,
}));

vi.mock('@/features/befehl/ui/molecules/ConnectionStatusBanner.molecule', () => ({
  ConnectionStatusBanner: () => <div data-testid="connection-status-banner" />,
}));

vi.mock('@/features/befehl/ui/molecules/KritischeBefehleCounter.molecule', () => ({
  KritischeBefehleCounter: () => <div data-testid="kritische-befehle-counter" />,
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
      canViewMetriken: true,
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

describe('BefehleSeite - Metriken-Link Conditional Rendering', () => {
  beforeEach(() => {
    Object.assign(mockPermissions, {
      canCreate: true,
      canQuittieren: false,
      canKorrigieren: true,
      canExport: true,
      canViewMetriken: true,
      canViewAll: true,
      isBeobachter: false,
      rolle: 'BEFEHLSGEBER',
      isLoading: false,
    });
  });

  it('zeigt Metriken-Link wenn canViewMetriken = true', () => {
    renderBefehleSeite();

    const metrikenLink = screen.getByText('Metriken');
    expect(metrikenLink).toBeInTheDocument();
    // Pruefe dass es ein Link ist (gerendert als <a> durch Mock)
    const linkElement = metrikenLink.closest('a');
    expect(linkElement).toHaveAttribute('href', '/app/einsaetze/metriken');
  });

  it('zeigt keinen Metriken-Link wenn canViewMetriken = false', () => {
    Object.assign(mockPermissions, {
      canViewMetriken: false,
      rolle: 'EMPFAENGER',
    });

    renderBefehleSeite();

    expect(screen.queryByText('Metriken')).not.toBeInTheDocument();
  });

  it('blendet Metriken-Link fuer ERSTELLER aus (nur BEFEHLSGEBER)', () => {
    Object.assign(mockPermissions, {
      canViewMetriken: false,
      canExport: true,
      rolle: 'ERSTELLER',
    });

    renderBefehleSeite();

    expect(screen.queryByText('Metriken')).not.toBeInTheDocument();
  });

  it('blendet Metriken-Link fuer BEOBACHTER aus', () => {
    Object.assign(mockPermissions, {
      canViewMetriken: false,
      canExport: false,
      isBeobachter: true,
      rolle: 'BEOBACHTER',
    });

    renderBefehleSeite();

    expect(screen.queryByText('Metriken')).not.toBeInTheDocument();
  });
});

describe('BefehleSeite - Loading State', () => {
  beforeEach(() => {
    Object.assign(mockPermissions, {
      canCreate: false,
      canQuittieren: false,
      canKorrigieren: false,
      canExport: false,
      canViewMetriken: false,
      canViewAll: false,
      isBeobachter: false,
      rolle: null,
      isLoading: true,
    });
  });

  it('zeigt disabled Export-Button waehrend Permissions laden', () => {
    renderBefehleSeite();

    // Waehrend isLoading sind canExport/canViewMetriken false
    // => disabled Export-Button wird gerendert
    const exportButton = screen.getByRole('button', { name: /befehle exportieren/i });
    expect(exportButton).toBeDisabled();
    expect(exportButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('zeigt keinen Metriken-Link waehrend Permissions laden', () => {
    renderBefehleSeite();

    // canViewMetriken ist false waehrend isLoading
    expect(screen.queryByText('Metriken')).not.toBeInTheDocument();
  });
});

describe('BefehleSeite - Kombinierte Szenarien', () => {
  beforeEach(() => {
    Object.assign(mockPermissions, {
      canCreate: true,
      canQuittieren: false,
      canKorrigieren: true,
      canExport: true,
      canViewMetriken: true,
      canViewAll: true,
      isBeobachter: false,
      rolle: 'BEFEHLSGEBER',
      isLoading: false,
    });
  });

  it('BEFEHLSGEBER sieht Export-Button und Metriken-Link', () => {
    renderBefehleSeite();

    // Export-Button aktiv
    const exportButton = screen.getByRole('button', { name: /^befehle exportieren$/i });
    expect(exportButton).not.toBeDisabled();

    // Metriken-Link sichtbar
    expect(screen.getByText('Metriken')).toBeInTheDocument();
  });

  it('ERSTELLER sieht aktiven Export-Button aber keinen Metriken-Link', () => {
    Object.assign(mockPermissions, {
      canExport: true,
      canViewMetriken: false,
      rolle: 'ERSTELLER',
    });

    renderBefehleSeite();

    const exportButton = screen.getByRole('button', { name: /^befehle exportieren$/i });
    expect(exportButton).not.toBeDisabled();
    expect(screen.queryByText('Metriken')).not.toBeInTheDocument();
  });

  it('EMPFAENGER sieht disabled Export-Button und keinen Metriken-Link', () => {
    Object.assign(mockPermissions, {
      canCreate: false,
      canKorrigieren: false,
      canExport: false,
      canViewMetriken: false,
      canQuittieren: true,
      rolle: 'EMPFAENGER',
    });

    renderBefehleSeite();

    const exportButton = screen.getByRole('button', { name: /befehle exportieren/i });
    expect(exportButton).toBeDisabled();
    expect(screen.queryByText('Metriken')).not.toBeInTheDocument();
  });

  it('BEOBACHTER sieht disabled Export-Button und keinen Metriken-Link', () => {
    Object.assign(mockPermissions, {
      canCreate: false,
      canKorrigieren: false,
      canExport: false,
      canViewMetriken: false,
      isBeobachter: true,
      rolle: 'BEOBACHTER',
    });

    renderBefehleSeite();

    const exportButton = screen.getByRole('button', { name: /befehle exportieren/i });
    expect(exportButton).toBeDisabled();
    expect(screen.queryByText('Metriken')).not.toBeInTheDocument();
  });
});
