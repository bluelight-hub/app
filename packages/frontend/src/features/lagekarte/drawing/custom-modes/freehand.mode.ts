/**
 * Freihand-Zeichenmodus für MapboxDraw
 *
 * Zeichnet einen LineString durch Mausbewegung bei gedrückter Maustaste.
 * Implementiert das MapboxDraw Custom Mode Interface.
 */

// MapboxDraw Custom Mode Interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FreehandMode: any = {};

FreehandMode.onSetup = function () {
  const line = this.newFeature({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [] },
    properties: { featureType: 'drawing' },
  });
  this.addFeature(line);
  this.setActionableState({ trash: true, combineFeatures: false, uncombineFeatures: false });
  return { line, isDrawing: false };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
FreehandMode.onMouseDown = function (state: any, e: any) {
  state.isDrawing = true;
  state.line.addCoordinate(0, e.lngLat.lng, e.lngLat.lat);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
FreehandMode.onMouseMove = function (state: any, e: any) {
  if (!state.isDrawing) return;
  state.line.addCoordinate(state.line.coordinates.length, e.lngLat.lng, e.lngLat.lat);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
FreehandMode.onMouseUp = function (state: any) {
  if (!state.isDrawing) return;
  state.isDrawing = false;

  // Feature finalisieren wenn genügend Koordinaten
  if (state.line.coordinates.length < 2) {
    this.deleteFeature(state.line.id);
  }
  this.changeMode('simple_select', { featureIds: [state.line.id] });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
FreehandMode.toDisplayFeatures = function (_state: any, geojson: any, display: any) {
  display(geojson);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
FreehandMode.onStop = function (state: any) {
  if (state.line.coordinates.length < 2) {
    this.deleteFeature(state.line.id);
  }
};

export { FreehandMode };
