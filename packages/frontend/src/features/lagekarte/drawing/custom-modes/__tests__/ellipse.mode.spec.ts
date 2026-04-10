/**
 * Unit Tests für EllipseMode
 *
 * Verifiziert den Ellipsen-Zeichenmodus:
 * - onSetup: Feature-Erstellung, dragPan deaktiviert
 * - onMouseDown: Mittelpunkt setzen
 * - onDrag: Radien berechnen, Polygon aktualisieren
 * - onMouseUp: Feature-Event, Shape-Properties, Cleanup
 * - toDisplayFeatures: Polygon-Anzeige
 * - onStop: Cleanup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EllipseMode } from '../ellipse.mode';

vi.mock('../../../utils/geo-calculations', () => ({
  berechneAbstand: vi.fn().mockReturnValue(100),
  erstelleEllipse: vi.fn().mockReturnValue([
    [
      [7.0, 50.001],
      [7.001, 50.0],
      [7.0, 49.999],
      [6.999, 50.0],
      [7.0, 50.001],
    ],
  ]),
}));

describe('EllipseMode', () => {
  let ctx: Record<string, any>;
  let state: any;

  beforeEach(() => {
    vi.clearAllMocks();

    const polygon = {
      id: 'poly-1',
      properties: {} as Record<string, unknown>,
      coordinates: [[]] as number[][][],
      incomingCoords: vi.fn((coords: number[][][]) => {
        polygon.coordinates = coords;
      }),
      toGeoJSON: vi.fn().mockReturnValue({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[]] },
        properties: {},
      }),
    };

    ctx = {
      newFeature: vi.fn().mockReturnValue(polygon),
      addFeature: vi.fn(),
      deleteFeature: vi.fn(),
      setActionableState: vi.fn(),
      fire: vi.fn(),
      changeMode: vi.fn(),
      map: {
        dragPan: { disable: vi.fn(), enable: vi.fn() },
      },
    };

    state = EllipseMode.onSetup.call(ctx);
  });

  describe('onSetup', () => {
    it('sollte Polygon-Feature erstellen mit shapeType ellipse', () => {
      expect(ctx.newFeature).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({ shapeType: 'ellipse' }),
        }),
      );
      expect(ctx.addFeature).toHaveBeenCalled();
    });

    it('sollte dragPan deaktivieren', () => {
      expect(ctx.map.dragPan.disable).toHaveBeenCalled();
    });

    it('sollte initialen State zurückgeben', () => {
      expect(state.center).toBeNull();
      expect(state.currentRadiusX).toBe(0);
      expect(state.currentRadiusY).toBe(0);
      expect(state.isDrawing).toBe(false);
    });
  });

  describe('onMouseDown', () => {
    it('sollte Mittelpunkt setzen und Drawing starten', () => {
      EllipseMode.onMouseDown.call(ctx, state, { lngLat: { lng: 7.0, lat: 50.0 } });

      expect(state.center).toEqual([7.0, 50.0]);
      expect(state.isDrawing).toBe(true);
    });
  });

  describe('onDrag', () => {
    it('sollte Radien berechnen und Polygon aktualisieren', async () => {
      const { berechneAbstand, erstelleEllipse } = await import('../../../utils/geo-calculations');

      EllipseMode.onMouseDown.call(ctx, state, { lngLat: { lng: 7.0, lat: 50.0 } });
      EllipseMode.onDrag.call(ctx, state, { lngLat: { lng: 7.1, lat: 50.1 } });

      // X-Radius: Abstand horizontal (gleicher Breitengrad)
      expect(berechneAbstand).toHaveBeenCalledWith([7.0, 50.0], [7.1, 50.0]);
      // Y-Radius: Abstand vertikal (gleicher Längengrad)
      expect(berechneAbstand).toHaveBeenCalledWith([7.0, 50.0], [7.0, 50.1]);
      expect(erstelleEllipse).toHaveBeenCalled();
      expect(state.polygon.incomingCoords).toHaveBeenCalled();
    });

    it('sollte nichts tun wenn nicht im Drawing-Modus', () => {
      EllipseMode.onDrag.call(ctx, state, { lngLat: { lng: 7.1, lat: 50.1 } });

      expect(state.polygon.incomingCoords).not.toHaveBeenCalled();
    });

    it('sollte Mindestradius von 1m garantieren', async () => {
      const { berechneAbstand } = await import('../../../utils/geo-calculations');
      vi.mocked(berechneAbstand).mockReturnValue(0.5);

      EllipseMode.onMouseDown.call(ctx, state, { lngLat: { lng: 7.0, lat: 50.0 } });
      EllipseMode.onDrag.call(ctx, state, { lngLat: { lng: 7.0001, lat: 50.0001 } });

      // Beide Radien < 1 → kein Update
      expect(state.polygon.incomingCoords).not.toHaveBeenCalled();
    });
  });

  describe('onMouseUp', () => {
    it('sollte Feature-Event feuern bei gültigem Polygon', () => {
      state.center = [7.0, 50.0];
      state.isDrawing = true;
      state.currentRadiusX = 100;
      state.currentRadiusY = 50;
      // Gültiges Polygon (genug Koordinaten)
      state.polygon.coordinates = [
        [
          [7.0, 50.001],
          [7.001, 50.0],
          [7.0, 49.999],
          [6.999, 50.0],
          [7.0, 50.001],
        ],
      ];

      EllipseMode.onMouseUp.call(ctx, state);

      expect(ctx.fire).toHaveBeenCalledWith('draw.create', {
        features: [state.polygon.toGeoJSON()],
      });
      expect(ctx.changeMode).toHaveBeenCalledWith('simple_select', {
        featureIds: ['poly-1'],
      });
    });

    it('sollte Shape-Properties am Feature setzen', () => {
      state.center = [7.0, 50.0];
      state.isDrawing = true;
      state.currentRadiusX = 100;
      state.currentRadiusY = 50;
      state.polygon.coordinates = [
        [
          [7.0, 50.001],
          [7.001, 50.0],
          [7.0, 49.999],
          [6.999, 50.0],
          [7.0, 50.001],
        ],
      ];

      EllipseMode.onMouseUp.call(ctx, state);

      expect(state.polygon.properties.shapeCenter).toBe(JSON.stringify([7.0, 50.0]));
      expect(state.polygon.properties.shapeRadiusX).toBe(100);
      expect(state.polygon.properties.shapeRadiusY).toBe(50);
    });

    it('sollte Feature löschen bei zu wenig Koordinaten', () => {
      state.center = [7.0, 50.0];
      state.isDrawing = true;
      state.polygon.coordinates = [[[7.0, 50.0]]];

      EllipseMode.onMouseUp.call(ctx, state);

      expect(ctx.deleteFeature).toHaveBeenCalledWith('poly-1');
      expect(ctx.fire).not.toHaveBeenCalled();
    });

    it('sollte dragPan wieder aktivieren', () => {
      state.center = [7.0, 50.0];
      state.isDrawing = true;
      state.polygon.coordinates = [[]];

      EllipseMode.onMouseUp.call(ctx, state);

      expect(ctx.map.dragPan.enable).toHaveBeenCalled();
    });

    it('sollte nichts tun wenn nicht im Drawing-Modus', () => {
      EllipseMode.onMouseUp.call(ctx, state);

      expect(ctx.fire).not.toHaveBeenCalled();
    });
  });

  describe('toDisplayFeatures', () => {
    it('sollte gültiges Polygon anzeigen', () => {
      const display = vi.fn();
      const geojson = {
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

      EllipseMode.toDisplayFeatures.call(ctx, state, geojson, display);

      expect(display).toHaveBeenCalledWith(geojson);
    });

    it('sollte Polygon mit weniger als 4 Punkten überspringen', () => {
      const display = vi.fn();
      const geojson = {
        geometry: {
          type: 'Polygon',
          coordinates: [[[7.0, 50.0]]],
        },
      };

      EllipseMode.toDisplayFeatures.call(ctx, state, geojson, display);

      expect(display).not.toHaveBeenCalled();
    });

    it('sollte Nicht-Polygon direkt anzeigen', () => {
      const display = vi.fn();
      const geojson = {
        geometry: { type: 'Point', coordinates: [7.0, 50.0] },
      };

      EllipseMode.toDisplayFeatures.call(ctx, state, geojson, display);

      expect(display).toHaveBeenCalledWith(geojson);
    });
  });

  describe('onStop', () => {
    it('sollte Feature löschen wenn ungültig', () => {
      state.polygon.coordinates = [[]];

      EllipseMode.onStop.call(ctx, state);

      expect(ctx.deleteFeature).toHaveBeenCalledWith('poly-1');
    });

    it('sollte dragPan aktivieren', () => {
      state.polygon.coordinates = [
        [
          [7.0, 50.0],
          [7.1, 50.1],
          [7.2, 50.0],
          [7.0, 50.0],
        ],
      ];

      EllipseMode.onStop.call(ctx, state);

      expect(ctx.map.dragPan.enable).toHaveBeenCalled();
    });
  });
});
