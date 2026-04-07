/**
 * NINA Warnungen - LayerDetailProvider
 *
 * Fragt NINA/BBK Warnungen über bereits gerenderte MapLibre-Layer ab.
 * Nutzt queryRenderedFeatures statt Backend-API-Calls für schnellere Interaktion.
 */

import type { MapRef } from 'react-map-gl/maplibre';
import { isAnyNinaOverlayActive } from '../../stores/map-layer.store';
import type { LayerDetailProvider, LayerFeatureInfo } from '../types';
import { NinaPanelContent } from './NinaPanelContent';
import { NinaPopupContent } from './NinaPopupContent';
import type { NinaWarnung } from './nina-api';
import { NINA_FILL_LAYER_ID } from '../../ui/molecules/NinaGeoJsonLayer.molecule';

/** NINA-spezifische Feature-Info Daten */
interface NinaFeatureData {
  warnungen: NinaWarnung[];
  /** ID für Detail-Nachladen über die Backend-API */
  warnungId: string;
}

export const ninaDetailProvider: LayerDetailProvider = {
  id: 'nina',

  isActive() {
    return isAnyNinaOverlayActive();
  },

  async queryFeature(lng: number, lat: number, map: MapRef): Promise<LayerFeatureInfo | null> {
    // Synchron: Features aus bereits gerenderten MapLibre-Layern abfragen
    const point = map.project([lng, lat]);
    const features = map.queryRenderedFeatures(point, { layers: [NINA_FILL_LAYER_ID] });

    if (!features || features.length === 0) return null;

    // Alle getroffenen Features dedupliziert sammeln (Tile-Boundary-Duplikate filtern)
    const seenIds = new Set<string>();
    const warnungen: NinaWarnung[] = [];

    for (const feature of features) {
      const props = feature.properties;
      if (!props || seenIds.has(props.id)) continue;
      seenIds.add(props.id);
      warnungen.push({
        id: props.id ?? '',
        event: props.title ?? '',
        severity: props.severity ?? '',
        headline: props.title ?? '',
      });
    }

    if (warnungen.length === 0) return null;

    const title = warnungen.length === 1 ? `NINA: ${warnungen[0].headline || 'Warnung'}` : `NINA: ${warnungen.length} Warnungen`;

    return {
      providerId: 'nina',
      title,
      data: { warnungen, warnungId: warnungen[0].id } satisfies NinaFeatureData,
      coordinate: { lng, lat },
    };
  },

  renderPopup(info: LayerFeatureInfo) {
    const { warnungen } = info.data as NinaFeatureData;
    return <NinaPopupContent warnungen={warnungen} />;
  },

  renderPanel(info: LayerFeatureInfo) {
    const { warnungen, warnungId } = info.data as NinaFeatureData;
    return <NinaPanelContent warnungen={warnungen} warnungId={warnungId} />;
  },
};
