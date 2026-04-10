/**
 * Unit Tests für arrow-display.ts
 *
 * Verifiziert die Arrow-Display-Logik:
 * - Linie wird ungekürzt angezeigt
 * - Pfeilspitze wird als separates Point-Feature erzeugt
 * - Bearing-Berechnung korrekt übergeben
 * - Edge-Cases (zu wenig Koordinaten)
 */

import { describe, it, expect, vi } from 'vitest';
import { erzeugeArrowDisplay } from '../arrow-display';

vi.mock('../../utils/geo-calculations', () => ({
  berechneBearing: vi.fn().mockReturnValue(45),
}));

describe('erzeugeArrowDisplay', () => {
  const mockMap = {} as any;

  it('sollte Linie und Pfeilspitze anzeigen', () => {
    const display = vi.fn();
    const geojson = {
      type: 'Feature',
      properties: { id: 'feat-1', active: 'true', user_color: '#ff0000', user_strokeWidth: 2 },
      geometry: {
        type: 'LineString',
        coordinates: [
          [7.0, 50.0],
          [7.1, 50.1],
        ],
      },
    };

    erzeugeArrowDisplay(mockMap, geojson, display);

    // Zweimal aufgerufen: Linie + Pfeilspitze
    expect(display).toHaveBeenCalledTimes(2);

    // Erster Aufruf: Original-LineString
    expect(display).toHaveBeenNthCalledWith(1, geojson);

    // Zweiter Aufruf: Pfeilspitze am Endpunkt
    expect(display).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'Feature',
        properties: expect.objectContaining({
          meta: 'arrowhead',
          parent: 'feat-1',
          arrowBearing: 45,
          active: 'true',
          user_color: '#ff0000',
          user_strokeWidth: 2,
        }),
        geometry: {
          type: 'Point',
          coordinates: [7.1, 50.1],
        },
      }),
    );
  });

  it('sollte nichts tun bei weniger als 2 Koordinaten', () => {
    const display = vi.fn();
    const geojson = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [[7.0, 50.0]] },
    };

    erzeugeArrowDisplay(mockMap, geojson, display);

    expect(display).not.toHaveBeenCalled();
  });

  it('sollte nichts tun bei fehlenden Koordinaten', () => {
    const display = vi.fn();
    const geojson = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: null },
    };

    erzeugeArrowDisplay(mockMap, geojson, display);

    expect(display).not.toHaveBeenCalled();
  });

  it('sollte Bearing aus den letzten zwei Koordinaten berechnen', async () => {
    const { berechneBearing } = await import('../../utils/geo-calculations');
    const display = vi.fn();
    const geojson = {
      type: 'Feature',
      properties: { id: 'f1', active: 'false' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [7.0, 50.0],
          [7.5, 50.5],
          [8.0, 51.0],
        ],
      },
    };

    erzeugeArrowDisplay(mockMap, geojson, display);

    // Bearing zwischen vorletzter und letzter Koordinate
    expect(berechneBearing).toHaveBeenCalledWith([7.5, 50.5], [8.0, 51.0]);
  });
});
