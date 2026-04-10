/**
 * Pfeil-Zeichenmodus für MapboxDraw
 *
 * Zeichnet einen Pfeil durch Klick (Startpunkt) + Drag (Endpunkt).
 * Ergebnis ist ein LineString mit shapeType 'arrow'.
 * Die Pfeilspitze wird als zusätzliches Display-Feature (Point mit meta 'arrowhead')
 * im toDisplayFeatures-Callback erzeugt und über einen Symbol-Layer gerendert.
 */

import { erzeugeArrowDisplay } from '../arrow-display';

/** Interner State des Pfeil-Modus */
interface ArrowState {
  line: {
    id: string;
    coordinates: number[][];
    addCoordinate: (idx: number, lng: number, lat: number) => void;
    updateCoordinate: (idx: string, lng: number, lat: number) => void;
    toGeoJSON: () => GeoJSON.Feature;
  };
  start: [number, number] | null;
  isDrawing: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ArrowMode: any = {};

ArrowMode.onSetup = function (): ArrowState {
  const line = this.newFeature({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [] },
    properties: { featureType: 'drawing', shapeType: 'arrow' },
  });
  this.addFeature(line);
  this.setActionableState({ trash: true, combineFeatures: false, uncombineFeatures: false });
  this.map.dragPan.disable();
  return { line, start: null, isDrawing: false };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
ArrowMode.onMouseDown = function (state: ArrowState, e: any) {
  state.start = [e.lngLat.lng, e.lngLat.lat];
  state.isDrawing = true;
  // Start- und Endpunkt initialisieren (Endpunkt wird beim Drag aktualisiert)
  state.line.addCoordinate(0, e.lngLat.lng, e.lngLat.lat);
  state.line.addCoordinate(1, e.lngLat.lng, e.lngLat.lat);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
ArrowMode.onDrag = function (state: ArrowState, e: any) {
  if (!state.isDrawing || !state.start) return;
  state.line.updateCoordinate('1', e.lngLat.lng, e.lngLat.lat);
};

ArrowMode.onMouseUp = function (state: ArrowState) {
  if (!state.isDrawing || !state.start) return;
  state.isDrawing = false;
  this.map.dragPan.enable();

  if (state.line.coordinates.length < 2) {
    this.deleteFeature(state.line.id);
    this.changeMode('simple_select');
    return;
  }

  // Mindestlänge prüfen (Start !== Ende)
  const [startLng, startLat] = state.line.coordinates[0];
  const [endLng, endLat] = state.line.coordinates[1];
  if (startLng === endLng && startLat === endLat) {
    this.deleteFeature(state.line.id);
    this.changeMode('simple_select');
    return;
  }

  this.fire('draw.create', { features: [state.line.toGeoJSON()] });
  this.changeMode('simple_select', { featureIds: [state.line.id] });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
ArrowMode.toDisplayFeatures = function (_state: ArrowState, geojson: any, display: any) {
  if (geojson.geometry.type === 'LineString') {
    const coords = geojson.geometry.coordinates;
    if (!coords || coords.length < 2) return;
    // Gekürzte Linie + Pfeilspitze (Strich endet an Pfeilkopf-Basis)
    erzeugeArrowDisplay(this.map, geojson, display);
    return;
  }
  display(geojson);
};

ArrowMode.onStop = function (state: ArrowState) {
  try {
    if (state.line.coordinates.length < 2) {
      this.deleteFeature(state.line.id);
    }
  } catch {
    // Feature wurde bereits in onMouseUp gelöscht
  }
  this.map.dragPan.enable();
};

export { ArrowMode };
