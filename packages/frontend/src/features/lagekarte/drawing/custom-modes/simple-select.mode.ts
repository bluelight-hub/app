/**
 * Custom Simple-Select-Modus für Arrow-Pfeilspitzen
 *
 * Erweitert den Standard-simple_select um Pfeilspitzen-Rendering
 * für gespeicherte Arrow-Features (shapeType === 'arrow').
 */

import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { berechneBearing } from '../../utils/geo-calculations';

const defaultSimpleSelect = MapboxDraw.modes.simple_select;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomSimpleSelect: any = { ...defaultSimpleSelect };

/**
 * Erweitert toDisplayFeatures: Für Arrow-Features wird ein zusätzlicher
 * Point mit meta 'arrowhead' am Ende der Linie angezeigt.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
CustomSimpleSelect.toDisplayFeatures = function (state: any, geojson: any, display: any) {
  // Standard-Verhalten für alle Features
  defaultSimpleSelect.toDisplayFeatures.call(this, state, geojson, display);

  // Für Arrow-Features: zusätzliche Pfeilspitze am Endpunkt
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
          active: geojson.properties.active,
        },
        geometry: {
          type: 'Point',
          coordinates: to,
        },
      });
    }
  }
};

export { CustomSimpleSelect };
