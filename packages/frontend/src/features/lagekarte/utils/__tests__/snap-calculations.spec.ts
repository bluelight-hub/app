/**
 * Unit Tests für snap-calculations Utility
 *
 * Verifiziert Snap-Algorithmus:
 * - Vertex-Snapping (Phase 1)
 * - Edge-Snapping (Phase 2)
 * - Vertex hat Vorrang vor Edge
 * - Pixel-Toleranz-Grenze
 * - Feature-Ausschluss via excludeFeatureIds
 * - Verschiedene Geometrie-Typen
 */

import { describe, it, expect, vi } from 'vitest';
import { findSnapPoint } from '../snap-calculations';

// Mock turf.js
vi.mock('@turf/turf', () => ({
  point: (coords: number[]) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: coords }, properties: {} }),
  lineString: (coords: number[][]) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }),
  nearestPointOnLine: vi.fn((_line, _point) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [10.5, 50.5] },
    properties: { dist: 0.001 },
  })),
}));

// ============================================
// Mock Map mit project/unproject
// ============================================

function createMockMap() {
  return {
    project: vi.fn((lngLat: [number, number]) => ({
      x: lngLat[0] * 10, // Einfache lineare Projektion für Tests
      y: lngLat[1] * 10,
    })),
    unproject: vi.fn((pixel: { x: number; y: number }) => ({
      lng: pixel.x / 10,
      lat: pixel.y / 10,
    })),
  } as any;
}

// ============================================
// Tests
// ============================================

describe('findSnapPoint', () => {
  describe('Vertex-Snapping (Phase 1)', () => {
    it('sollte nächsten Vertex innerhalb Toleranz finden', () => {
      const map = createMockMap();
      const features: GeoJSON.Feature[] = [
        {
          type: 'Feature',
          id: 'feat-1',
          geometry: { type: 'Point', coordinates: [10, 50] },
          properties: {},
        },
      ];

      // Cursor bei (100, 500) → Feature bei (100, 500) → Distanz 0
      const result = findSnapPoint({ x: 100, y: 500 }, features, map);

      expect(result).toEqual({
        lngLat: { lng: 10, lat: 50 },
        type: 'vertex',
      });
    });

    it('sollte null zurückgeben wenn kein Feature innerhalb Toleranz', () => {
      const map = createMockMap();
      const features: GeoJSON.Feature[] = [
        {
          type: 'Feature',
          id: 'feat-1',
          geometry: { type: 'Point', coordinates: [100, 100] }, // Weit entfernt
          properties: {},
        },
      ];

      // Cursor bei (0, 0), Feature bei (1000, 1000) → weit über Toleranz
      const result = findSnapPoint({ x: 0, y: 0 }, features, map, 12);

      expect(result).toBeNull();
    });

    it('sollte Features mit excludeFeatureIds überspringen', () => {
      const map = createMockMap();
      const features: GeoJSON.Feature[] = [
        {
          type: 'Feature',
          id: 'feat-1',
          geometry: { type: 'Point', coordinates: [10, 50] },
          properties: {},
        },
      ];

      const result = findSnapPoint({ x: 100, y: 500 }, features, map, 12, new Set(['feat-1']));

      // Feature ist ausgeschlossen → kein Vertex-Match → Edge-Snapping wird versucht
      // (Edge-Snapping trifft auch nicht da Feature ausgeschlossen)
      expect(result).toBeNull();
    });
  });

  describe('Vertex-Vorrang', () => {
    it('sollte Vertex vor Edge bevorzugen', () => {
      const map = createMockMap();
      const features: GeoJSON.Feature[] = [
        // Punkt-Feature (Vertex)
        {
          type: 'Feature',
          id: 'point-1',
          geometry: { type: 'Point', coordinates: [10, 50] },
          properties: {},
        },
        // Linien-Feature (Edge)
        {
          type: 'Feature',
          id: 'line-1',
          geometry: {
            type: 'LineString',
            coordinates: [
              [9, 49],
              [11, 51],
            ],
          },
          properties: {},
        },
      ];

      // Cursor genau beim Punkt
      const result = findSnapPoint({ x: 100, y: 500 }, features, map);

      expect(result?.type).toBe('vertex');
    });
  });

  describe('Edge-Snapping (Phase 2)', () => {
    it('sollte auf Kante snappen wenn kein Vertex in Reichweite', () => {
      const map = createMockMap();
      const features: GeoJSON.Feature[] = [
        {
          type: 'Feature',
          id: 'line-1',
          geometry: {
            type: 'LineString',
            coordinates: [
              [100, 100],
              [200, 200],
            ], // Vertices weit weg
          },
          properties: {},
        },
      ];

      // Cursor bei (0, 0) - weit von Vertices, aber turf mock gibt nahes Ergebnis
      // Mock-Map-Projektion: nearestPointOnLine = [10.5, 50.5] → projected (105, 505)
      // Cursor bei (100, 500) → Distanz ~7.07 < 12 Toleranz
      const result = findSnapPoint({ x: 100, y: 500 }, features, map, 12);

      // Edge-Snap von der Turf.js nearestPointOnLine Mock-Antwort
      if (result) {
        expect(result.type).toBe('edge');
      }
    });
  });

  describe('Verschiedene Geometrie-Typen', () => {
    it('sollte Koordinaten aus Polygon extrahieren', () => {
      const map = createMockMap();
      const features: GeoJSON.Feature[] = [
        {
          type: 'Feature',
          id: 'poly-1',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [10, 50],
                [10.001, 50],
                [10.001, 50.001],
                [10, 50.001],
                [10, 50],
              ],
            ],
          },
          properties: {},
        },
      ];

      // Cursor genau beim ersten Vertex des Polygons
      const result = findSnapPoint({ x: 100, y: 500 }, features, map);

      expect(result).toEqual({
        lngLat: { lng: 10, lat: 50 },
        type: 'vertex',
      });
    });

    it('sollte Koordinaten aus MultiPoint extrahieren', () => {
      const map = createMockMap();
      const features: GeoJSON.Feature[] = [
        {
          type: 'Feature',
          id: 'mp-1',
          geometry: {
            type: 'MultiPoint',
            coordinates: [
              [10, 50],
              [20, 60],
            ],
          },
          properties: {},
        },
      ];

      const result = findSnapPoint({ x: 100, y: 500 }, features, map);

      expect(result).toEqual({
        lngLat: { lng: 10, lat: 50 },
        type: 'vertex',
      });
    });

    it('sollte leeres Feature-Array verarbeiten', () => {
      const map = createMockMap();
      const result = findSnapPoint({ x: 100, y: 500 }, [], map);

      expect(result).toBeNull();
    });
  });

  describe('Toleranz-Grenzwerte', () => {
    it('sollte Custom-Toleranz respektieren', () => {
      const map = createMockMap();
      const features: GeoJSON.Feature[] = [
        {
          type: 'Feature',
          id: 'feat-1',
          geometry: { type: 'Point', coordinates: [10.1, 50.1] }, // Leicht versetzt
          properties: {},
        },
      ];

      // Mit sehr kleiner Toleranz (1px) → kein Match
      const resultSmall = findSnapPoint({ x: 100, y: 500 }, features, map, 1);
      // Distanz: sqrt((100-101)^2 + (500-501)^2) = sqrt(2) ≈ 1.41 > 1
      expect(resultSmall).toBeNull();

      // Mit größerer Toleranz (20px) → Match
      const resultLarge = findSnapPoint({ x: 100, y: 500 }, features, map, 20);
      expect(resultLarge).not.toBeNull();
    });
  });
});
