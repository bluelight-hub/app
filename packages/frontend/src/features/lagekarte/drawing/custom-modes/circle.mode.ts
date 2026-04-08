/**
 * Kreis-Zeichenmodus für MapboxDraw
 *
 * Zeichnet einen Kreis durch Klick (Mittelpunkt) + Drag (Radius).
 * Ergebnis ist ein Polygon (64-Punkt-Approximation via turf.circle).
 */

import { berechneAbstand, erstelleKreis } from '../../utils/geo-calculations';

/** Interner State des Kreis-Modus */
interface CircleState {
  polygon: {
    id: string;
    properties: Record<string, unknown>;
    coordinates: number[][][];
    incomingCoords: (coords: number[][][]) => void;
    toGeoJSON: () => GeoJSON.Feature;
  };
  center: [number, number] | null;
  currentRadius: number;
  isDrawing: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CircleMode: any = {};

CircleMode.onSetup = function (): CircleState {
  const polygon = this.newFeature({
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[]] },
    properties: { featureType: 'drawing', shapeType: 'circle' },
  });
  this.addFeature(polygon);
  this.setActionableState({ trash: true, combineFeatures: false, uncombineFeatures: false });
  this.map.dragPan.disable();
  return { polygon, center: null, currentRadius: 0, isDrawing: false };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
CircleMode.onMouseDown = function (state: CircleState, e: any) {
  state.center = [e.lngLat.lng, e.lngLat.lat];
  state.isDrawing = true;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
CircleMode.onDrag = function (state: CircleState, e: any) {
  if (!state.isDrawing || !state.center) return;

  const current: [number, number] = [e.lngLat.lng, e.lngLat.lat];
  const radius = berechneAbstand(state.center, current);
  if (radius < 1) return;

  state.currentRadius = radius;
  const coords = erstelleKreis(state.center, radius);
  state.polygon.incomingCoords(coords);
};

CircleMode.onMouseUp = function (state: CircleState) {
  if (!state.isDrawing || !state.center) return;
  state.isDrawing = false;
  this.map.dragPan.enable();

  if ((state.polygon.coordinates[0]?.length ?? 0) < 3) {
    this.deleteFeature(state.polygon.id);
    this.changeMode('simple_select');
    return;
  }

  // Shape-Properties direkt am Feature setzen (vor draw.create)
  state.polygon.properties.shapeCenter = JSON.stringify(state.center);
  state.polygon.properties.shapeRadius = state.currentRadius;

  this.fire('draw.create', { features: [state.polygon.toGeoJSON()] });
  this.changeMode('simple_select', { featureIds: [state.polygon.id] });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
CircleMode.toDisplayFeatures = function (_state: CircleState, geojson: any, display: any) {
  // Polygon ohne gültige Koordinaten nicht rendern (wie built-in draw_polygon).
  // Ohne diesen Guard erzeugt ein leeres Polygon ungültiges GeoJSON ([[undefined]]),
  // das MapboxGL dazu bringt, die gesamte Source nicht zu rendern.
  if (geojson.geometry.type === 'Polygon') {
    const ring = geojson.geometry.coordinates?.[0];
    if (!ring || ring.length < 4) return;
  }
  display(geojson);
};

CircleMode.onStop = function (state: CircleState) {
  if ((state.polygon.coordinates[0]?.length ?? 0) < 3) {
    this.deleteFeature(state.polygon.id);
  }
  this.map.dragPan.enable();
};

export { CircleMode };
