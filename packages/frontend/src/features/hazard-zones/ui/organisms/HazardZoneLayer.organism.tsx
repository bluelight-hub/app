import { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import type { HazardZoneDto } from '@bluelight-hub/shared/client';
import { hazardZonesToFeatureCollection } from '../../utils/geometry';

const FILL_COLOR_EXPRESSION = ['match', ['get', 'maxWarnstufe'], 'KEINE', '#9ca3af', 'NIEDRIG', '#22c55e', 'MITTEL', '#eab308', 'HOCH', '#f97316', 'AKUT', '#ef4444', '#9ca3af'] as const;

const STROKE_COLOR_EXPRESSION = ['match', ['get', 'maxWarnstufe'], 'KEINE', '#6b7280', 'NIEDRIG', '#15803d', 'MITTEL', '#a16207', 'HOCH', '#c2410c', 'AKUT', '#991b1b', '#6b7280'] as const;

const FILL_OPACITY_EXPRESSION = ['match', ['get', 'maxWarnstufe'], 'KEINE', 0.15, 'NIEDRIG', 0.2, 'MITTEL', 0.25, 'HOCH', 0.3, 'AKUT', 0.35, 0.15] as const;

export interface HazardZoneLayerProps {
  zones: HazardZoneDto[];
  /**
   * ID der aktuell selektierten Zone — wird mit einer kräftigeren Kontur
   * hervorgehoben.
   */
  selectedZoneId?: string | null;
  /** Unique source-id (falls mehrere Layer parallel laufen). */
  sourceId?: string;
}

/**
 * Map-Layer, der alle HazardZones eines Einsatzes rendert (Issue #627, AC1+AC3).
 *
 * - Polygon-Zonen werden direkt als Fill + Stroke gerendert.
 * - Kreis-Zonen werden über {@link hazardZonesToFeatureCollection} in Polygone
 *   approximiert (64 Segmente).
 * - Farbcodierung via `maxWarnstufe`-Property der Zone (Backend-seitig
 *   aggregiert: höchste Warnstufe über alle Schutzobjekte).
 */
export function HazardZoneLayer({ zones, selectedZoneId, sourceId = 'hazard-zones' }: HazardZoneLayerProps) {
  const data = useMemo(() => hazardZonesToFeatureCollection(zones), [zones]);

  return (
    <Source id={sourceId} type="geojson" data={data}>
      <Layer
        id={`${sourceId}-fill`}
        type="fill"
        paint={{
          'fill-color': FILL_COLOR_EXPRESSION as unknown as string,
          'fill-opacity': FILL_OPACITY_EXPRESSION as unknown as number,
        }}
      />
      <Layer
        id={`${sourceId}-stroke`}
        type="line"
        paint={{
          'line-color': STROKE_COLOR_EXPRESSION as unknown as string,
          'line-width': ['case', ['==', ['get', 'id'], selectedZoneId ?? ''], 4, 2] as unknown as number,
          'line-opacity': 0.9,
        }}
      />
    </Source>
  );
}
