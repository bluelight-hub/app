/**
 * Unit Tests für ArrowMode
 *
 * Verifiziert den Pfeil-Zeichenmodus:
 * - onSetup: Feature-Erstellung, dragPan deaktiviert
 * - onMouseDown: Start-/Endpunkt initialisiert
 * - onDrag: Endpunkt aktualisiert
 * - onMouseUp: Feature-Event, Mindestlänge, Cleanup
 * - toDisplayFeatures: Arrow-Display-Delegation
 * - onStop: Cleanup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArrowMode } from '../arrow.mode';

vi.mock('../../arrow-display', () => ({
  erzeugeArrowDisplay: vi.fn(),
}));

describe('ArrowMode', () => {
  let ctx: Record<string, any>;
  let state: any;

  beforeEach(() => {
    vi.clearAllMocks();

    const line = {
      id: 'line-1',
      coordinates: [] as number[][],
      addCoordinate: vi.fn((idx: number, lng: number, lat: number) => {
        line.coordinates[idx] = [lng, lat];
      }),
      updateCoordinate: vi.fn((_idx: string, lng: number, lat: number) => {
        line.coordinates[1] = [lng, lat];
      }),
      toGeoJSON: vi.fn().mockReturnValue({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [] },
        properties: {},
      }),
    };

    ctx = {
      newFeature: vi.fn().mockReturnValue(line),
      addFeature: vi.fn(),
      deleteFeature: vi.fn(),
      setActionableState: vi.fn(),
      fire: vi.fn(),
      changeMode: vi.fn(),
      map: {
        dragPan: { disable: vi.fn(), enable: vi.fn() },
      },
    };

    state = ArrowMode.onSetup.call(ctx);
  });

  describe('onSetup', () => {
    it('sollte Feature erstellen und hinzufügen', () => {
      expect(ctx.newFeature).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({ shapeType: 'arrow' }),
        }),
      );
      expect(ctx.addFeature).toHaveBeenCalled();
    });

    it('sollte dragPan deaktivieren', () => {
      expect(ctx.map.dragPan.disable).toHaveBeenCalled();
    });

    it('sollte actionable State setzen', () => {
      expect(ctx.setActionableState).toHaveBeenCalledWith({
        trash: true,
        combineFeatures: false,
        uncombineFeatures: false,
      });
    });

    it('sollte initialen State zurückgeben', () => {
      expect(state.start).toBeNull();
      expect(state.isDrawing).toBe(false);
    });
  });

  describe('onMouseDown', () => {
    it('sollte Startpunkt und Drawing-Status setzen', () => {
      ArrowMode.onMouseDown.call(ctx, state, { lngLat: { lng: 7.0, lat: 50.0 } });

      expect(state.start).toEqual([7.0, 50.0]);
      expect(state.isDrawing).toBe(true);
    });

    it('sollte Koordinaten am Line-Feature setzen', () => {
      ArrowMode.onMouseDown.call(ctx, state, { lngLat: { lng: 7.0, lat: 50.0 } });

      expect(state.line.addCoordinate).toHaveBeenCalledWith(0, 7.0, 50.0);
      expect(state.line.addCoordinate).toHaveBeenCalledWith(1, 7.0, 50.0);
    });
  });

  describe('onDrag', () => {
    it('sollte Endpunkt aktualisieren', () => {
      ArrowMode.onMouseDown.call(ctx, state, { lngLat: { lng: 7.0, lat: 50.0 } });
      ArrowMode.onDrag.call(ctx, state, { lngLat: { lng: 7.5, lat: 50.5 } });

      expect(state.line.updateCoordinate).toHaveBeenCalledWith('1', 7.5, 50.5);
    });

    it('sollte nichts tun wenn nicht im Drawing-Modus', () => {
      ArrowMode.onDrag.call(ctx, state, { lngLat: { lng: 7.5, lat: 50.5 } });

      expect(state.line.updateCoordinate).not.toHaveBeenCalled();
    });
  });

  describe('onMouseUp', () => {
    it('sollte Feature-Event feuern bei gültiger Linie', () => {
      state.start = [7.0, 50.0];
      state.isDrawing = true;
      state.line.coordinates = [
        [7.0, 50.0],
        [7.5, 50.5],
      ];

      ArrowMode.onMouseUp.call(ctx, state);

      expect(ctx.fire).toHaveBeenCalledWith('draw.create', {
        features: [state.line.toGeoJSON()],
      });
      expect(ctx.changeMode).toHaveBeenCalledWith('simple_select', {
        featureIds: ['line-1'],
      });
    });

    it('sollte dragPan wieder aktivieren', () => {
      state.start = [7.0, 50.0];
      state.isDrawing = true;
      state.line.coordinates = [
        [7.0, 50.0],
        [7.5, 50.5],
      ];

      ArrowMode.onMouseUp.call(ctx, state);

      expect(ctx.map.dragPan.enable).toHaveBeenCalled();
    });

    it('sollte Feature löschen wenn Start gleich Ende', () => {
      state.start = [7.0, 50.0];
      state.isDrawing = true;
      state.line.coordinates = [
        [7.0, 50.0],
        [7.0, 50.0],
      ];

      ArrowMode.onMouseUp.call(ctx, state);

      expect(ctx.deleteFeature).toHaveBeenCalledWith('line-1');
      expect(ctx.fire).not.toHaveBeenCalled();
    });

    it('sollte Feature löschen bei zu wenig Koordinaten', () => {
      state.start = [7.0, 50.0];
      state.isDrawing = true;
      state.line.coordinates = [[7.0, 50.0]];

      ArrowMode.onMouseUp.call(ctx, state);

      expect(ctx.deleteFeature).toHaveBeenCalledWith('line-1');
    });

    it('sollte nichts tun wenn nicht im Drawing-Modus', () => {
      ArrowMode.onMouseUp.call(ctx, state);

      expect(ctx.fire).not.toHaveBeenCalled();
      expect(ctx.map.dragPan.enable).not.toHaveBeenCalled();
    });
  });

  describe('toDisplayFeatures', () => {
    it('sollte erzeugeArrowDisplay für LineString aufrufen', async () => {
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
      };

      ArrowMode.toDisplayFeatures.call(ctx, state, geojson, display);

      expect(erzeugeArrowDisplay).toHaveBeenCalledWith(ctx.map, geojson, display);
    });

    it('sollte Nicht-LineString direkt anzeigen', () => {
      const display = vi.fn();
      const geojson = {
        geometry: { type: 'Point', coordinates: [7.0, 50.0] },
      };

      ArrowMode.toDisplayFeatures.call(ctx, state, geojson, display);

      expect(display).toHaveBeenCalledWith(geojson);
    });

    it('sollte LineString ohne Koordinaten überspringen', async () => {
      const { erzeugeArrowDisplay } = await import('../../arrow-display');
      const display = vi.fn();
      const geojson = {
        geometry: { type: 'LineString', coordinates: [[7.0, 50.0]] },
      };

      ArrowMode.toDisplayFeatures.call(ctx, state, geojson, display);

      expect(erzeugeArrowDisplay).not.toHaveBeenCalled();
      expect(display).not.toHaveBeenCalled();
    });
  });

  describe('onStop', () => {
    it('sollte Feature löschen wenn ungültig', () => {
      state.line.coordinates = [[7.0, 50.0]];

      ArrowMode.onStop.call(ctx, state);

      expect(ctx.deleteFeature).toHaveBeenCalledWith('line-1');
    });

    it('sollte dragPan aktivieren', () => {
      state.line.coordinates = [
        [7.0, 50.0],
        [7.5, 50.5],
      ];

      ArrowMode.onStop.call(ctx, state);

      expect(ctx.map.dragPan.enable).toHaveBeenCalled();
    });
  });
});
