/**
 * DWD Wetterwarnungen - LayerDetailProvider
 *
 * Fragt DWD WMS GetFeatureInfo ab wenn der User auf eine
 * Wetterwarnungsfläche klickt. Zeigt Warnstufe, Beschreibung
 * und Handlungsempfehlungen.
 */

import type { MapRef } from 'react-map-gl/maplibre';
import { mapLayerStore } from '../../stores/map-layer.store';
import type { LayerDetailProvider, LayerFeatureInfo } from '../types';
import { DwdPanelContent } from './DwdPanelContent';
import { DwdPopupContent } from './DwdPopupContent';
import { type DwdWarnung, queryDwdWarnungen } from './dwd-api';

/** DWD-spezifische Feature-Info Daten */
interface DwdFeatureData {
  warnungen: DwdWarnung[];
}

export const dwdDetailProvider: LayerDetailProvider = {
  id: 'dwd',

  isActive() {
    return mapLayerStore.state.dwdOverlayEnabled;
  },

  async queryFeature(lng: number, lat: number, map: MapRef): Promise<LayerFeatureInfo | null> {
    const zoom = map.getZoom();
    const warnungen = await queryDwdWarnungen(lng, lat, zoom);

    if (warnungen.length === 0) {
      return null;
    }

    const firstWarnung = warnungen[0];
    return {
      providerId: 'dwd',
      title: warnungen.length === 1 ? `DWD: ${firstWarnung.event || 'Wetterwarnung'}` : `DWD: ${warnungen.length} Wetterwarnungen`,
      data: { warnungen } satisfies DwdFeatureData,
      coordinate: { lng, lat },
    };
  },

  renderPopup(info: LayerFeatureInfo) {
    const { warnungen } = info.data as DwdFeatureData;
    return <DwdPopupContent warnungen={warnungen} />;
  },

  renderPanel(info: LayerFeatureInfo) {
    const { warnungen } = info.data as DwdFeatureData;
    return <DwdPanelContent warnungen={warnungen} />;
  },
};
