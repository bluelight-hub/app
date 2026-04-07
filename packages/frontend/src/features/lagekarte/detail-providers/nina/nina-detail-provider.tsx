/**
 * NINA Warnungen - LayerDetailProvider
 *
 * Fragt NINA/BBK Warnungen über das Backend ab.
 * NINA ist immer aktiv (unabhängig von Layer-Toggles),
 * da es allgemeine Bevölkerungswarnungen liefert.
 */

import type { MapRef } from 'react-map-gl/maplibre';
import type { LayerDetailProvider, LayerFeatureInfo } from '../types';
import { NinaPanelContent } from './NinaPanelContent';
import { NinaPopupContent } from './NinaPopupContent';
import { type NinaWarnung, queryNinaWarnungen } from './nina-api';

/** NINA-spezifische Feature-Info Daten */
interface NinaFeatureData {
  warnungen: NinaWarnung[];
}

export const ninaDetailProvider: LayerDetailProvider = {
  id: 'nina',

  isActive() {
    // NINA ist immer aktiv — Bevölkerungswarnungen sind immer relevant
    return true;
  },

  async queryFeature(lng: number, lat: number, _map: MapRef): Promise<LayerFeatureInfo | null> {
    const warnungen = await queryNinaWarnungen(lng, lat);

    if (warnungen.length === 0) {
      return null;
    }

    const firstWarnung = warnungen[0];
    return {
      providerId: 'nina',
      title: warnungen.length === 1 ? `NINA: ${firstWarnung.headline || firstWarnung.event}` : `NINA: ${warnungen.length} Warnungen`,
      data: { warnungen } satisfies NinaFeatureData,
      coordinate: { lng, lat },
    };
  },

  renderPopup(info: LayerFeatureInfo) {
    const { warnungen } = info.data as NinaFeatureData;
    return <NinaPopupContent warnungen={warnungen} />;
  },

  renderPanel(info: LayerFeatureInfo) {
    const { warnungen } = info.data as NinaFeatureData;
    return <NinaPanelContent warnungen={warnungen} />;
  },
};
