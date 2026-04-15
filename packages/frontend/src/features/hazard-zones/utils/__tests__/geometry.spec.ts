import { describe, it, expect } from 'vitest';
import type { HazardZoneDto } from '@bluelight-hub/shared/client';
import { circleToPolygon, hazardZoneToGeoJsonFeature, hazardZonesToFeatureCollection } from '../geometry';

describe('circleToPolygon', () => {
  it('erzeugt einen geschlossenen Ring mit 65 Punkten (64 Segmente + Schließpunkt)', () => {
    const points = circleToPolygon([7.0, 50.0], 100);
    expect(points).toHaveLength(65);
    expect(points[0]).toEqual(points[points.length - 1]);
  });

  it('gibt Punkte in der Nähe des Mittelpunkts zurück', () => {
    const points = circleToPolygon([7.0, 50.0], 50);
    for (const [lng, lat] of points) {
      expect(Math.abs(lng - 7.0)).toBeLessThan(0.1);
      expect(Math.abs(lat - 50.0)).toBeLessThan(0.1);
    }
  });
});

describe('hazardZoneToGeoJsonFeature', () => {
  it('konvertiert eine Polygon-Zone 1:1 zu einem Polygon-Feature', () => {
    const zone: HazardZoneDto = {
      id: 'zone-1',
      einsatzId: 'e1',
      gefahrentyp: 'BRAND',
      geometryType: 'POLYGON',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [7.0, 50.0],
            [7.1, 50.0],
            [7.1, 50.1],
            [7.0, 50.1],
            [7.0, 50.0],
          ],
        ],
      },
      radiusMeters: null,
      label: null,
      beschreibung: null,
      maxWarnstufe: 'MITTEL',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'u',
      updatedBy: 'u',
    };

    const feature = hazardZoneToGeoJsonFeature(zone);
    expect(feature.type).toBe('Feature');
    expect(feature.id).toBe('zone-1');
    expect(feature.geometry.type).toBe('Polygon');
    expect(feature.geometry.coordinates[0]).toHaveLength(5);
    expect(feature.properties).toEqual(zone);
  });

  it('konvertiert eine Kreis-Zone in ein Polygon-Approximation', () => {
    const zone: HazardZoneDto = {
      id: 'zone-2',
      einsatzId: 'e1',
      gefahrentyp: 'CHEMISCHE_STOFFE',
      geometryType: 'CIRCLE',
      geometry: { type: 'Point', coordinates: [7.0, 50.0] },
      radiusMeters: 200,
      label: null,
      beschreibung: null,
      maxWarnstufe: 'HOCH',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'u',
      updatedBy: 'u',
    };

    const feature = hazardZoneToGeoJsonFeature(zone);
    expect(feature.geometry.type).toBe('Polygon');
    expect(feature.geometry.coordinates[0].length).toBeGreaterThanOrEqual(4);
  });
});

describe('hazardZonesToFeatureCollection', () => {
  it('konvertiert eine leere Liste in eine leere FeatureCollection', () => {
    const fc = hazardZonesToFeatureCollection([]);
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toEqual([]);
  });
});
