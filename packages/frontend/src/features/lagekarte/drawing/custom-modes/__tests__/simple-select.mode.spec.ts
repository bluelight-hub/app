/**
 * Unit Tests für CustomSimpleSelect Modus
 *
 * Verifiziert die Erweiterungen gegenüber dem Standard-simple_select:
 * - Lock-Modus: Blockiert clickOnVertex und onDrag
 * - Arrow-Rendering: Pfeilspitze in toDisplayFeatures
 * - Lock-Modus: Vertex/Midpoint-Handles filtern
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// MapboxDraw Mock muss vor dem Import stehen
const mockDefaultSimpleSelect = {
  clickOnVertex: vi.fn(),
  onDrag: vi.fn(),
  toDisplayFeatures: vi.fn(),
};

vi.mock('@mapbox/mapbox-gl-draw', () => ({
  default: {
    modes: {
      simple_select: mockDefaultSimpleSelect,
    },
  },
}));

vi.mock('../../arrow-display', () => ({
  erzeugeArrowDisplay: vi.fn(),
}));

// Import NACH den Mocks
const { CustomSimpleSelect } = await import('../simple-select.mode');

describe('CustomSimpleSelect', () => {
  let ctx: Record<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = {
      map: { __drawLocked: false },
    };
  });

  describe('Lock-Modus', () => {
    it('sollte clickOnVertex blockieren wenn gesperrt', () => {
      ctx.map.__drawLocked = true;

      CustomSimpleSelect.clickOnVertex.call(ctx, {}, {});

      expect(mockDefaultSimpleSelect.clickOnVertex).not.toHaveBeenCalled();
    });

    it('sollte clickOnVertex durchlassen wenn nicht gesperrt', () => {
      CustomSimpleSelect.clickOnVertex.call(ctx, {}, {});

      expect(mockDefaultSimpleSelect.clickOnVertex).toHaveBeenCalled();
    });

    it('sollte onDrag blockieren wenn gesperrt', () => {
      ctx.map.__drawLocked = true;

      CustomSimpleSelect.onDrag.call(ctx, {}, {});

      expect(mockDefaultSimpleSelect.onDrag).not.toHaveBeenCalled();
    });

    it('sollte onDrag durchlassen wenn nicht gesperrt', () => {
      CustomSimpleSelect.onDrag.call(ctx, {}, {});

      expect(mockDefaultSimpleSelect.onDrag).toHaveBeenCalled();
    });
  });

  describe('toDisplayFeatures', () => {
    it('sollte Arrow-Features mit erzeugeArrowDisplay behandeln', async () => {
      const { erzeugeArrowDisplay } = await import('../../arrow-display');
      const display = vi.fn();
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

      // Default-toDisplayFeatures ruft den übergebenen Display-Callback auf
      mockDefaultSimpleSelect.toDisplayFeatures.mockImplementation((_state: any, _geojson: any, displayFn: any) => {
        displayFn({ geometry: { type: 'LineString', coordinates: [] }, properties: {} });
      });

      CustomSimpleSelect.toDisplayFeatures.call(ctx, {}, geojson, display);

      expect(erzeugeArrowDisplay).toHaveBeenCalled();
    });

    it('sollte Nicht-Arrow-Features an Standard weiterleiten', () => {
      const display = vi.fn();
      const geojson = {
        geometry: { type: 'Polygon', coordinates: [] },
        properties: {},
      };

      CustomSimpleSelect.toDisplayFeatures.call(ctx, {}, geojson, display);

      expect(mockDefaultSimpleSelect.toDisplayFeatures).toHaveBeenCalled();
    });

    it('sollte bei Lock Vertex-/Midpoint-Handles filtern', () => {
      ctx.map.__drawLocked = true;
      const display = vi.fn();
      const geojson = {
        geometry: { type: 'Polygon', coordinates: [] },
        properties: {},
      };

      // Simuliere, dass der Default-Modus mehrere Features pusht
      mockDefaultSimpleSelect.toDisplayFeatures.mockImplementation((_state: any, _geojson: any, displayFn: any) => {
        displayFn({ properties: { meta: 'vertex' }, geometry: { type: 'Point' } });
        displayFn({ properties: { meta: 'midpoint' }, geometry: { type: 'Point' } });
        displayFn({ properties: { meta: 'feature' }, geometry: { type: 'Polygon' } });
      });

      CustomSimpleSelect.toDisplayFeatures.call(ctx, {}, geojson, display);

      // Nur das Feature-Geometry, keine Vertex/Midpoint-Handles
      expect(display).toHaveBeenCalledTimes(1);
      expect(display).toHaveBeenCalledWith(expect.objectContaining({ properties: { meta: 'feature' } }));
    });
  });
});
