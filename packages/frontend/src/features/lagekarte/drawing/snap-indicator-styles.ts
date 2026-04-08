/**
 * MapLibre Layer-Definition für den Snap-Punkt-Indikator
 *
 * Zeigt einen hervorgehobenen Punkt an der Snap-Position.
 */

import type { LayerSpecification } from 'maplibre-gl';

export const SNAP_INDICATOR_SOURCE_ID = 'snap-indicator-source';
export const SNAP_INDICATOR_LAYER_ID = 'snap-indicator-layer';

/** Layer-Spec für den Snap-Indikator (weißer Punkt mit blauem Rand) */
export const SNAP_INDICATOR_LAYER: LayerSpecification = {
  id: SNAP_INDICATOR_LAYER_ID,
  type: 'circle',
  source: SNAP_INDICATOR_SOURCE_ID,
  paint: {
    'circle-radius': 6,
    'circle-color': '#ffffff',
    'circle-stroke-width': 2.5,
    'circle-stroke-color': '#3b82f6',
    'circle-opacity': 0.9,
  },
};
