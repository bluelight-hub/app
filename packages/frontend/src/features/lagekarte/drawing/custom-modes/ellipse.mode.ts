/**
 * Ellipse-Zeichenmodus für MapboxDraw
 *
 * Zeichnet eine Ellipse durch Klick (Mittelpunkt) + Drag (Radien).
 * Die horizontale Distanz bestimmt den X-Radius, die vertikale den Y-Radius.
 * Ergebnis ist ein Polygon (64-Punkt-Approximation via turf.ellipse).
 */

import { berechneAbstand, erstelleEllipse } from '../../utils/geo-calculations';

/** Interner State des Ellipse-Modus */
interface EllipseState {
  polygon: {
    id: string;
    properties: Record<string, unknown>;
    coordinates: number[][][];
    incomingCoords: (coords: number[][][]) => void;
    toGeoJSON: () => GeoJSON.Feature;
  };
  center: [number, number] | null;
  currentRadiusX: number;
  currentRadiusY: number;
  isDrawing: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EllipseMode: any = {};

EllipseMode.onSetup = function (): EllipseState {
  const polygon = this.newFeature({
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[]] },
    properties: { featureType: 'drawing', shapeType: 'ellipse' },
  });
  this.addFeature(polygon);
  this.setActionableState({ trash: true, combineFeatures: false, uncombineFeatures: false });
  this.map.dragPan.disable();
  return { polygon, center: null, currentRadiusX: 0, currentRadiusY: 0, isDrawing: false };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
EllipseMode.onMouseDown = function (state: EllipseState, e: any) {
  state.center = [e.lngLat.lng, e.lngLat.lat];
  state.isDrawing = true;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
EllipseMode.onDrag = function (state: EllipseState, e: any) {
  if (!state.isDrawing || !state.center) return;

  // X-Radius aus horizontaler Distanz, Y-Radius aus vertikaler Distanz
  const radiusX = berechneAbstand(state.center, [e.lngLat.lng, state.center[1]]);
  const radiusY = berechneAbstand(state.center, [state.center[0], e.lngLat.lat]);
  if (radiusX < 1 && radiusY < 1) return;

  // Mindestradius von 1m für beide Achsen
  state.currentRadiusX = Math.max(1, radiusX);
  state.currentRadiusY = Math.max(1, radiusY);

  const coords = erstelleEllipse(state.center, state.currentRadiusX, state.currentRadiusY);
  state.polygon.incomingCoords(coords);
};

EllipseMode.onMouseUp = function (state: EllipseState) {
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
  state.polygon.properties.shapeRadiusX = state.currentRadiusX;
  state.polygon.properties.shapeRadiusY = state.currentRadiusY;

  this.fire('draw.create', { features: [state.polygon.toGeoJSON()] });
  this.changeMode('simple_select', { featureIds: [state.polygon.id] });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
EllipseMode.toDisplayFeatures = function (_state: EllipseState, geojson: any, display: any) {
  if (geojson.geometry.type === 'Polygon') {
    const ring = geojson.geometry.coordinates?.[0];
    if (!ring || ring.length < 4) return;
  }
  display(geojson);
};

EllipseMode.onStop = function (state: EllipseState) {
  try {
    if ((state.polygon.coordinates[0]?.length ?? 0) < 3) {
      this.deleteFeature(state.polygon.id);
    }
  } catch {
    // Feature wurde bereits in onMouseUp gelöscht
  }
  this.map.dragPan.enable();
};

export { EllipseMode };
