/**
 * Custom Simple-Select-Modus
 *
 * Erweitert den Standard-simple_select um:
 * - Pfeilspitzen-Rendering für gespeicherte Arrow-Features (shapeType === 'arrow')
 * - Lock-Modus: Wenn map.__drawLocked === true, werden alle Klick-/Drag-Interaktionen
 *   blockiert, sodass Features nur angezeigt aber nicht bearbeitet werden können.
 */

import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { erzeugeArrowDisplay } from '../arrow-display';

const defaultSimpleSelect = MapboxDraw.modes.simple_select;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomSimpleSelect: any = { ...defaultSimpleSelect };

/** Prüft ob die Karte gegen Bearbeitung gesperrt ist */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isLocked(ctx: any): boolean {
  return !!(ctx.map as any)?.__drawLocked;
}

// Lock: Klick auf Vertex → kein direct_select (Vertex-Bearbeitung blockiert)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
CustomSimpleSelect.clickOnVertex = function (state: any, e: any) {
  if (isLocked(this)) return;
  return defaultSimpleSelect.clickOnVertex.call(this, state, e);
};

// Lock: Drag → kein Feature-Verschieben
// eslint-disable-next-line @typescript-eslint/no-explicit-any
CustomSimpleSelect.onDrag = function (state: any, e: any) {
  if (isLocked(this)) return;
  return defaultSimpleSelect.onDrag.call(this, state, e);
};

/**
 * Erweitert toDisplayFeatures:
 * - Arrow-Features: Pfeilspitze am Endpunkt
 * - Lock-Modus: Vertex-/Midpoint-Handles ausblenden (nur Feature-Geometrie anzeigen)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
CustomSimpleSelect.toDisplayFeatures = function (state: any, geojson: any, display: any) {
  // Bei Lock: Vertex-/Midpoint-Handles filtern (keine Bearbeitungsgriffe anzeigen)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseDisplay = isLocked(this)
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (feature: any) => {
        const meta = feature.properties?.meta;
        if (meta === 'vertex' || meta === 'midpoint') return;
        display(feature);
      }
    : display;

  // Arrow-Features: Display-Callback wrappen, damit Linie gekürzt wird
  if (geojson.geometry?.type === 'LineString' && geojson.properties?.user_shapeType === 'arrow') {
    const coords = geojson.geometry.coordinates;
    if (coords && coords.length >= 2) {
      const map = this.map;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const arrowDisplay = (feature: any) => {
        if (feature.geometry?.type === 'LineString') {
          erzeugeArrowDisplay(map, feature, baseDisplay);
        } else {
          baseDisplay(feature);
        }
      };
      defaultSimpleSelect.toDisplayFeatures.call(this, state, geojson, arrowDisplay);
      return;
    }
  }

  // Alle anderen Features: Standard-Verhalten
  defaultSimpleSelect.toDisplayFeatures.call(this, state, geojson, baseDisplay);
};

export { CustomSimpleSelect };
