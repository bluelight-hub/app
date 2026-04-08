/**
 * Freihand-Zeichenmodus für MapboxDraw
 *
 * Zeichnet einen LineString durch Mausbewegung bei gedrückter Maustaste.
 * Implementiert das MapboxDraw Custom Mode Interface.
 */

/** Interner State des Freihand-Modus */
interface FreehandState {
  line: { id: string; coordinates: number[][]; addCoordinate: (idx: number, lng: number, lat: number) => void };
  isDrawing: boolean;
}

// MapboxDraw Custom Mode Interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FreehandMode: any = {};

FreehandMode.onSetup = function (): FreehandState {
  const line = this.newFeature({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [] },
    properties: { featureType: 'drawing' },
  });
  this.addFeature(line);
  this.setActionableState({ trash: true, combineFeatures: false, uncombineFeatures: false });
  // dragPan deaktivieren, damit onMouseMove auch bei gedrückter Maustaste feuert
  this.map.dragPan.disable();
  return { line, isDrawing: false };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
FreehandMode.onMouseDown = function (state: FreehandState, e: any) {
  state.isDrawing = true;
  state.line.addCoordinate(0, e.lngLat.lng, e.lngLat.lat);
};

// onDrag feuert bei Mausbewegung MIT gedrückter Taste (onMouseMove nur OHNE)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
FreehandMode.onDrag = function (state: FreehandState, e: any) {
  if (!state.isDrawing) return;
  state.line.addCoordinate(state.line.coordinates.length, e.lngLat.lng, e.lngLat.lat);
};

FreehandMode.onMouseUp = function (state: FreehandState) {
  if (!state.isDrawing) return;
  state.isDrawing = false;

  // Feature finalisieren wenn genügend Koordinaten
  if (state.line.coordinates.length < 2) {
    this.deleteFeature(state.line.id);
  } else {
    // draw.create explizit feuern (wie built-in Modes, z.B. draw_point)
    // suppressAPIEvents=true verhindert automatisches Feuern bei addFeature
    this.fire('draw.create', { features: [state.line.toGeoJSON()] });
  }
  this.map.dragPan.enable();
  this.changeMode('simple_select', { featureIds: [state.line.id] });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
FreehandMode.toDisplayFeatures = function (_state: FreehandState, geojson: any, display: any) {
  if (geojson.geometry.type === 'LineString' && (geojson.geometry.coordinates?.length ?? 0) < 2) return;
  if (geojson.geometry.type === 'Polygon') {
    const ring = geojson.geometry.coordinates?.[0];
    if (!ring || ring.length < 4) return;
  }
  display(geojson);
};

FreehandMode.onStop = function (state: FreehandState) {
  if (state.line.coordinates.length < 2) {
    this.deleteFeature(state.line.id);
  }
  this.map.dragPan.enable();
};

export { FreehandMode };
