/**
 * Tests fuer Deep-Link Recall — Story 4.3
 *
 * Task 6.3: Deep-Link Route Tests
 * Task 6.4: Integration: Cross-Context Recall
 * Task 6.5: Accessibility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BefehlWorkspace } from '../BefehlWorkspace.organism';
import { createBefehl, createEmpfaenger } from '../../../__fixtures__/befehl-test-utils';
import type { BefehlDto } from '@bluelight-hub/shared/client';

// --- Test-Daten ---

const mockBefehle: BefehlDto[] = [
  createBefehl({
    id: 'befehl-1',
    nummer: 'B2026-001',
    auftrag: 'Absperrung errichten',
    status: 'ERTEILT',
    empfaenger: [createEmpfaenger({ empfaengerId: 'user-1', name: 'ZF Nord' })],
  }),
  createBefehl({
    id: 'befehl-2',
    nummer: 'B2026-002',
    auftrag: 'Wasserversorgung',
    status: 'ZUGESTELLT',
    empfaenger: [createEmpfaenger({ empfaengerId: 'user-2', name: 'ZF Wasser' })],
  }),
];

// --- Mutable Mock-State ---

let mockBefehleData: BefehlDto[] | undefined = mockBefehle;
let mockIsLoading = false;
let mockIsError = false;
let mockError: Error | null = null;
let mockIsRefetching = false;
const mockRefetch = vi.fn().mockResolvedValue({ data: mockBefehle });
let mockIsConnected = true;

// --- vi.mock: API Layer ---

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

// --- vi.mock: Hooks ---

vi.mock('../../../hooks/use-befehl-permissions', () => ({
  useBefehlPermissions: () => ({
    canCreate: true,
    canQuittieren: true,
    canKorrigieren: true,
    canManageStatus: true,
    canExport: true,
    canViewAll: true,
    isBeobachter: false,
    rolle: 'BEFEHLSGEBER' as string | null,
    isLoading: false,
  }),
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
  useMeineBefehleFilter: () => [false, vi.fn()],
  useShowMeineBefehle: () => false,
  toggleMeineBefehle: vi.fn(),
  setShowMeineBefehle: vi.fn(),
  meineBefehleFilterStore: { state: {} },
}));

vi.mock('../../../hooks/use-befehle-view-store', () => ({
  useCurrentBefehleView: () => 'tabelle',
  useBefehleView: () => ['tabelle', vi.fn()],
  setBefehleView: vi.fn(),
  toggleBefehleView: vi.fn(),
  befehleViewStore: { state: { view: 'tabelle' } },
}));

vi.mock('../../../lib/extract-filter-options', () => ({
  extractEmpfaengerNames: () => [],
  extractBefehlsgeberNames: () => [],
}));

// --- vi.mock: Child Organisms ---

vi.mock('../HandlungsbedarfSection.organism', () => ({
  HandlungsbedarfSection: () => <div data-testid="handlungsbedarf-section">Handlungsbedarf</div>,
}));

vi.mock('../BefehlTabellenView.organism', () => ({
  BefehlTabellenView: ({ befehle, onBefehlSelect, selectedBefehlId }: { befehle: BefehlDto[] | undefined; onBefehlSelect: (id: string) => void; selectedBefehlId?: string }) => (
    <div data-testid="befehl-tabellen-view">
      {befehle?.map((b) => (
        <button key={b.id} id={`befehl-row-${b.id}`} data-testid={`befehl-row-${b.id}`} onClick={() => onBefehlSelect(b.id)} type="button" tabIndex={0} aria-selected={selectedBefehlId === b.id}>
          {b.auftrag}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../BefehlDetailPanel.organism', () => ({
  BefehlDetailPanel: ({ befehl, isOpen, onClose }: { befehl: BefehlDto | null; isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="befehl-detail-panel" role="complementary" aria-label={`Befehl ${befehl?.nummer ?? ''} Detail`}>
        <span>{befehl?.nummer}</span>
        <span>{befehl?.auftrag}</span>
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

vi.mock('../BefehlKanbanView.organism', () => ({
  BefehlKanbanView: () => <div data-testid="befehl-kanban-view" />,
}));

// --- vi.mock: Child Molecules ---

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

vi.mock('../../molecules/BefehleViewToggle.molecule', () => ({
  BefehleViewToggle: ({ className }: { className?: string }) => (
    <div data-testid="befehle-view-toggle" className={className}>
      ViewToggle
    </div>
  ),
}));

// --- vi.mock: Atoms ---

vi.mock('../../atoms/ConnectionStatusBanner.atom', () => ({
  ConnectionStatusBanner: ({ isConnected }: { isConnected: boolean }) => (!isConnected ? <div data-testid="connection-banner">Offline</div> : null),
}));

// --- vi.mock: Third-Party ---

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
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

interface WorkspaceOverrides {
  einsatzId?: string;
  selectedBefehlId?: string;
  onSelectBefehl?: ReturnType<typeof vi.fn>;
  onClosePanel?: ReturnType<typeof vi.fn>;
}

function renderWorkspace(overrides: WorkspaceOverrides = {}) {
  const defaultProps = {
    einsatzId: 'einsatz-1',
    onSelectBefehl: vi.fn(),
    onClosePanel: vi.fn(),
  };
  const props = { ...defaultProps, ...overrides };
  const queryClient = createQueryClient();
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <BefehlWorkspace {...props} />
      </QueryClientProvider>,
    ),
    props,
  };
}

// --- Tests ---

describe('Deep-Link Recall (Story 4.3)', () => {
  /** rAF-Callbacks sammeln fuer manuelle Ausfuehrung */
  let rafCallbacks: FrameRequestCallback[];
  let originalRAF: typeof requestAnimationFrame;
  let originalScrollIntoView: typeof Element.prototype.scrollIntoView;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBefehleData = mockBefehle;
    mockIsLoading = false;
    mockIsError = false;
    mockError = null;
    mockIsRefetching = false;
    mockIsConnected = true;

    rafCallbacks = [];
    originalRAF = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    }) as unknown as typeof requestAnimationFrame;

    originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRAF;
    Element.prototype.scrollIntoView = originalScrollIntoView;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** Alle gepufferten rAF-Callbacks ausfuehren */
  function flushRAF() {
    const cbs = [...rafCallbacks];
    rafCallbacks = [];
    for (const cb of cbs) {
      cb(performance.now());
    }
  }

  // ----- Task 6.3: Deep-Link Route Tests -----

  describe('Task 6.3: Deep-Link Route Tests', () => {
    describe('AC1: Befehl via URL aufrufen', () => {
      it('oeffnet Detail-Panel wenn selectedBefehlId gueltig', () => {
        renderWorkspace({ selectedBefehlId: 'befehl-1' });
        expect(screen.getByTestId('befehl-detail-panel')).toBeInTheDocument();
      });

      it('zeigt korrekten Befehl im Detail-Panel', () => {
        renderWorkspace({ selectedBefehlId: 'befehl-1' });
        const panel = screen.getByTestId('befehl-detail-panel');
        expect(panel).toHaveTextContent('B2026-001');
        expect(panel).toHaveTextContent('Absperrung errichten');
      });

      it('oeffnet Detail-Panel fuer zweiten Befehl', () => {
        renderWorkspace({ selectedBefehlId: 'befehl-2' });
        const panel = screen.getByTestId('befehl-detail-panel');
        expect(panel).toHaveTextContent('B2026-002');
        expect(panel).toHaveTextContent('Wasserversorgung');
      });
    });

    describe('Kein selectedBefehlId', () => {
      it('zeigt Standard-Workspace ohne Panel', () => {
        renderWorkspace();
        expect(screen.queryByTestId('befehl-detail-panel')).not.toBeInTheDocument();
      });

      it('zeigt Befehls-Tabelle im Standard-Modus', () => {
        renderWorkspace();
        expect(screen.getByTestId('befehl-tabellen-view')).toBeInTheDocument();
      });

      it('zeigt kein Fehlerzustand-Panel', () => {
        renderWorkspace();
        expect(screen.queryByText(/nicht mehr verfügbar/i)).not.toBeInTheDocument();
      });
    });

    describe('AC3: Fehlerzustand bei ungueltigem Befehl', () => {
      it('zeigt "nicht mehr verfuegbar" bei unbekannter befehlId', () => {
        renderWorkspace({ selectedBefehlId: 'non-existent' });
        expect(screen.getByText(/nicht mehr verfügbar/i)).toBeInTheDocument();
      });

      it('bietet Zurueck-zur-Uebersicht Aktion', () => {
        const onClosePanel = vi.fn();
        renderWorkspace({ selectedBefehlId: 'non-existent', onClosePanel });
        const button = screen.getByRole('button', { name: /zurück/i });
        expect(button).toBeInTheDocument();
      });

      it('ruft onClosePanel bei Klick auf Zurueck-Button', async () => {
        const user = userEvent.setup();
        const onClosePanel = vi.fn();
        renderWorkspace({ selectedBefehlId: 'non-existent', onClosePanel });
        const button = screen.getByRole('button', { name: /zurück/i });
        await user.click(button);
        expect(onClosePanel).toHaveBeenCalledOnce();
      });

      it('zeigt Erklaerungstext zu Loeschung oder fehlender Berechtigung', () => {
        renderWorkspace({ selectedBefehlId: 'non-existent' });
        expect(screen.getByText(/gelöscht|berechtigung/i)).toBeInTheDocument();
      });

      it('zeigt keinen Fehlerzustand wenn Daten noch laden', () => {
        mockIsLoading = true;
        mockBefehleData = undefined;
        vi.useFakeTimers();
        renderWorkspace({ selectedBefehlId: 'non-existent' });
        // Waehrend des Ladens: kein Fehlerzustand
        expect(screen.queryByText(/nicht mehr verfügbar/i)).not.toBeInTheDocument();
        vi.useRealTimers();
      });
    });
  });

  // ----- Task 6.4: Integration: Cross-Context Recall -----

  describe('Task 6.4: Integration: Cross-Context Recall', () => {
    it('selektierter Befehl ist in der Tabelle markiert', () => {
      renderWorkspace({ selectedBefehlId: 'befehl-1' });
      const row = screen.getByTestId('befehl-row-befehl-1');
      expect(row).toHaveAttribute('aria-selected', 'true');
    });

    it('nicht-selektierter Befehl ist nicht markiert', () => {
      renderWorkspace({ selectedBefehlId: 'befehl-1' });
      const row = screen.getByTestId('befehl-row-befehl-2');
      expect(row).toHaveAttribute('aria-selected', 'false');
    });

    it('scrollt zum selektierten Befehl via requestAnimationFrame', () => {
      renderWorkspace({ selectedBefehlId: 'befehl-1' });
      // rAF wurde registriert
      expect(rafCallbacks.length).toBeGreaterThan(0);
      // rAF ausfuehren — scrollIntoView wird aufgerufen
      act(() => {
        flushRAF();
      });
      const row = document.getElementById('befehl-row-befehl-1');
      expect(row).not.toBeNull();
      expect(row!.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
    });

    it('ruft onClosePanel bei Panel-Schliessung', async () => {
      const user = userEvent.setup();
      const onClosePanel = vi.fn();
      renderWorkspace({ selectedBefehlId: 'befehl-1', onClosePanel });
      expect(screen.getByTestId('befehl-detail-panel')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /schließen/i }));
      expect(onClosePanel).toHaveBeenCalledOnce();
    });

    it('Focus-Restauration nach Panel-Schliessung (via handlePanelClose rAF)', async () => {
      // Given: Workspace mit geoeffnetem Panel und Focus-Spy
      const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
      const user = userEvent.setup();
      const onClosePanel = vi.fn();
      renderWorkspace({ selectedBefehlId: 'befehl-1', onClosePanel });

      // When: Panel schliessen
      await user.click(screen.getByRole('button', { name: /schließen/i }));

      // Then: rAF ausfuehren → Focus soll auf den vorher selektierten Befehl-Row gesetzt werden
      act(() => {
        flushRAF();
      });
      const row = document.getElementById('befehl-row-befehl-1');
      expect(row).not.toBeNull();
      expect(focusSpy).toHaveBeenCalled();
      focusSpy.mockRestore();
    });

    it('onSelectBefehl wird bei Klick auf Tabellenzeile aufgerufen', async () => {
      const user = userEvent.setup();
      const onSelectBefehl = vi.fn();
      renderWorkspace({ onSelectBefehl });
      await user.click(screen.getByTestId('befehl-row-befehl-2'));
      expect(onSelectBefehl).toHaveBeenCalledWith('befehl-2');
    });

    it('Toolbar bleibt sichtbar bei geoeffnetem Panel', () => {
      renderWorkspace({ selectedBefehlId: 'befehl-1' });
      // Toolbar + Panel koexistieren
      expect(screen.getByRole('toolbar', { name: /befehl-aktionen/i })).toBeInTheDocument();
      expect(screen.getByTestId('befehl-detail-panel')).toBeInTheDocument();
    });

    it('Befehlstabelle bleibt sichtbar bei geoeffnetem Panel', () => {
      renderWorkspace({ selectedBefehlId: 'befehl-1' });
      expect(screen.getByTestId('befehl-tabellen-view')).toBeInTheDocument();
      expect(screen.getByTestId('befehl-detail-panel')).toBeInTheDocument();
    });
  });

  // ----- Task 6.5: Accessibility -----

  describe('Task 6.5: Accessibility', () => {
    it('hat aria-live="polite" Region fuer Statusmeldungen', () => {
      renderWorkspace();
      const liveRegion = document.querySelector('[aria-live="polite"].sr-only');
      expect(liveRegion).toBeInTheDocument();
    });

    it('Fehlerzustand bei ungueltigem Befehl hat role="alert"', () => {
      renderWorkspace({ selectedBefehlId: 'non-existent' });
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('Fehlerzustand hat aria-live="assertive" fuer sofortige Ankuendigung', () => {
      renderWorkspace({ selectedBefehlId: 'non-existent' });
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('Zurueck-Button im Fehlerzustand ist tastatur-bedienbar', async () => {
      const user = userEvent.setup();
      const onClosePanel = vi.fn();
      renderWorkspace({ selectedBefehlId: 'non-existent', onClosePanel });
      const button = screen.getByRole('button', { name: /zurück/i });
      button.focus();
      await user.keyboard('{Enter}');
      expect(onClosePanel).toHaveBeenCalledOnce();
    });

    it('Detail-Panel hat role="complementary" und aria-label', () => {
      renderWorkspace({ selectedBefehlId: 'befehl-1' });
      const panel = screen.getByTestId('befehl-detail-panel');
      expect(panel).toHaveAttribute('role', 'complementary');
      expect(panel).toHaveAttribute('aria-label', expect.stringContaining('B2026-001'));
    });

    it('Workspace-Container hat aria-label', () => {
      renderWorkspace();
      expect(screen.getByLabelText('Befehlsarbeitsraum')).toBeInTheDocument();
    });

    it('Escape-Schliessung: Panel onClose ist aufrufbar via Schliessen-Button', async () => {
      // Note: Escape-Handling wird durch Headless UI im echten Panel gehandhabt.
      // Hier testen wir, dass der onClose-Callback korrekt durchgereicht wird.
      const user = userEvent.setup();
      const onClosePanel = vi.fn();
      renderWorkspace({ selectedBefehlId: 'befehl-1', onClosePanel });
      await user.click(screen.getByRole('button', { name: /schließen/i }));
      expect(onClosePanel).toHaveBeenCalledOnce();
    });

    it('aria-busy ist gesetzt waehrend des Refreshs', () => {
      mockIsRefetching = true;
      renderWorkspace();
      const busyElement = document.querySelector('[aria-busy="true"]');
      expect(busyElement).toBeInTheDocument();
    });

    it('Befehls-Anzahl wird angezeigt (sr-only Region uebernimmt aria-live)', () => {
      renderWorkspace();
      // Ergebnis-Count wird als einfacher Text angezeigt, die sr-only Region uebernimmt aria-live Updates
      const countElement = screen.getByText('2 Befehle');
      expect(countElement).toBeInTheDocument();
      expect(countElement).not.toHaveAttribute('aria-live');
    });

    it('Fehlerzustand-Panel hat fokussierbaren Zurueck-Button', () => {
      renderWorkspace({ selectedBefehlId: 'non-existent' });
      const button = screen.getByRole('button', { name: /zurück/i });
      expect(button.tabIndex).not.toBe(-1);
    });
  });
});
