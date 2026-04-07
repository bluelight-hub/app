/**
 * Layer-Detail-Provider Registry
 *
 * Zentrale Registry für alle Layer-Detail-Provider.
 * Beim Klick auf die Karte werden alle aktiven Provider parallel abgefragt
 * und alle Treffer gesammelt.
 */

import type { MapRef } from 'react-map-gl/maplibre';
import type { LayerDetailProvider, LayerFeatureInfo } from './types';

const providers: LayerDetailProvider[] = [];

/**
 * Registriert einen neuen Layer-Detail-Provider
 */
export function registerDetailProvider(provider: LayerDetailProvider): void {
  // Duplikat-Prüfung (verhindert doppelte Registrierung bei Vite HMR)
  if (providers.some((p) => p.id === provider.id)) {
    return;
  }
  providers.push(provider);
}

/**
 * Fragt alle aktiven Provider an einer Koordinate ab und sammelt alle Treffer.
 *
 * Provider werden parallel abgefragt (Promise.allSettled), damit ein
 * fehlschlagender Provider die anderen nicht blockiert.
 *
 * @returns Array aller Feature-Infos (leer wenn kein Provider einen Treffer hat)
 */
export async function queryAllDetailProviders(lng: number, lat: number, map: MapRef): Promise<LayerFeatureInfo[]> {
  const activeProviders = providers.filter((p) => p.isActive());

  const results = await Promise.allSettled(activeProviders.map((p) => p.queryFeature(lng, lat, map)));

  return results.filter((r): r is PromiseFulfilledResult<LayerFeatureInfo> => r.status === 'fulfilled' && r.value !== null).map((r) => r.value);
}

/**
 * Gibt den Provider für eine gegebene Provider-ID zurück
 */
export function getDetailProvider(providerId: string): LayerDetailProvider | undefined {
  return providers.find((p) => p.id === providerId);
}
