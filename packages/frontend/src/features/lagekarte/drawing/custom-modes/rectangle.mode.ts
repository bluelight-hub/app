/**
 * Rechteck-Zeichenmodus für MapboxDraw
 *
 * Zeichnet ein Rechteck durch Klick (erste Ecke) + Drag (gegenüberliegende Ecke).
 */

import { erstelleRechteck } from '../../utils/geo-calculations';

/** Interner State des Rechteck-Modus */
interface RectangleState {
  polygon: {
    id: string;
    properties: Record<string, unknown>;
    coordinates: number[][][];
    incomingCoords: (coords: number[][][]) => void;
    toGeoJSON: () => GeoJSON.Feature;
  };
  corner: [number, number] | null;
  isDrawing: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RectangleMode: any = {};

RectangleMode.onSetup = function (): RectangleState {
  const polygon = this.newFeature({
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[]] },
    properties: { featureType: 'drawing', shapeType: 'rectangle' },
  });
  this.addFeature(polygon);
  this.setActionableState({ trash: true, combineFeatures: false, uncombineFeatures: false });
  this.map.dragPan.disable();
  return { polygon, corner: null, isDrawing: false };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
RectangleMode.onMouseDown = function (state: RectangleState, e: any) {
  state.corner = [e.lngLat.lng, e.lngLat.lat];
  state.isDrawing = true;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
RectangleMode.onDrag = function (state: RectangleState, e: any) {
  if (!state.isDrawing || !state.corner) return;

  const current: [number, number] = [e.lngLat.lng, e.lngLat.lat];
  const coords = erstelleRechteck(state.corner, current);
  state.polygon.incomingCoords(coords);
};

RectangleMode.onMouseUp = function (state: RectangleState) {
  if (!state.isDrawing || !state.corner) return;
  state.isDrawing = false;
  this.map.dragPan.enable();

  if ((state.polygon.coordinates[0]?.length ?? 0) < 4) {
    this.deleteFeature(state.polygon.id);
    this.changeMode('simple_select');
    return;
  }

  this.fire('draw.create', { features: [state.polygon.toGeoJSON()] });
  this.changeMode('simple_select', { featureIds: [state.polygon.id] });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
RectangleMode.toDisplayFeatures = function (_state: RectangleState, geojson: any, display: any) {
  if (geojson.geometry.type === 'Polygon') {
    const ring = geojson.geometry.coordinates?.[0];
    if (!ring || ring.length < 4) return;
  }
  display(geojson);
};

RectangleMode.onStop = function (state: RectangleState) {
  if ((state.polygon.coordinates[0]?.length ?? 0) < 4) {
    this.deleteFeature(state.polygon.id);
  }
  this.map.dragPan.enable();
};

export { RectangleMode };
