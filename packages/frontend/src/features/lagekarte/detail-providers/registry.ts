/**
 * Layer-Detail-Provider Registry
 *
 * Zentrale Registry für alle Layer-Detail-Provider.
 * Beim Klick auf die Karte werden alle aktiven Provider abgefragt —
 * der erste Treffer gewinnt.
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
 * Fragt alle aktiven Provider an einer Koordinate ab
 *
 * Iteriert über alle registrierten Provider in Reihenfolge der Registrierung.
 * Der erste Provider der ein Ergebnis liefert, gewinnt.
 *
 * @returns Feature-Info oder null wenn kein Provider einen Treffer hat
 */
export async function queryDetailProviders(lng: number, lat: number, map: MapRef): Promise<LayerFeatureInfo | null> {
  const activeProviders = providers.filter((p) => p.isActive());

  for (const provider of activeProviders) {
    const result = await provider.queryFeature(lng, lat, map);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * Gibt den Provider für eine gegebene Provider-ID zurück
 */
export function getDetailProvider(providerId: string): LayerDetailProvider | undefined {
  return providers.find((p) => p.id === providerId);
}
