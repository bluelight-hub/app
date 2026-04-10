/**
 * Continuous-Point-Modus für die Lagekarte
 *
 * Ersetzt den Standard draw_point Modus für kontinuierliches Zeichnen.
 * Löst drei bekannte MapboxDraw-Bugs:
 * 1. draw_point.onSetup() erstellt einen leeren Point (coordinates: []) → NaN-Crashes
 * 2. Mode-Wechsel draw_point → simple_select → draw_point verursacht RAF-Render-Race
 * 3. toDisplayFeatures unterdrückt den "active point" → Feature verschwindet
 *
 * @see https://github.com/mapbox/mapbox-gl-draw/blob/main/docs/MODES.md (LotsOfPointsMode)
 */

import { berechneBearing } from '../../utils/geo-calculations';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ContinuousPointMode: any = {};

/**
 * Setup: Kein Placeholder-Point, nur UI-State initialisieren.
 * Vermeidet den leeren Point mit coordinates: [] der NaN-Errors verursacht.
 */
ContinuousPointMode.onSetup = function () {
  this.clearSelectedFeatures();
  this.updateUIClasses({ mouse: 'add' });
  this.activateUIButton('point');
  this.setActionableState({ trash: true });
  return {};
};

/**
 * Klick: Point erstellen, Event feuern, im Modus bleiben.
 * Kein changeMode → kein RAF-Race-Condition.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
ContinuousPointMode.onTap = ContinuousPointMode.onClick = function (_state: any, e: any) {
  const point = this.newFeature({
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: [e.lngLat.lng, e.lngLat.lat],
    },
  });
  this.addFeature(point);
  this.fire('draw.create', { features: [point.toGeoJSON()] });
  // MapboxDraw verliert ältere Punkte im inkrementellen Hot→Cold-Render.
  // Ein expliziter Dirty-Render schreibt nach jedem Klick alle Punkte neu
  // in die Cold-Source, ohne den Modus zu wechseln.
  this._ctx.store.setDirty();
  // Modus bleibt aktiv → nächster Klick erstellt nächsten Point
};

/**
 * Stop: Aufräumen. Kein Placeholder-Point zu löschen.
 */
ContinuousPointMode.onStop = function () {
  this.activateUIButton();
};

/**
 * Alle Features anzeigen — kein "active point" wird unterdrückt.
 * Zusätzlich: Pfeilspitzen für Arrow-Features rendern (wie CustomSimpleSelect).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
ContinuousPointMode.toDisplayFeatures = function (_state: any, geojson: any, display: any) {
  geojson.properties.active = 'false';
  display(geojson);

  // Pfeilspitze für Arrow-Features (konsistent mit CustomSimpleSelect)
  if (geojson.geometry?.type === 'LineString' && geojson.properties?.user_shapeType === 'arrow') {
    const coords = geojson.geometry.coordinates;
    if (coords && coords.length >= 2) {
      const from: [number, number] = coords[coords.length - 2] as [number, number];
      const to: [number, number] = coords[coords.length - 1] as [number, number];
      const bearing = berechneBearing(from, to);

      display({
        type: 'Feature',
        properties: {
          meta: 'arrowhead',
          parent: geojson.properties.id,
          arrowBearing: bearing,
          active: 'false',
        },
        geometry: {
          type: 'Point',
          coordinates: to,
        },
      });
    }
  }
};

ContinuousPointMode.onTrash = function () {
  this.deleteFeature(this.getSelectedIds());
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
ContinuousPointMode.onKeyUp = function (_state: any, e: any) {
  if (e.keyCode === 27) {
    // Escape → zurück zu simple_select
    this.changeMode('simple_select');
  }
};

export { ContinuousPointMode };
