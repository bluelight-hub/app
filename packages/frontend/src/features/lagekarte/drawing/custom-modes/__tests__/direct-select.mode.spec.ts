/**
 * Unit Tests für CustomDirectSelect Modus
 *
 * Verifiziert die Erweiterungen gegenüber dem Standard-direct_select:
 * - Lock-Modus: Wechselt sofort zurück zu simple_select
 * - Parametrische Formen: Erkennung von circle/sector/ellipse
 * - toDisplayFeatures: Einzelner Resize-Griff für parametrische Formen
 * - dragVertex: Geometrie-Neuberechnung statt Vertex-Verschiebung
 * - onMidpoint: Blockiert für parametrische Formen
 * - onMouseUp: Shape-Properties aktualisieren
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// MapboxDraw Mock
const mockDefaultDirectSelect = {
  onSetup: vi.fn().mockReturnValue({
    feature: { properties: {} },
    featureId: 'feat-1',
    selectedCoordPaths: [],
  }),
  toDisplayFeatures: vi.fn(),
  dragVertex: vi.fn(),
  onMidpoint: vi.fn(),
};

vi.mock('@mapbox/mapbox-gl-draw', () => ({
  default: {
    modes: {
      direct_select: mockDefaultDirectSelect,
    },
  },
}));

vi.mock('../../../utils/geo-calculations', () => ({
  berechneAbstand: vi.fn().mockReturnValue(150),
  erstelleKreis: vi.fn().mockReturnValue([
    [
      [7.0, 50.001],
      [7.001, 50.0],
      [7.0, 50.001],
    ],
  ]),
  erstelleSektor: vi.fn().mockReturnValue([
    [
      [7.0, 50.0],
      [7.001, 50.001],
      [7.0, 50.0],
    ],
  ]),
  erstelleEllipse: vi.fn().mockReturnValue([
    [
      [7.0, 50.001],
      [7.001, 50.0],
      [7.0, 50.001],
    ],
  ]),
}));

vi.mock('../../arrow-display', () => ({
  erzeugeArrowDisplay: vi.fn(),
}));

const { CustomDirectSelect } = await import('../direct-select.mode');

describe('CustomDirectSelect', () => {
  let ctx: Record<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = {
      map: {
        __drawLocked: false,
        _controls: [],
      },
      changeMode: vi.fn(),
      fireActionable: vi.fn(),
      fireUpdate: vi.fn(),
      stopDragging: vi.fn(),
    };
  });

  describe('onSetup - Lock-Modus', () => {
    it('sollte bei gesperrter Karte zu simple_select wechseln', () => {
      ctx.map.__drawLocked = true;

      const state = CustomDirectSelect.onSetup.call(ctx, {});

      expect(ctx.changeMode).toHaveBeenCalledWith('simple_select');
      expect(state).toEqual({});
    });

    it('sollte bei nicht-gesperrter Karte Standard-Setup ausführen', () => {
      CustomDirectSelect.onSetup.call(ctx, { featureId: 'feat-1' });

      expect(mockDefaultDirectSelect.onSetup).toHaveBeenCalled();
      expect(ctx.changeMode).not.toHaveBeenCalled();
    });
  });

  describe('onSetup - Parametrische Erkennung', () => {
    it('sollte Circle als parametrisch erkennen', () => {
      mockDefaultDirectSelect.onSetup.mockReturnValueOnce({
        feature: {
          properties: {
            shapeType: 'circle',
            shapeCenter: '[7.0, 50.0]',
            shapeRadius: 100,
          },
        },
        featureId: 'feat-1',
        selectedCoordPaths: [],
      });

      const state = CustomDirectSelect.onSetup.call(ctx, {});

      expect(state.isParametric).toBe(true);
      expect(state.shapeType).toBe('circle');
      expect(state.shapeCenter).toEqual([7.0, 50.0]);
      expect(state.shapeRadius).toBe(100);
    });

    it('sollte Sector als parametrisch erkennen', () => {
      mockDefaultDirectSelect.onSetup.mockReturnValueOnce({
        feature: {
          properties: {
            shapeType: 'sector',
            shapeCenter: '[7.0, 50.0]',
            shapeRadius: 200,
            shapeBearing: 45,
            shapeOpeningAngle: 90,
          },
        },
        featureId: 'feat-1',
        selectedCoordPaths: [],
      });

      const state = CustomDirectSelect.onSetup.call(ctx, {});

      expect(state.isParametric).toBe(true);
      expect(state.shapeType).toBe('sector');
      expect(state.shapeBearing).toBe(45);
      expect(state.shapeOpeningAngle).toBe(90);
    });

    it('sollte Ellipse als parametrisch erkennen', () => {
      mockDefaultDirectSelect.onSetup.mockReturnValueOnce({
        feature: {
          properties: {
            shapeType: 'ellipse',
            shapeCenter: '[7.0, 50.0]',
            shapeRadiusX: 100,
            shapeRadiusY: 50,
          },
        },
        featureId: 'feat-1',
        selectedCoordPaths: [],
      });

      const state = CustomDirectSelect.onSetup.call(ctx, {});

      expect(state.isParametric).toBe(true);
      expect(state.shapeType).toBe('ellipse');
      expect(state.shapeRadiusX).toBe(100);
      expect(state.shapeRadiusY).toBe(50);
    });

    it('sollte normales Feature nicht als parametrisch markieren', () => {
      mockDefaultDirectSelect.onSetup.mockReturnValueOnce({
        feature: { properties: {} },
        featureId: 'feat-1',
        selectedCoordPaths: [],
      });

      const state = CustomDirectSelect.onSetup.call(ctx, {});

      expect(state.isParametric).toBeUndefined();
    });
  });

  describe('toDisplayFeatures', () => {
    it('sollte für parametrische Form nur einen Resize-Griff zeigen', () => {
      const push = vi.fn();
      const state = {
        isParametric: true,
        featureId: 'feat-1',
        selectedCoordPaths: [],
      };
      const geojson = {
        properties: { id: 'feat-1', active: 'false' },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [7.0, 50.001],
              [7.001, 50.0],
              [7.0, 49.999],
              [6.999, 50.0],
              [7.0, 50.001],
            ],
          ],
        },
      };

      CustomDirectSelect.toDisplayFeatures.call(ctx, state, geojson, push);

      // Polygon + 1 Resize-Vertex = 2 Aufrufe
      expect(push).toHaveBeenCalledTimes(2);
      // Polygon mit active=true
      expect(push).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          properties: expect.objectContaining({ active: 'true' }),
        }),
      );
      // Resize-Griff als Vertex
      expect(push).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          properties: expect.objectContaining({
            meta: 'vertex',
            parent: 'feat-1',
            coord_path: '0.0',
          }),
        }),
      );
    });

    it('sollte für nicht-parametrische Formen Standard-Verhalten nutzen', () => {
      const push = vi.fn();
      const state = {
        featureId: 'feat-1',
        selectedCoordPaths: [],
      };
      const geojson = {
        properties: { id: 'feat-1' },
        geometry: { type: 'Polygon', coordinates: [[]] },
      };

      CustomDirectSelect.toDisplayFeatures.call(ctx, state, geojson, push);

      expect(mockDefaultDirectSelect.toDisplayFeatures).toHaveBeenCalled();
    });

    it('sollte Arrow-Features mit erzeugeArrowDisplay behandeln', async () => {
      const { erzeugeArrowDisplay } = await import('../../arrow-display');
      const push = vi.fn();
      const state = { featureId: 'feat-1', selectedCoordPaths: [] };
      const geojson = {
        geometry: {
          type: 'LineString',
          coordinates: [
            [7.0, 50.0],
            [7.5, 50.5],
          ],
        },
        properties: { user_shapeType: 'arrow' },
      };

      mockDefaultDirectSelect.toDisplayFeatures.mockImplementation((_state: any, _geojson: any, displayFn: any) => {
        displayFn({ geometry: { type: 'LineString', coordinates: [] }, properties: {} });
      });

      CustomDirectSelect.toDisplayFeatures.call(ctx, state, geojson, push);

      expect(erzeugeArrowDisplay).toHaveBeenCalled();
    });
  });

  describe('dragVertex', () => {
    it('sollte für Circle Geometrie neu berechnen', async () => {
      const { erstelleKreis } = await import('../../../utils/geo-calculations');
      const state = {
        isParametric: true,
        shapeType: 'circle',
        shapeCenter: [7.0, 50.0] as [number, number],
        shapeRadius: 100,
        minRadius: 1,
        maxRadius: Infinity,
        feature: { incomingCoords: vi.fn() },
      };

      CustomDirectSelect.dragVertex.call(ctx, state, { lngLat: { lng: 7.1, lat: 50.1 } }, {});

      expect(erstelleKreis).toHaveBeenCalledWith([7.0, 50.0], 150);
      expect(state.feature.incomingCoords).toHaveBeenCalled();
    });

    it('sollte für Sector Geometrie neu berechnen', async () => {
      const { erstelleSektor } = await import('../../../utils/geo-calculations');
      const state = {
        isParametric: true,
        shapeType: 'sector',
        shapeCenter: [7.0, 50.0] as [number, number],
        shapeRadius: 100,
        shapeBearing: 45,
        shapeOpeningAngle: 90,
        minRadius: 1,
        maxRadius: Infinity,
        feature: { incomingCoords: vi.fn() },
      };

      CustomDirectSelect.dragVertex.call(ctx, state, { lngLat: { lng: 7.1, lat: 50.1 } }, {});

      expect(erstelleSektor).toHaveBeenCalledWith([7.0, 50.0], 150, 45, 90);
    });

    it('sollte für Ellipse proportional skalieren', async () => {
      const { erstelleEllipse, berechneAbstand } = await import('../../../utils/geo-calculations');
      vi.mocked(berechneAbstand).mockReturnValueOnce(150).mockReturnValueOnce(100);

      const state = {
        isParametric: true,
        shapeType: 'ellipse',
        shapeCenter: [7.0, 50.0] as [number, number],
        shapeRadiusX: 100,
        shapeRadiusY: 50,
        shapeRadius: 100,
        minRadius: 1,
        maxRadius: Infinity,
        feature: {
          incomingCoords: vi.fn(),
          getCoordinates: vi.fn().mockReturnValue([[[7.001, 50.0]]]),
        },
      };

      CustomDirectSelect.dragVertex.call(ctx, state, { lngLat: { lng: 7.15, lat: 50.15 } }, {});

      expect(erstelleEllipse).toHaveBeenCalled();
    });

    it('sollte für nicht-parametrische Formen Standard nutzen', () => {
      const state = { isParametric: false };

      CustomDirectSelect.dragVertex.call(ctx, state, {}, {});

      expect(mockDefaultDirectSelect.dragVertex).toHaveBeenCalled();
    });

    it('sollte Radius zwischen Min/Max beschränken', async () => {
      const { berechneAbstand, erstelleKreis } = await import('../../../utils/geo-calculations');
      vi.mocked(berechneAbstand).mockReturnValue(5);

      const state = {
        isParametric: true,
        shapeType: 'circle',
        shapeCenter: [7.0, 50.0] as [number, number],
        shapeRadius: 100,
        minRadius: 50,
        maxRadius: 200,
        feature: { incomingCoords: vi.fn() },
      };

      CustomDirectSelect.dragVertex.call(ctx, state, { lngLat: { lng: 7.0001, lat: 50.0001 } }, {});

      // Radius wird auf minRadius beschränkt
      expect(erstelleKreis).toHaveBeenCalledWith([7.0, 50.0], 50);
    });
  });

  describe('onMidpoint', () => {
    it('sollte für parametrische Formen blockieren', () => {
      const state = { isParametric: true };

      CustomDirectSelect.onMidpoint.call(ctx, state, {});

      expect(mockDefaultDirectSelect.onMidpoint).not.toHaveBeenCalled();
    });

    it('sollte für nicht-parametrische Formen Standard nutzen', () => {
      const state = { isParametric: false };

      CustomDirectSelect.onMidpoint.call(ctx, state, {});

      expect(mockDefaultDirectSelect.onMidpoint).toHaveBeenCalled();
    });
  });

  describe('onMouseUp', () => {
    it('sollte Shape-Properties bei parametrischer Form aktualisieren', () => {
      const state = {
        isParametric: true,
        shapeType: 'circle',
        shapeRadius: 200,
        dragMoving: true,
        feature: { properties: {} as Record<string, unknown> },
      };

      CustomDirectSelect.onMouseUp.call(ctx, state);

      expect(state.feature.properties.shapeRadius).toBe(200);
      expect(ctx.fireUpdate).toHaveBeenCalled();
      expect(ctx.stopDragging).toHaveBeenCalled();
    });

    it('sollte Ellipse RadiusX/Y Properties aktualisieren', () => {
      const state = {
        isParametric: true,
        shapeType: 'ellipse',
        shapeRadiusX: 150,
        shapeRadiusY: 75,
        dragMoving: true,
        feature: { properties: {} as Record<string, unknown> },
      };

      CustomDirectSelect.onMouseUp.call(ctx, state);

      expect(state.feature.properties.shapeRadiusX).toBe(150);
      expect(state.feature.properties.shapeRadiusY).toBe(75);
    });

    it('sollte fireUpdate nicht aufrufen wenn kein Drag stattfand', () => {
      const state = {
        isParametric: false,
        dragMoving: false,
        feature: { properties: {} },
      };

      CustomDirectSelect.onMouseUp.call(ctx, state);

      expect(ctx.fireUpdate).not.toHaveBeenCalled();
    });
  });
});
