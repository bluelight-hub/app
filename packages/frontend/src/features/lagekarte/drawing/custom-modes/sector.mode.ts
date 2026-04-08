/**
 * Sektor/Ausbreitungskegel-Zeichenmodus für MapboxDraw
 *
 * Zeichnet einen Kreissektor durch Klick (Mittelpunkt) + Drag (Richtung + Radius).
 * Die Drag-Richtung bestimmt den Bearing, die Distanz den Radius.
 * Standard-Öffnungswinkel: 60°.
 */

import { berechneAbstand, berechneBearing, erstelleSektor } from '../../utils/geo-calculations';

/** Standard-Öffnungswinkel in Grad */
const DEFAULT_OPENING_ANGLE = 60;

/** Interner State des Sektor-Modus */
interface SectorState {
  polygon: {
    id: string;
    properties: Record<string, unknown>;
    coordinates: number[][][];
    incomingCoords: (coords: number[][][]) => void;
    toGeoJSON: () => GeoJSON.Feature;
  };
  center: [number, number] | null;
  isDrawing: boolean;
  openingAngle: number;
  currentRadius: number;
  currentBearing: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SectorMode: any = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
SectorMode.onSetup = function (options?: any): SectorState {
  const polygon = this.newFeature({
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[]] },
    properties: { featureType: 'drawing', shapeType: 'sector' },
  });
  this.addFeature(polygon);
  this.setActionableState({ trash: true, combineFeatures: false, uncombineFeatures: false });
  this.map.dragPan.disable();
  return {
    polygon,
    center: null,
    isDrawing: false,
    openingAngle: options?.openingAngle ?? DEFAULT_OPENING_ANGLE,
    currentRadius: 0,
    currentBearing: 0,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
SectorMode.onMouseDown = function (state: SectorState, e: any) {
  state.center = [e.lngLat.lng, e.lngLat.lat];
  state.isDrawing = true;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
SectorMode.onDrag = function (state: SectorState, e: any) {
  if (!state.isDrawing || !state.center) return;

  const current: [number, number] = [e.lngLat.lng, e.lngLat.lat];
  const radius = berechneAbstand(state.center, current);
  if (radius < 1) return;

  const bearing = berechneBearing(state.center, current);
  state.currentRadius = radius;
  state.currentBearing = bearing;

  const coords = erstelleSektor(state.center, radius, bearing, state.openingAngle);
  state.polygon.incomingCoords(coords);
};

SectorMode.onMouseUp = function (state: SectorState) {
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
  state.polygon.properties.shapeBearing = state.currentBearing;
  state.polygon.properties.shapeOpeningAngle = state.openingAngle;

  this.fire('draw.create', { features: [state.polygon.toGeoJSON()] });
  this.changeMode('simple_select', { featureIds: [state.polygon.id] });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
SectorMode.toDisplayFeatures = function (_state: SectorState, geojson: any, display: any) {
  if (geojson.geometry.type === 'Polygon') {
    const ring = geojson.geometry.coordinates?.[0];
    if (!ring || ring.length < 4) return;
  }
  display(geojson);
};

SectorMode.onStop = function (state: SectorState) {
  if ((state.polygon.coordinates[0]?.length ?? 0) < 3) {
    this.deleteFeature(state.polygon.id);
  }
  this.map.dragPan.enable();
};

export { SectorMode };
