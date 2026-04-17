import { describe, expect, it } from 'vitest';
import { isPointInGeoJsonPolygon } from '../point-in-polygon';

const square = {
  type: 'Feature' as const,
  properties: {},
  geometry: {
    type: 'Polygon' as const,
    coordinates: [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ],
  },
};

const squareWithHole = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [0, 0],
      [20, 0],
      [20, 20],
      [0, 20],
      [0, 0],
    ],
    [
      [5, 5],
      [15, 5],
      [15, 15],
      [5, 15],
      [5, 5],
    ],
  ],
};

describe('isPointInGeoJsonPolygon', () => {
  it('Punkt im Inneren ist drinnen', () => {
    expect(isPointInGeoJsonPolygon({ lng: 5, lat: 5 }, square)).toBe(true);
  });

  it('Punkt außerhalb ist draußen', () => {
    expect(isPointInGeoJsonPolygon({ lng: 20, lat: 20 }, square)).toBe(false);
  });

  it('Punkt im Loch gilt als draußen', () => {
    expect(isPointInGeoJsonPolygon({ lng: 10, lat: 10 }, squareWithHole)).toBe(false);
  });

  it('Punkt zwischen Loch und Außenring ist drinnen', () => {
    expect(isPointInGeoJsonPolygon({ lng: 2, lat: 2 }, squareWithHole)).toBe(true);
  });

  it('null/undefined/ungültig → draußen', () => {
    expect(isPointInGeoJsonPolygon({ lng: 0, lat: 0 }, null)).toBe(false);
    expect(isPointInGeoJsonPolygon({ lng: 0, lat: 0 }, undefined)).toBe(false);
    expect(isPointInGeoJsonPolygon({ lng: 0, lat: 0 }, { type: 'Point' })).toBe(false);
  });

  it('entpackt GeoJSON-Feature', () => {
    expect(isPointInGeoJsonPolygon({ lng: 5, lat: 5 }, square)).toBe(true);
  });
});
