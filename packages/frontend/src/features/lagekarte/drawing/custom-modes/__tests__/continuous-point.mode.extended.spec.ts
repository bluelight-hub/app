/**
 * Erweiterte Unit Tests für ContinuousPointMode
 *
 * Ergänzt die bestehenden Tests um:
 * - onSetup: UI-State-Initialisierung
 * - toDisplayFeatures: Feature-Anzeige + Arrow-Pfeilspitzen
 * - onStop: Cleanup
 * - onTrash: Feature-Löschung
 * - onKeyUp: Escape-Handler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContinuousPointMode } from '../continuous-point.mode';

vi.mock('../../../utils/geo-calculations', () => ({
  berechneBearing: vi.fn().mockReturnValue(90),
}));

describe('ContinuousPointMode (erweitert)', () => {
  let ctx: Record<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = {
      clearSelectedFeatures: vi.fn(),
      updateUIClasses: vi.fn(),
      activateUIButton: vi.fn(),
      setActionableState: vi.fn(),
      newFeature: vi.fn(),
      addFeature: vi.fn(),
      fire: vi.fn(),
      deleteFeature: vi.fn(),
      getSelectedIds: vi.fn().mockReturnValue(['f1']),
      changeMode: vi.fn(),
      _ctx: { store: { setDirty: vi.fn() } },
    };
  });

  describe('onSetup', () => {
    it('sollte UI-State korrekt initialisieren', () => {
      ContinuousPointMode.onSetup.call(ctx);

      expect(ctx.clearSelectedFeatures).toHaveBeenCalled();
      expect(ctx.updateUIClasses).toHaveBeenCalledWith({ mouse: 'add' });
      expect(ctx.activateUIButton).toHaveBeenCalledWith('point');
      expect(ctx.setActionableState).toHaveBeenCalledWith({ trash: true });
    });

    it('sollte leeren State zurückgeben', () => {
      const state = ContinuousPointMode.onSetup.call(ctx);
      expect(state).toEqual({});
    });
  });

  describe('toDisplayFeatures', () => {
    it('sollte Feature mit active=false anzeigen', () => {
      const display = vi.fn();
      const geojson = {
        properties: { active: 'true' },
        geometry: { type: 'Point', coordinates: [7.0, 50.0] },
      };

      ContinuousPointMode.toDisplayFeatures.call(ctx, {}, geojson, display);

      expect(geojson.properties.active).toBe('false');
      expect(display).toHaveBeenCalledWith(geojson);
    });

    it('sollte Pfeilspitze für Arrow-Features erzeugen', () => {
      const display = vi.fn();
      const geojson = {
        properties: { id: 'arrow-1', active: 'false', user_shapeType: 'arrow' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [7.0, 50.0],
            [7.5, 50.5],
          ],
        },
      };

      ContinuousPointMode.toDisplayFeatures.call(ctx, {}, geojson, display);

      // Feature selbst + Pfeilspitze
      expect(display).toHaveBeenCalledTimes(2);
      expect(display).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          properties: expect.objectContaining({
            meta: 'arrowhead',
            parent: 'arrow-1',
            arrowBearing: 90,
          }),
          geometry: {
            type: 'Point',
            coordinates: [7.5, 50.5],
          },
        }),
      );
    });

    it('sollte keine Pfeilspitze für Nicht-Arrow-LineStrings erzeugen', () => {
      const display = vi.fn();
      const geojson = {
        properties: { id: 'line-1', active: 'false' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [7.0, 50.0],
            [7.5, 50.5],
          ],
        },
      };

      ContinuousPointMode.toDisplayFeatures.call(ctx, {}, geojson, display);

      // Nur das Feature selbst
      expect(display).toHaveBeenCalledTimes(1);
    });
  });

  describe('onStop', () => {
    it('sollte UI-Button deaktivieren', () => {
      ContinuousPointMode.onStop.call(ctx);

      expect(ctx.activateUIButton).toHaveBeenCalledWith();
    });
  });

  describe('onTrash', () => {
    it('sollte selektierte Features löschen', () => {
      ContinuousPointMode.onTrash.call(ctx);

      expect(ctx.deleteFeature).toHaveBeenCalledWith(['f1']);
    });
  });

  describe('onKeyUp', () => {
    it('sollte bei Escape zu simple_select wechseln', () => {
      ContinuousPointMode.onKeyUp.call(ctx, {}, { keyCode: 27 });

      expect(ctx.changeMode).toHaveBeenCalledWith('simple_select');
    });

    it('sollte andere Tasten ignorieren', () => {
      ContinuousPointMode.onKeyUp.call(ctx, {}, { keyCode: 13 });

      expect(ctx.changeMode).not.toHaveBeenCalled();
    });
  });
});
