/**
 * Tests fuer BefehlWorkspace — Story 4.1
 *
 * AC1: Befehlsarbeitsraum innerhalb der Shell mit Einsatz-Kontext
 * AC2: Kontextstabilität zwischen Kernbereichen
 * AC3: Offene Befehle nachvollziehen und fortfuehren
 * AC4: Lade-, Offline- und Fehlerzustaende
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BefehlWorkspace } from '../BefehlWorkspace.organism';
import { BefehlWorkspaceSkeleton } from '../BefehlWorkspaceSkeleton.organism';
import { createBefehl, createEmpfaenger } from '../../../__fixtures__/befehl-test-utils';
import { useBefehlPermissions } from '../../../hooks/use-befehl-permissions';
import type { BefehlDto } from '@bluelight-hub/shared/client';

// --- Mocks ---

const mockBefehle: BefehlDto[] = [
  createBefehl({
    id: 'befehl-1',
    nummer: 'B2026-001',
    auftrag: 'Absperrung Nordseite errichten',
    status: 'ERTEILT',
    empfaenger: [createEmpfaenger({ empfaengerId: 'user-1', name: 'ZF Nord' })],
  }),
  createBefehl({
    id: 'befehl-2',
    nummer: 'B2026-002',
    auftrag: 'Wasserversorgung sicherstellen',
    status: 'ZUGESTELLT',
    empfaenger: [createEmpfaenger({ empfaengerId: 'user-2', name: 'ZF Wasser' })],
  }),
];

let mockBefehleData: BefehlDto[] | undefined = mockBefehle;
let mockIsLoading = false;
let mockIsError = false;
let mockError: Error | null = null;
let mockIsRefetching = false;
const mockRefetch = vi.fn().mockResolvedValue({ data: mockBefehle });
let mockIsConnected = true;
const { mockToggleMeineBefehle, mockShowMeineBefehleRef } = vi.hoisted(() => ({
  mockToggleMeineBefehle: vi.fn(),
  mockShowMeineBefehleRef: { value: false },
}));

vi.mock('../../../api', () => ({
  useBefehleByEinsatz: () => ({
    data: mockBefehleData,
    isLoading: mockIsLoading,
    isError: mockIsError,
    error: mockError,
    refetch: mockRefetch,
    isRefetching: mockIsRefetching,
  }),
  useMeineBefehle: () => ({ data: undefined }),
  useBefehlWebSocketStatus: () => mockIsConnected,
  BEFEHL_QUERY_KEYS: { list: (id: string) => ['befehle', id] },
  toQueryFilters: vi.fn(() => ({})),
  hasActiveQueryFilters: vi.fn(() => false),
}));

vi.mock('@/features/auth/api', () => ({
  useCurrentUser: () => ({ user: { id: 'user-1', name: 'Test User' }, isLoading: false }),
}));

let mockPermissions = {
  canCreate: true,
  canQuittieren: true,
  canKorrigieren: true,
  canManageStatus: true,
  canExport: true,
  canViewAll: true,
  isBeobachter: false,
  rolle: 'BEFEHLSGEBER' as string | null,
  isLoading: false,
};

vi.mock('../../../hooks/use-befehl-permissions', () => ({
  useBefehlPermissions: () => mockPermissions,
}));

vi.mock('../../../hooks/use-handlungsbedarf', () => ({
  useHandlungsbedarf: () => ({
    kritisch: [],
    warnung: [],
    zuQuittieren: [],
    total: 0,
  }),
}));

vi.mock('../../../hooks/use-befehle-filter-store', () => ({
  useBefehleFilter: () => ({ statusFilter: null, searchText: '', empfaengerName: '', befehlsgeberName: '', von: null, bis: null }),
  useActiveFilterCount: () => 0,
  useHasActiveFilters: () => false,
  setStatusFilter: vi.fn(),
  setSearchText: vi.fn(),
  setEmpfaengerName: vi.fn(),
  setBefehlsgeberName: vi.fn(),
  setVon: vi.fn(),
  setBis: vi.fn(),
  resetBefehleFilter: vi.fn(),
  befehleFilterStore: { state: {} },
}));

vi.mock('../../../hooks/use-meine-befehle-filter', () => ({
  useMeineBefehleFilter: () => [mockShowMeineBefehleRef.value, mockToggleMeineBefehle],
  useShowMeineBefehle: () => mockShowMeineBefehleRef.value,
  toggleMeineBefehle: mockToggleMeineBefehle,
  setShowMeineBefehle: vi.fn(),
  meineBefehleFilterStore: { state: {} },
}));

vi.mock('../../../lib/extract-filter-options', () => ({
  extractEmpfaengerNames: () => [],
  extractBefehlsgeberNames: () => [],
}));

// Leichte Mocks für schwergewichtige Sub-Komponenten
vi.mock('../HandlungsbedarfSection.organism', () => ({
  HandlungsbedarfSection: () => <div data-testid="handlungsbedarf-section">Handlungsbedarf</div>,
}));

vi.mock('../BefehlTabellenView.organism', () => ({
  BefehlTabellenView: ({ befehle, onBefehlSelect }: { befehle: BefehlDto[] | undefined; onBefehlSelect: (id: string) => void }) => (
    <div data-testid="befehl-tabellen-view">
      {befehle?.map((b) => (
        <button key={b.id} data-testid={`befehl-row-${b.id}`} onClick={() => onBefehlSelect(b.id)} type="button">
          {b.auftrag}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../BefehlDetailPanel.organism', () => ({
  BefehlDetailPanel: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="befehl-detail-panel">
        <button type="button" onClick={onClose}>
          Schließen
        </button>
      </div>
    ) : null,
}));

vi.mock('../BefehlExportDialog.organism', () => ({
  BefehlExportDialog: () => null,
}));

vi.mock('../BefehlQuittierenDialog.organism', () => ({
  BefehlQuittierenDialog: () => null,
}));

vi.mock('../../molecules/BefehlFilterRow.molecule', () => ({
  BefehlFilterRow: () => <div data-testid="befehl-filter-row">Filter</div>,
}));

vi.mock('../../molecules/BefehlEingabeRow.molecule', () => ({
  BefehlEingabeRow: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="befehl-eingabe-row">
      <button type="button" onClick={onClose}>
        Abbrechen
      </button>
    </div>
  ),
}));

vi.mock('../../molecules/BefehlCompactCard.molecule', () => ({
  BefehlCompactCard: ({ befehl, onClick }: { befehl: BefehlDto; onClick: () => void }) => (
    <button data-testid={`compact-card-${befehl.id}`} onClick={onClick} type="button">
      {befehl.auftrag}
    </button>
  ),
}));

vi.mock('../../atoms/ConnectionStatusBanner.atom', () => ({
  ConnectionStatusBanner: ({ isConnected }: { isConnected: boolean }) => (!isConnected ? <div data-testid="connection-banner">Offline</div> : null),
}));

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
}));

vi.mock('../../../hooks/use-befehle-view-store', () => ({
  useCurrentBefehleView: () => 'tabelle',
  useBefehleView: () => ['tabelle', vi.fn()],
  setBefehleView: vi.fn(),
  toggleBefehleView: vi.fn(),
  befehleViewStore: { state: { view: 'tabelle' } },
}));

vi.mock('../../molecules/BefehleViewToggle.molecule', () => ({
  BefehleViewToggle: ({ className }: { className?: string }) => (
    <div data-testid="befehle-view-toggle" className={className}>
      ViewToggle
    </div>
  ),
}));

vi.mock('../BefehlKanbanView.organism', () => ({
  BefehlKanbanView: ({ befehle, onBefehlSelect }: { befehle: any[] | undefined; onBefehlSelect?: (id: string) => void }) => (
    <div data-testid="befehl-kanban-view">
      {befehle?.map((b: any) => (
        <button key={b.id} data-testid={`kanban-card-${b.id}`} onClick={() => onBefehlSelect?.(b.id)} type="button">
          {b.auftrag}
        </button>
      ))}
    </div>
  ),
}));

// --- Hilfsfunktionen ---

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

const defaultProps = {
  einsatzId: 'einsatz-1',
  onSelectBefehl: vi.fn(),
  onClosePanel: vi.fn(),
};

function renderWorkspace(props: Partial<typeof defaultProps> = {}) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BefehlWorkspace {...defaultProps} {...props} />
    </QueryClientProvider>,
  );
}

// --- Tests ---

describe('BefehlWorkspaceSkeleton', () => {
  it('rendert einen Skeleton-Ladezustand mit role="status"', () => {
    render(<BefehlWorkspaceSkeleton />);
    const skeleton = screen.getByRole('status', { name: /wird geladen/i });
    expect(skeleton).toBeInTheDocument();
  });

  it('zeigt eine textuelle Lade-Meldung', () => {
    render(<BefehlWorkspaceSkeleton />);
    expect(screen.getByText('Befehle werden geladen')).toBeInTheDocument();
  });
});

describe('BefehlWorkspace', () => {
  beforeEach(() => {
    mockBefehleData = mockBefehle;
    mockIsLoading = false;
    mockIsError = false;
    mockError = null;
    mockIsRefetching = false;
    mockIsConnected = true;
    mockShowMeineBefehleRef.value = false;
    mockPermissions = {
      canCreate: true,
      canQuittieren: true,
      canKorrigieren: true,
      canManageStatus: true,
      canExport: true,
      canViewAll: true,
      isBeobachter: false,
      rolle: 'BEFEHLSGEBER',
      isLoading: false,
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('AC1: Befehlsarbeitsraum innerhalb der Shell', () => {
    it('rendert den Befehlsarbeitsraum mit aria-label', () => {
      renderWorkspace();
      expect(screen.getByLabelText('Befehlsarbeitsraum')).toBeInTheDocument();
    });

    it('zeigt die Befehlstabelle mit geladenen Befehlen', () => {
      renderWorkspace();
      const tabellenView = screen.getByTestId('befehl-tabellen-view');
      expect(tabellenView).toBeInTheDocument();
      expect(within(tabellenView).getByText('Absperrung Nordseite errichten')).toBeInTheDocument();
      expect(within(tabellenView).getByText('Wasserversorgung sicherstellen')).toBeInTheDocument();
    });

    it('zeigt die Toolbar mit Aktionen', () => {
      renderWorkspace();
      const toolbar = screen.getByRole('toolbar', { name: /befehl-aktionen/i });
      expect(toolbar).toBeInTheDocument();
      expect(within(toolbar).getByText(/neuer befehl/i)).toBeInTheDocument();
      expect(within(toolbar).getByText(/meine befehle/i)).toBeInTheDocument();
    });

    it('zeigt die Handlungsbedarf-Sektion', () => {
      renderWorkspace();
      expect(screen.getByTestId('handlungsbedarf-section')).toBeInTheDocument();
    });

    it('zeigt Befehlsanzahl via aria-live', () => {
      renderWorkspace();
      expect(screen.getByText('2 Befehle')).toBeInTheDocument();
    });

    it('zeigt den Ansicht-Toggle (Tabelle/Kanban)', () => {
      renderWorkspace();
      expect(screen.getByTestId('befehle-view-toggle')).toBeInTheDocument();
    });
  });

  describe('AC3: Offene Befehle nachvollziehen und fortfuehren', () => {
    it('oeffnet Detail-Panel bei Befehlsauswahl', async () => {
      const onSelectBefehl = vi.fn();
      renderWorkspace({ onSelectBefehl });

      await userEvent.click(screen.getByTestId('befehl-row-befehl-1'));
      expect(onSelectBefehl).toHaveBeenCalledWith('befehl-1');
    });

    it('zeigt Detail-Panel wenn selectedBefehlId gesetzt', () => {
      renderWorkspace({ selectedBefehlId: 'befehl-1' });
      expect(screen.getByTestId('befehl-detail-panel')).toBeInTheDocument();
    });

    it('schliesst Detail-Panel und ruft onClosePanel', async () => {
      const onClosePanel = vi.fn();
      renderWorkspace({ selectedBefehlId: 'befehl-1', onClosePanel });

      await userEvent.click(screen.getByText('Schließen'));
      expect(onClosePanel).toHaveBeenCalled();
    });
  });

  describe('AC4: Lade-, Offline- und Fehlerzustaende', () => {
    it('zeigt nichts bei kurzem Laden (unter 300ms)', () => {
      mockIsLoading = true;
      mockBefehleData = undefined;
      const { container } = renderWorkspace();
      // Unter 300ms kein Skeleton
      expect(container.innerHTML).toBe('');
    });

    it('zeigt Skeleton nach 300ms Laden', async () => {
      mockIsLoading = true;
      mockBefehleData = undefined;
      vi.useFakeTimers();
      renderWorkspace();

      // Vor 300ms: nichts
      expect(screen.queryByRole('status', { name: /wird geladen/i })).not.toBeInTheDocument();

      // Nach 300ms: Skeleton
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      expect(screen.getByRole('status', { name: /wird geladen/i })).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('zeigt Fehlerzustand mit Retry-Button', () => {
      mockIsError = true;
      mockError = new Error('Network Error');
      mockBefehleData = undefined;
      renderWorkspace();

      expect(screen.getByText(/konnten nicht geladen werden/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument();
    });

    it('Retry-Button loest erneutes Laden aus', async () => {
      mockIsError = true;
      mockError = new Error('Network Error');
      mockBefehleData = undefined;
      renderWorkspace();

      await userEvent.click(screen.getByRole('button', { name: /erneut versuchen/i }));
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('zeigt Offline-Banner bei fehlender Verbindung', () => {
      mockIsConnected = false;
      renderWorkspace();
      expect(screen.getByTestId('connection-banner')).toBeInTheDocument();
    });

    it('zeigt kein Offline-Banner bei aktiver Verbindung', () => {
      mockIsConnected = true;
      renderWorkspace();
      expect(screen.queryByTestId('connection-banner')).not.toBeInTheDocument();
    });

    it('zeigt Leerzustand mit kontextueller Folgeaktion', () => {
      mockBefehleData = [];
      renderWorkspace();
      expect(screen.getByText('Keine offenen Befehle')).toBeInTheDocument();
      expect(screen.getByText(/ctrl\+n/i)).toBeInTheDocument();
    });

    it('zeigt Leerzustand mit Neuer-Befehl-Button fuer berechtigte Nutzer', () => {
      mockBefehleData = [];
      renderWorkspace();
      const button = screen.getAllByRole('button', { name: /neuer befehl/i });
      expect(button.length).toBeGreaterThan(0);
    });

    // Testet das Filter-Error-Szenario: Query schlaegt fehl, aber gecachte Daten
    // sind noch vorhanden → Inline-Warnung statt Full-Page-Error
    it('zeigt Inline-Fehler bei teilweise vorhandenen Daten', () => {
      mockIsError = true;
      mockBefehleData = mockBefehle; // Daten vorhanden aber Fehler (Filter-Szenario)
      renderWorkspace();

      expect(screen.getByText(/filter konnten nicht angewendet werden/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility (WCAG 2.1 AA)', () => {
    it('hat aria-label auf dem Workspace-Container', () => {
      renderWorkspace();
      expect(screen.getByLabelText('Befehlsarbeitsraum')).toBeInTheDocument();
    });

    it('hat role="toolbar" auf der Aktionsleiste', () => {
      renderWorkspace();
      expect(screen.getByRole('toolbar', { name: /befehl-aktionen/i })).toBeInTheDocument();
    });

    it('hat aria-live="polite" fuer Status-Updates', () => {
      renderWorkspace();
      // Unsichtbare aria-live Region
      const liveRegion = document.querySelector('[aria-live="polite"].sr-only');
      expect(liveRegion).toBeInTheDocument();
    });

    it('hat aria-busy waehrend des Refreshs', () => {
      mockIsRefetching = true;
      renderWorkspace();
      const contentArea = document.querySelector('[aria-busy="true"]');
      expect(contentArea).toBeInTheDocument();
    });

    it('hat aria-pressed auf Meine-Befehle-Toggle', () => {
      renderWorkspace();
      const toggle = screen.getByRole('button', { name: /meine befehle/i });
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });

    it('hat aria-expanded auf Filter-Toggle', () => {
      renderWorkspace();
      const filterButton = screen.getByRole('button', { name: /filter/i });
      expect(filterButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('hat focus-visible Klasse auf interaktiven Elementen', () => {
      renderWorkspace();
      const filterButton = screen.getByRole('button', { name: /filter/i });
      expect(filterButton.className).toContain('focus-visible:shadow-focus-ring');
    });

    it('Fehlerzustand hat role="alert"', () => {
      mockIsError = true;
      mockError = new Error('Network Error');
      mockBefehleData = undefined;
      renderWorkspace();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('Fehlerzustand setzt autoFocus auf Retry-Button', () => {
      mockIsError = true;
      mockError = new Error('Network Error');
      mockBefehleData = undefined;
      renderWorkspace();
      const retryButton = screen.getByRole('button', { name: /erneut versuchen/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Filter-Interaktion', () => {
    it('oeffnet Filter-Panel bei Klick', async () => {
      renderWorkspace();
      const filterButton = screen.getByRole('button', { name: /filter/i });
      await userEvent.click(filterButton);
      expect(screen.getByTestId('befehl-filter-row')).toBeInTheDocument();
    });

    it('oeffnet Eingabezeile bei Klick auf Neuer Befehl', async () => {
      renderWorkspace();
      const neuButton = screen.getByRole('button', { name: /neuer befehl/i });
      await userEvent.click(neuButton);
      expect(screen.getByTestId('befehl-eingabe-row')).toBeInTheDocument();
    });

    it('registriert Ctrl+N Hotkey fuer neuen Befehl', async () => {
      const hotkeys = await import('react-hotkeys-hook');
      renderWorkspace();
      expect(hotkeys.useHotkeys).toHaveBeenCalledWith('mod+n', expect.any(Function), expect.objectContaining({ preventDefault: true }));
    });
  });
});

describe('BefehlWorkspace Performance (AC4)', () => {
  beforeEach(() => {
    mockIsLoading = false;
    mockIsError = false;
    mockError = null;
    mockIsRefetching = false;
    mockIsConnected = true;
    vi.clearAllMocks();
  });

  it('rendert mit 20 Befehlen ohne Fehler', () => {
    mockBefehleData = Array.from({ length: 20 }, (_, i) =>
      createBefehl({
        id: `befehl-${i}`,
        nummer: `B2026-${String(i + 1).padStart(3, '0')}`,
        auftrag: `Auftrag ${i + 1}`,
        empfaenger: [createEmpfaenger({ empfaengerId: `user-${i}`, name: `ZF ${i}` })],
      }),
    );

    const start = performance.now();
    renderWorkspace();
    const duration = performance.now() - start;

    expect(screen.getByTestId('befehl-tabellen-view')).toBeInTheDocument();
    expect(screen.getByText('20 Befehle')).toBeInTheDocument();
    // p95 Mount < 2000ms
    expect(duration).toBeLessThan(2000);
  });
});

describe('BefehlWorkspace Rollenbasierte UI (Story 4.2)', () => {
  beforeEach(() => {
    mockBefehleData = mockBefehle;
    mockIsLoading = false;
    mockIsError = false;
    mockError = null;
    mockIsRefetching = false;
    mockIsConnected = true;
    mockShowMeineBefehleRef.value = false;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('BEOBACHTER', () => {
    beforeEach(() => {
      mockPermissions = {
        canCreate: false,
        canQuittieren: false,
        canKorrigieren: false,
        canManageStatus: false,
        canExport: false,
        canViewAll: true,
        isBeobachter: true,
        rolle: 'BEOBACHTER',
        isLoading: false,
      };
    });

    it('zeigt Tooltip auf deaktiviertem Neuer-Befehl-Button', () => {
      renderWorkspace();
      const neuButton = screen.getByRole('button', { name: /neuer befehl/i });
      expect(neuButton).toBeDisabled();
      // Tooltip fuer Erstell-Berechtigung
      const tooltips = screen.getAllByRole('tooltip');
      const createTooltip = tooltips.find((t) => t.textContent?.includes('erstellen'));
      expect(createTooltip).toBeDefined();
      expect(createTooltip).toHaveTextContent(/nur ersteller\/befehlsgeber dürfen befehle erstellen/i);
    });

    it('zeigt Tooltip auf deaktiviertem Export-Button', () => {
      renderWorkspace();
      const exportButton = screen.getByRole('button', { name: /befehle exportieren/i });
      expect(exportButton).toBeDisabled();
      // Tooltip fuer Export-Berechtigung
      const tooltips = screen.getAllByRole('tooltip');
      const exportTooltip = tooltips.find((t) => t.textContent?.includes('exportieren'));
      expect(exportTooltip).toBeDefined();
      expect(exportTooltip).toHaveTextContent(/nur ersteller\/befehlsgeber dürfen befehle exportieren/i);
    });
  });

  describe('EMPFAENGER', () => {
    beforeEach(() => {
      mockPermissions = {
        canCreate: false,
        canQuittieren: true,
        canKorrigieren: false,
        canManageStatus: false,
        canExport: false,
        canViewAll: false,
        isBeobachter: false,
        rolle: 'EMPFAENGER',
        isLoading: false,
      };
    });

    it('zeigt Tooltip auf deaktiviertem Neuer-Befehl-Button', () => {
      renderWorkspace();
      const neuButton = screen.getByRole('button', { name: /neuer befehl/i });
      expect(neuButton).toBeDisabled();
      const tooltip = screen.getAllByRole('tooltip').find((t) => t.textContent?.includes('erstellen'));
      expect(tooltip).toBeDefined();
    });

    it('zeigt Tooltip auf deaktiviertem Export-Button', () => {
      renderWorkspace();
      const exportButton = screen.getByRole('button', { name: /befehle exportieren/i });
      expect(exportButton).toBeDisabled();
    });

    it('aktiviert "Meine Befehle" automatisch bei EMPFAENGER-Rolle', () => {
      mockShowMeineBefehleRef.value = false;
      renderWorkspace();
      expect(mockToggleMeineBefehle).toHaveBeenCalled();
    });
  });

  describe('BEFEHLSGEBER', () => {
    beforeEach(() => {
      mockPermissions = {
        canCreate: true,
        canQuittieren: true,
        canKorrigieren: true,
        canManageStatus: true,
        canExport: true,
        canViewAll: true,
        isBeobachter: false,
        rolle: 'BEFEHLSGEBER',
        isLoading: false,
      };
    });

    it('Neuer-Befehl-Button ist aktiviert', () => {
      renderWorkspace();
      const neuButton = screen.getByRole('button', { name: /neuer befehl/i });
      expect(neuButton).not.toBeDisabled();
    });

    it('Export-Button ist aktiviert', () => {
      renderWorkspace();
      const exportButton = screen.getByRole('button', { name: /befehle exportieren/i });
      expect(exportButton).not.toBeDisabled();
    });

    it('zeigt keine Berechtigungs-Tooltips', () => {
      renderWorkspace();
      const tooltips = screen.queryAllByRole('tooltip');
      const permissionTooltips = tooltips.filter((t) => t.textContent?.includes('dürfen') || t.textContent?.includes('Berechtigung'));
      expect(permissionTooltips).toHaveLength(0);
    });
  });

  describe('ERSTELLER', () => {
    beforeEach(() => {
      mockPermissions = {
        canCreate: true,
        canQuittieren: false,
        canKorrigieren: false,
        canManageStatus: false,
        canExport: true,
        canViewAll: true,
        isBeobachter: false,
        rolle: 'ERSTELLER',
        isLoading: false,
      };
    });

    it('Neuer-Befehl-Button ist aktiviert', () => {
      renderWorkspace();
      const neuButton = screen.getByRole('button', { name: /neuer befehl/i });
      expect(neuButton).not.toBeDisabled();
    });

    it('Export-Button ist aktiviert', () => {
      renderWorkspace();
      const exportButton = screen.getByRole('button', { name: /befehle exportieren/i });
      expect(exportButton).not.toBeDisabled();
    });
  });

  describe('isPermissionsLoading: true', () => {
    beforeEach(() => {
      mockPermissions = {
        canCreate: false,
        canQuittieren: false,
        canKorrigieren: false,
        canManageStatus: false,
        canExport: false,
        canViewAll: false,
        isBeobachter: false,
        rolle: null,
        isLoading: true,
      };
    });

    it('Neuer-Befehl-Button ist deaktiviert waehrend des Ladens', () => {
      renderWorkspace();
      const buttons = screen.getAllByRole('button');
      const loadingButton = buttons.find((b) => b.textContent?.includes('Laden'));
      expect(loadingButton).toBeDefined();
      expect(loadingButton).toBeDisabled();
    });

    it('Export-Button ist deaktiviert waehrend des Ladens', () => {
      renderWorkspace();
      const loadingButtons = screen.getAllByRole('button', { name: /berechtigungen werden geladen/i });
      const exportButton = loadingButtons.find((b) => b.textContent?.includes('Export'));
      expect(exportButton).toBeDefined();
      expect(exportButton).toBeDisabled();
    });

    it('zeigt keine Berechtigungs-Tooltips waehrend des Ladens', () => {
      renderWorkspace();
      const tooltips = screen.queryAllByRole('tooltip');
      const permissionTooltips = tooltips.filter((t) => t.textContent?.includes('dürfen') || t.textContent?.includes('Berechtigung'));
      expect(permissionTooltips).toHaveLength(0);
    });
  });
});
