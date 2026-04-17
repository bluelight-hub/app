/**
 * Gefahrenzonen — LayerDetailProvider (Issue #627, G3)
 *
 * Wird im zentralen `queryAllDetailProviders`-Flow aufgerufen, wenn der Nutzer
 * auf die Karte klickt. Gibt den Treffer (Polygon-Hit-Test) an das Detail-
 * Popup/Panel-System weiter. Die Zonen werden aus dem TanStack-Query-Cache
 * gelesen (pro aktivem Einsatz), damit kein zusätzlicher Netz-Call nötig ist.
 */

import type { MapRef } from 'react-map-gl/maplibre';
import type { GefahrenzoneDto } from '@bluelight-hub/shared/client';
import { queryClient } from '@/provider/query-client.provider';
import { GEFAHRENZONE_QUERY_KEYS } from '@/features/gefahrenzone/api';
import { isPointInGeoJsonPolygon } from '@/features/gefahrenzone/lib/point-in-polygon';
import { GEFAHRENTYP_LABELS, type GefahrentypValue } from '@/features/gefahrenmatrix/schemas/gefahrenmatrix.schema';
import type { LayerDetailProvider, LayerFeatureInfo } from '../types';
import { GefahrenzoneDetailPanel } from '@/features/gefahrenzone/ui/organisms/GefahrenzoneDetailPanel';
import { GefahrenzoneDetailPopup } from '@/features/gefahrenzone/ui/organisms/GefahrenzoneDetailPopup';

/**
 * Aktueller Einsatz-Kontext. Wird aus dem Lagekarte-Mount gesetzt und ermöglicht
 * dem Provider, die passende Zonen-Liste aus dem Query-Cache zu ziehen, ohne
 * eigene Einsatz-ID zu kennen.
 */
let currentEinsatzId: string | null = null;

export function setGefahrenzonenProviderEinsatzId(einsatzId: string | null): void {
  currentEinsatzId = einsatzId;
}

export function getGefahrenzonenProviderEinsatzId(): string | null {
  return currentEinsatzId;
}

/** Provider-interner Daten-Wrapper. */
export interface GefahrenzoneFeatureData {
  zone: GefahrenzoneDto;
  einsatzId: string;
}

export const gefahrenzonenDetailProvider: LayerDetailProvider = {
  id: 'gefahrenzonen',

  isActive() {
    return currentEinsatzId !== null;
  },

  async queryFeature(lng, lat, _map: MapRef): Promise<LayerFeatureInfo | null> {
    const einsatzId = currentEinsatzId;
    if (!einsatzId) return null;
    const zonen = queryClient.getQueryData<GefahrenzoneDto[]>(GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId));
    if (!zonen || zonen.length === 0) return null;
    const hit = zonen.find((zone) => isPointInGeoJsonPolygon({ lng, lat }, zone.geometry as unknown));
    if (!hit) return null;
    return {
      providerId: 'gefahrenzonen',
      title: `Gefahrenzone: ${GEFAHRENTYP_LABELS[hit.gefahrentyp as GefahrentypValue] ?? hit.gefahrentyp}`,
      data: { zone: hit, einsatzId } satisfies GefahrenzoneFeatureData,
      coordinate: { lng, lat },
    };
  },

  renderPopup(info) {
    const { zone } = info.data as GefahrenzoneFeatureData;
    return <GefahrenzoneDetailPopup zone={zone} />;
  },

  renderPanel(info) {
    const { zone, einsatzId } = info.data as GefahrenzoneFeatureData;
    return <GefahrenzoneDetailPanel zone={zone} einsatzId={einsatzId} />;
  },
};
