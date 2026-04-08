/**
 * GAMS-Zonen-Platzierungsmodus für MapboxDraw
 *
 * Zwei Eingabemodi:
 * 1. Klick + Drag → Zone interaktiv aufziehen (nacheinander Rot → Orange → Gelb → Grün)
 * 2. Einfacher Klick → Popup mit Radien-Eingabe (für exakte Werte)
 */

import { berechneAbstand, erstelleKreis } from '../../utils/geo-calculations';

/** GAMS-Zonen-Farben [Rot, Orange, Gelb, Grün] */
const GAMS_FARBEN = ['#ef4444', '#f97316', '#eab308', '#22c55e'] as const;

/** Interner State des GAMS-Modus */
interface GamsState {
  center: [number, number] | null;
  /** Aktueller Zonen-Index (0–3) */
  zoneIndex: number;
  /** Polygon für die aktuell gezeichnete Zone */
  currentPolygon: {
    id: string;
    properties: Record<string, unknown>;
    coordinates: number[][][];
    incomingCoords: (coords: number[][][]) => void;
    toGeoJSON: () => GeoJSON.Feature;
  } | null;
  /** IDs der bereits platzierten Zonen-Features */
  placedIds: string[];
  isDrawing: boolean;
  /** True wenn Nutzer nur geklickt hat (kein Drag) → Popup-Modus */
  wasClick: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GamsMode: any = {};

GamsMode.onSetup = function (): GamsState {
  this.setActionableState({ trash: true, combineFeatures: false, uncombineFeatures: false });
  return {
    center: null,
    zoneIndex: 0,
    currentPolygon: null,
    placedIds: [],
    isDrawing: false,
    wasClick: true,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
GamsMode.onMouseDown = function (state: GamsState, e: any) {
  if (state.zoneIndex >= 4) return;

  const clickPos: [number, number] = [e.lngLat.lng, e.lngLat.lat];

  if (!state.center) {
    state.center = clickPos;
  }

  // Neues Polygon für aktuelle Zone erstellen
  const farbe = GAMS_FARBEN[state.zoneIndex];
  const polygon = this.newFeature({
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[]] },
    properties: {
      featureType: 'gams_zone',
      shapeType: 'circle',
      color: farbe,
      fillColor: farbe,
      fillEnabled: true,
      fillOpacity: 0.15,
      strokeWidth: 2,
      shapeCenter: JSON.stringify(state.center),
    },
  });
  this.addFeature(polygon);
  state.currentPolygon = polygon;
  state.isDrawing = true;
  state.wasClick = true;
  this.map.dragPan.disable();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
GamsMode.onDrag = function (state: GamsState, e: any) {
  if (!state.isDrawing || !state.center || !state.currentPolygon) return;

  state.wasClick = false;
  const current: [number, number] = [e.lngLat.lng, e.lngLat.lat];
  const radius = berechneAbstand(state.center, current);
  if (radius < 1) return;

  const coords = erstelleKreis(state.center, radius);
  state.currentPolygon.incomingCoords(coords);
  state.currentPolygon.properties.shapeRadius = radius;
};

GamsMode.onMouseUp = function (state: GamsState) {
  if (!state.isDrawing || !state.currentPolygon) return;
  state.isDrawing = false;
  this.map.dragPan.enable();

  if (state.wasClick) {
    // Nur Klick ohne Drag → Popup-Modus
    this.deleteFeature(state.currentPolygon.id);
    state.currentPolygon = null;

    this.map.fire('gams.platzieren', { center: state.center });
    return;
  }

  // Aufzieh-Modus: Zone finalisieren
  if ((state.currentPolygon.coordinates[0]?.length ?? 0) < 3) {
    this.deleteFeature(state.currentPolygon.id);
    state.currentPolygon = null;
    return;
  }

  this.fire('draw.create', { features: [state.currentPolygon.toGeoJSON()] });
  state.placedIds.push(state.currentPolygon.id);
  state.currentPolygon = null;
  state.zoneIndex++;

  if (state.zoneIndex >= 4) {
    // Alle 4 Zonen platziert → Modus beenden
    this.changeMode('simple_select', { featureIds: state.placedIds });
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
GamsMode.toDisplayFeatures = function (_state: GamsState, geojson: any, display: any) {
  if (geojson.geometry.type === 'Polygon') {
    const ring = geojson.geometry.coordinates?.[0];
    if (!ring || ring.length < 4) return;
  }
  display(geojson);
};

GamsMode.onStop = function (state: GamsState) {
  if (state.currentPolygon && (state.currentPolygon.coordinates[0]?.length ?? 0) < 3) {
    this.deleteFeature(state.currentPolygon.id);
  }
  this.map.dragPan.enable();
};

export { GamsMode };
