/**
 * NinaGeoJsonLayer - Rendert NINA-Warnungen als farbige Polygone auf der Karte
 *
 * Nutzt MapLibre Source/Layer mit dynamischem Filter nach aktiven Quellen.
 */

import { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import type { NinaOverlayState, NinaSource } from '../../stores/map-layer.store';

export const NINA_GEOJSON_SOURCE_ID = 'nina-geojson';
export const NINA_FILL_LAYER_ID = 'nina-warnungen-fill';
export const NINA_OUTLINE_LAYER_ID = 'nina-warnungen-outline';

interface NinaGeoJsonLayerProps {
  /** GeoJSON FeatureCollection Daten vom Backend */
  data: {
    type: string;
    features: Array<{
      type: string;
      properties: { id: string; severity: string; title: string; source: string; startDate?: string };
      geometry: Record<string, unknown> | null;
    }>;
  };
  /** Aktive NINA-Overlay Einstellungen */
  ninaOverlays: NinaOverlayState;
}

/** Severity → Füllfarbe */
const FILL_COLOR: ['match', ...unknown[]] = ['match', ['get', 'severity'], 'Minor', '#fef08a', 'Moderate', '#fdba74', 'Severe', '#fca5a5', 'Extreme', '#d8b4fe', '#d1d5db'];

/** Severity → Randfarbe */
const LINE_COLOR: ['match', ...unknown[]] = ['match', ['get', 'severity'], 'Minor', '#ca8a04', 'Moderate', '#ea580c', 'Severe', '#dc2626', 'Extreme', '#9333ea', '#6b7280'];

export function NinaGeoJsonLayer({ data, ninaOverlays }: NinaGeoJsonLayerProps) {
  // Aktive Quellen als Array für den Filter
  const activeSources = useMemo(() => {
    return (Object.entries(ninaOverlays) as [NinaSource, boolean][]).filter(([, enabled]) => enabled).map(([source]) => source);
  }, [ninaOverlays]);

  // Features filtern (nur die mit Geometrie und aktiver Quelle)
  const filteredData = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: data.features.filter((f) => f.geometry !== null && activeSources.includes(f.properties.source as NinaSource)),
    }),
    [data, activeSources],
  );

  // MapLibre Filter für aktive Quellen
  const sourceFilter: ['in', ...unknown[]] = useMemo(() => ['in', ['get', 'source'], ['literal', activeSources]], [activeSources]);

  // Nichts rendern wenn keine Quelle aktiv
  if (activeSources.length === 0) return null;

  return (
    <Source id={NINA_GEOJSON_SOURCE_ID} type="geojson" data={filteredData}>
      {/* Flächen-Fill */}
      <Layer
        id={NINA_FILL_LAYER_ID}
        type="fill"
        filter={sourceFilter}
        paint={{
          'fill-color': FILL_COLOR as any,
          'fill-opacity': 0.35,
        }}
      />
      {/* Umriss */}
      <Layer
        id={NINA_OUTLINE_LAYER_ID}
        type="line"
        filter={sourceFilter}
        paint={{
          'line-color': LINE_COLOR as any,
          'line-width': 1.5,
        }}
      />
    </Source>
  );
}
