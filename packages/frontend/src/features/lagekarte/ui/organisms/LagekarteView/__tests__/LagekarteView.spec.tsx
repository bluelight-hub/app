/**
 * Unit Tests für LagekarteView Orchestrator
 *
 * Verifiziert Mode-basiertes Rendering und Hook-Orchestration:
 * - Standard/Fullscreen/Presentation Mode Rendering
 * - Permission-basiertes Toolbar-Rendering
 * - WebSocket-Status Badge
 * - Präsentationsmodus-Label
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LagekarteView } from '../LagekarteView';

// ============================================
// Mocks
// ============================================

// MapLibre + react-map-gl müssen vor dem Import gemockt werden
vi.mock('react-map-gl/maplibre', () => ({
  Map: vi.fn(({ children, onLoad, 'aria-label': ariaLabel }: any) => {
    // Auto-fire onLoad für Tests
    setTimeout(() => onLoad?.(), 0);
    return (
      <div data-testid="mock-map" aria-label={ariaLabel}>
        {children}
      </div>
    );
  }),
  NavigationControl: () => <div data-testid="nav-control" />,
  Source: ({ children }: any) => <div data-testid="source">{children}</div>,
  Layer: () => <div data-testid="layer" />,
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
}));

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

vi.mock('@/features/lagekarte/utils/map-config', () => ({
  MAP_DEFAULTS: { longitude: 10, latitude: 50, zoom: 8 },
  getDwdWmsTileUrl: () => 'https://example.com/wms',
}));

vi.mock('@/features/lagekarte/hooks/use-map-layer', () => ({
  useMapLayer: () => ({
    resolvedStyle: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    selectedBaseLayer: 'osm',
    dwdOverlayEnabled: false,
    availableLayers: [],
    ninaOverlays: {},
  }),
}));

vi.mock('@/features/lagekarte/hooks/use-map-detail', () => ({
  useMapDetail: () => ({
    results: [],
    coordinate: null,
    panelIndex: 0,
    isPanelOpen: false,
    isLoading: false,
    handleMapClick: vi.fn(),
    openPanel: vi.fn(),
    navigatePanel: vi.fn(),
    closePanel: vi.fn(),
    clearSelection: vi.fn(),
  }),
}));

vi.mock('@/features/lagekarte/api/use-nina-map-data', () => ({
  useNinaMapData: () => ({ data: null }),
}));

vi.mock('@/features/lagekarte/api/use-lagekarte', () => ({
  useLagekarte: () => ({ data: null }),
}));

const mockCanDraw = vi.fn().mockReturnValue(true);
vi.mock('@/features/lagekarte/hooks/use-lagekarte-permissions', () => ({
  useLagekartePermissions: () => ({ canDraw: mockCanDraw() }),
}));

vi.mock('@/features/lagekarte/api/use-lagekarte-websocket', () => ({
  useLagekarteWebSocketStatus: () => true,
}));

vi.mock('@/features/lagekarte/hooks/use-draw-control', () => ({
  useDrawControl: () => ({
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
    deleteSelected: vi.fn(),
    setMode: vi.fn(),
    drawRef: { current: null },
    scheduleAutoSave: vi.fn(),
  }),
}));

vi.mock('@/features/lagekarte/hooks/use-lagekarte-sync', () => ({
  useLagekarteSync: () => ({
    wsStatus: 'connected',
    isConnected: true,
    sendDelta: vi.fn(),
  }),
}));

vi.mock('@/features/lagekarte/hooks/use-feature-measurement', () => ({
  useFeatureMeasurement: () => ({
    selectedMeasurement: undefined,
    liveMeasurement: undefined,
  }),
}));

vi.mock('@/features/lagekarte/hooks/use-osm-markierung', () => ({
  useOsmMarkierung: () => ({
    handleOsmClick: vi.fn(),
    pendingOsmMark: null,
    confirmOsmMark: vi.fn(),
    cancelOsmMark: vi.fn(),
  }),
}));

vi.mock('@/features/lagekarte/hooks/use-gams-zonen', () => ({
  useGamsZonen: () => ({
    pendingGamsCenter: null,
    confirmiereGamsZonen: vi.fn(),
    abbrechenGamsZonen: vi.fn(),
  }),
}));

vi.mock('@/features/lagekarte/hooks/use-snap-control', () => ({
  useSnapControl: vi.fn(),
}));

vi.mock('@/features/lagekarte/stores/draw.store', () => ({
  drawStore: {
    state: { drawMode: 'idle', selectedFeatureIds: [], isDirectSelect: false, snapEnabled: false, isDrawToolbarVisible: false },
    subscribe: vi.fn((cb) => {
      cb();
      return () => {};
    }),
  },
  toggleSnapEnabled: vi.fn(),
  toggleDrawToolbar: vi.fn(),
  setDrawMode: vi.fn(),
  setSelectedFeatures: vi.fn(),
  setDirectSelect: vi.fn(),
}));

vi.mock('@tanstack/react-store', () => ({
  createStore: vi.fn((initialState: any) => ({
    state: initialState,
    subscribe: vi.fn(() => () => {}),
    setState: vi.fn(),
  })),
  useStore: vi.fn((_store: any, selector: any) => {
    const state = { drawMode: 'idle', selectedFeatureIds: [], isDirectSelect: false, snapEnabled: false, isDrawToolbarVisible: false };
    return selector(state);
  }),
}));

vi.mock('@/features/lagekarte/drawing/types', () => ({
  DEFAULT_DRAWING_STYLE: { color: '#000', fillColor: '#fff', strokeWidth: 2, fillEnabled: false, fillOpacity: 0.3, strokeDasharray: '', hatch: { type: 'none', color: '', spacing: 8 } },
  DEFAULT_HATCH: { type: 'none', color: '', spacing: 8 },
}));

vi.mock('@/features/lagekarte/drawing/hatch-patterns', () => ({
  ensureHatchImage: vi.fn(),
  migrateLegacyFillPattern: vi.fn(),
  reregisterHatchImages: vi.fn(),
}));

vi.mock('@/features/lagekarte/drawing/draw-styles', () => ({
  EMPTY_PATTERN_IMAGE: '__empty_pattern__',
}));

vi.mock('@/shared/ui/atoms/spinner.atom', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

vi.mock('@/shared/ui/cn', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@turf/turf', () => ({
  bbox: vi.fn(() => [10, 50, 11, 51]),
}));

vi.mock('@/features/lagekarte/ui/atoms/ConnectionStatusBadge.atom', () => ({
  ConnectionStatusBadge: ({ status }: any) => <div data-testid="ws-badge">{status}</div>,
}));

vi.mock('@/features/lagekarte/ui/molecules/MapLayerSwitcher.molecule', () => ({
  MapLayerSwitcher: () => <div data-testid="layer-switcher" />,
}));

vi.mock('@/features/lagekarte/ui/molecules/MapDetailPopup.molecule', () => ({
  MapDetailPopup: () => <div data-testid="detail-popup" />,
}));

vi.mock('@/features/lagekarte/ui/molecules/MapDetailPanel.molecule', () => ({
  MapDetailPanel: () => <div data-testid="detail-panel" />,
}));

vi.mock('@/features/lagekarte/ui/molecules/DrawToolbar.molecule', () => ({
  DrawToolbar: () => <div data-testid="draw-toolbar" />,
}));

vi.mock('@/features/lagekarte/ui/molecules/DrawShortcutBar.molecule', () => ({
  DrawShortcutBar: () => <div data-testid="draw-shortcut-bar" />,
}));

vi.mock('@/features/lagekarte/ui/molecules/DrawStylePanel.molecule', () => ({
  DrawStylePanel: () => <div data-testid="draw-style-panel" />,
}));

vi.mock('@/features/lagekarte/ui/molecules/OsmMarkierungPopup.molecule', () => ({
  OsmMarkierungPopup: () => <div data-testid="osm-popup" />,
}));

vi.mock('@/features/lagekarte/ui/molecules/GamsZonenPanel.molecule', () => ({
  GamsZonenPanel: () => <div data-testid="gams-panel" />,
}));

vi.mock('@/features/lagekarte/ui/molecules/NinaGeoJsonLayer.molecule', () => ({
  NinaGeoJsonLayer: () => <div data-testid="nina-layer" />,
}));

vi.mock('@/features/lagekarte/ui/organisms/FullscreenCloseButton/FullscreenCloseButton', () => ({
  FullscreenCloseButton: () => <div data-testid="fullscreen-close" />,
}));

vi.mock('@/features/lagekarte/detail-providers', () => ({}));

vi.mock('../lagekarte-view.css', () => ({}));

vi.mock('@/shared/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ============================================
// Tests
// ============================================

describe('LagekarteView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanDraw.mockReturnValue(true);
  });

  describe('Standard-Modus', () => {
    it('sollte Map mit aria-label rendern', () => {
      render(<LagekarteView einsatzId="einsatz-1" />);

      expect(screen.getByTestId('mock-map')).toBeInTheDocument();
    });

    it('sollte WebSocket-Badge anzeigen', () => {
      render(<LagekarteView einsatzId="einsatz-1" />);

      expect(screen.getByTestId('ws-badge')).toBeInTheDocument();
    });

    it('sollte Draw-Toolbar anzeigen wenn canDraw=true', () => {
      render(<LagekarteView einsatzId="einsatz-1" />);

      expect(screen.getByTestId('draw-toolbar')).toBeInTheDocument();
    });

    it('sollte Draw-Toolbar NICHT anzeigen wenn canDraw=false', () => {
      mockCanDraw.mockReturnValue(false);

      render(<LagekarteView einsatzId="einsatz-1" />);

      expect(screen.queryByTestId('draw-toolbar')).not.toBeInTheDocument();
    });

    it('sollte kein Fullscreen-Close-Button anzeigen', () => {
      render(<LagekarteView einsatzId="einsatz-1" />);

      expect(screen.queryByTestId('fullscreen-close')).not.toBeInTheDocument();
    });

    it('sollte Layer-Switcher anzeigen', () => {
      render(<LagekarteView einsatzId="einsatz-1" />);

      expect(screen.getByTestId('layer-switcher')).toBeInTheDocument();
    });
  });

  describe('Fullscreen-Modus', () => {
    it('sollte Fullscreen-Close-Button anzeigen', () => {
      render(<LagekarteView einsatzId="einsatz-1" mode="fullscreen" />);

      expect(screen.getByTestId('fullscreen-close')).toBeInTheDocument();
    });
  });

  describe('Präsentations-Modus', () => {
    it('sollte Präsentationsmodus-Label anzeigen', () => {
      render(<LagekarteView einsatzId="einsatz-1" mode="presentation" />);

      expect(screen.getByText('Präsentationsmodus')).toBeInTheDocument();
    });

    it('sollte WebSocket-Badge NICHT anzeigen', () => {
      render(<LagekarteView einsatzId="einsatz-1" mode="presentation" />);

      expect(screen.queryByTestId('ws-badge')).not.toBeInTheDocument();
    });

    it('sollte Draw-Toolbar NICHT anzeigen (auch mit Permission)', () => {
      mockCanDraw.mockReturnValue(true);

      render(<LagekarteView einsatzId="einsatz-1" mode="presentation" />);

      expect(screen.queryByTestId('draw-toolbar')).not.toBeInTheDocument();
    });

    it('sollte Layer-Switcher NICHT anzeigen', () => {
      render(<LagekarteView einsatzId="einsatz-1" mode="presentation" />);

      expect(screen.queryByTestId('layer-switcher')).not.toBeInTheDocument();
    });

    it('sollte Fullscreen-Close-Button anzeigen', () => {
      render(<LagekarteView einsatzId="einsatz-1" mode="presentation" />);

      expect(screen.getByTestId('fullscreen-close')).toBeInTheDocument();
    });
  });
});
