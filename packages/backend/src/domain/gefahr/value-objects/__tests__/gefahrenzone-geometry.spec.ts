import { GefahrenzoneGeometry, GEFAHRENZONE_GEOMETRY_ERROR_CODES } from '../gefahrenzone-geometry';

describe('GefahrenzoneGeometry', () => {
  const validSquare = {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [10.0, 50.0],
          [10.1, 50.0],
          [10.1, 50.1],
          [10.0, 50.1],
          [10.0, 50.0],
        ],
      ],
    },
  };

  describe('fromFeature', () => {
    it('akzeptiert ein gültiges Polygon-Feature', () => {
      const result = GefahrenzoneGeometry.fromFeature(validSquare);
      expect(result.isSuccess).toBe(true);
      expect(result.value?.toJSON().geometry.coordinates[0]).toHaveLength(5);
    });

    it('weist Nicht-Feature-Objekte ab', () => {
      const result = GefahrenzoneGeometry.fromFeature({ type: 'Polygon', coordinates: [] });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(GEFAHRENZONE_GEOMETRY_ERROR_CODES.INVALID_FEATURE);
    });

    it('weist Features mit Non-Polygon-Geometrie ab', () => {
      const result = GefahrenzoneGeometry.fromFeature({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [10, 50] },
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(GEFAHRENZONE_GEOMETRY_ERROR_CODES.INVALID_GEOMETRY_TYPE);
    });

    it('weist leere Coordinates ab', () => {
      const result = GefahrenzoneGeometry.fromFeature({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(GEFAHRENZONE_GEOMETRY_ERROR_CODES.EMPTY_COORDINATES);
    });

    it('weist Ringe unter Mindestlänge ab (3 Positionen)', () => {
      const result = GefahrenzoneGeometry.fromFeature({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [10.0, 50.0],
              [10.1, 50.0],
              [10.0, 50.0],
            ],
          ],
        },
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(GEFAHRENZONE_GEOMETRY_ERROR_CODES.TOO_FEW_POINTS);
    });

    it('weist ungültige Koordinaten ab (Longitude > 180)', () => {
      const result = GefahrenzoneGeometry.fromFeature({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [200, 50],
              [10.1, 50],
              [10.1, 50.1],
              [10, 50.1],
              [200, 50],
            ],
          ],
        },
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(GEFAHRENZONE_GEOMETRY_ERROR_CODES.INVALID_COORDINATE);
    });

    it('weist unclosed Ring mit genug Punkten ab', () => {
      const result = GefahrenzoneGeometry.fromFeature({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [10, 50],
              [11, 50],
              [11, 51],
              [10, 51],
              [10.5, 50.5],
            ],
          ],
        },
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(GEFAHRENZONE_GEOMETRY_ERROR_CODES.UNCLOSED_RING);
    });
  });

  describe('fromCircle', () => {
    it('erzeugt ein 65-Punkte-Polygon (64 + Schluss)', () => {
      const result = GefahrenzoneGeometry.fromCircle([10, 50], 500);
      expect(result.isSuccess).toBe(true);
      const ring = result.value?.toJSON().geometry.coordinates[0];
      expect(ring).toHaveLength(65);
      expect(ring?.[0]).toEqual(ring?.[64]);
    });

    it('speichert Circle-Hint in properties', () => {
      const result = GefahrenzoneGeometry.fromCircle([10, 50], 500);
      expect(result.isSuccess).toBe(true);
      const props = result.value?.toJSON().properties as { circle?: { radiusMeters: number } } | null;
      expect(props?.circle?.radiusMeters).toBe(500);
    });

    it('weist Radius ≤ 0 ab', () => {
      const result = GefahrenzoneGeometry.fromCircle([10, 50], 0);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(GEFAHRENZONE_GEOMETRY_ERROR_CODES.INVALID_RADIUS);
    });

    it('weist ungültige Zentrum-Koordinaten ab', () => {
      const result = GefahrenzoneGeometry.fromCircle([400, 50], 500);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(GEFAHRENZONE_GEOMETRY_ERROR_CODES.INVALID_COORDINATE);
    });

    it('liegt die Kreis-Entfernung grob beim gewünschten Radius (Toleranz ±5 %)', () => {
      const radiusMeters = 1000;
      const center: [number, number] = [10, 50];
      const result = GefahrenzoneGeometry.fromCircle(center, radiusMeters);
      expect(result.isSuccess).toBe(true);
      const ring = result.value!.toJSON().geometry.coordinates[0]!;
      // Prüfe Abstand vom Zentrum für einige Punkte (Haversine-Approximation)
      const [lng0, lat0] = center;
      for (let i = 0; i < 64; i += 8) {
        const point = ring[i]!;
        const dLat = toRad(point[1] - lat0);
        const dLng = toRad(point[0] - lng0);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat0)) * Math.cos(toRad(point[1])) * Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = 6_378_137 * c;
        expect(distance).toBeGreaterThan(radiusMeters * 0.95);
        expect(distance).toBeLessThan(radiusMeters * 1.05);
      }
    });
  });
});

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
