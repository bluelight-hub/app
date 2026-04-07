/**
 * Persistierung der Karten-Layer-Einstellungen pro Einsatz
 *
 * Speichert die gewählte Grundkarte und aktive Overlays lokal
 * (localStorage oder Tauri Store).
 */

import { getStorageAdapter } from '@/shared/services/storage/storage-adapter.factory';
import type { MapLayerState } from '../map-layer.store';

function getStorageKey(einsatzId: string): string {
  return `bluelight:feature:lagekarte:einsatz:${einsatzId}:layers`;
}

/**
 * Speichert die Karten-Layer-Einstellungen für einen Einsatz
 */
export async function saveMapLayerState(einsatzId: string, state: MapLayerState): Promise<void> {
  try {
    const adapter = getStorageAdapter();
    await adapter.setItem(getStorageKey(einsatzId), JSON.stringify(state));
  } catch (error) {
    console.error('Karten-Layer-Einstellungen konnten nicht gespeichert werden:', error);
  }
}

/**
 * Lädt die Karten-Layer-Einstellungen für einen Einsatz
 */
export async function loadMapLayerState(einsatzId: string): Promise<Partial<MapLayerState> | null> {
  try {
    const adapter = getStorageAdapter();
    const raw = await adapter.getItem(getStorageKey(einsatzId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as Partial<MapLayerState>;
  } catch (error) {
    console.error('Karten-Layer-Einstellungen konnten nicht geladen werden:', error);
    return null;
  }
}
