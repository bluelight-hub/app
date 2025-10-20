import { getStorageInfo, removeTile } from 'leaflet.offline';
import type { TileInfo } from 'leaflet.offline';

/**
 * Bereinigt abgelaufene Tiles aus dem IndexedDB-Cache.
 *
 * Diese Funktion prüft alle gespeicherten Tiles für das gegebene URL-Template
 * und löscht Tiles, die älter als die TTL (Time-To-Live) sind.
 *
 * @param urlTemplate - Das URL-Template der Tiles (z.B. 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
 * @param ttlDays - Time-To-Live in Tagen (Standard: 30 Tage)
 * @returns Promise<void>
 *
 * @example
 * // Cleanup mit Standard-TTL (30 Tage)
 * await cleanupExpiredTiles('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
 *
 * // Cleanup mit benutzerdefinierter TTL
 * await cleanupExpiredTiles('https://tile.osm.org/{z}/{x}/{y}.png', 7);
 */
export async function cleanupExpiredTiles(urlTemplate: string, ttlDays = 30): Promise<void> {
  try {
    const allTiles: TileInfo[] = await getStorageInfo(urlTemplate);

    const now = Date.now();
    const ttl = ttlDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds

    const expiredTiles = allTiles.filter((tile) => {
      return now - tile.createdAt > ttl;
    });

    console.log(`[Offline-Cleanup] Gefundene Tiles: ${allTiles.length}, Abgelaufen: ${expiredTiles.length}`);

    if (expiredTiles.length === 0) {
      console.log('[Offline-Cleanup] Keine abgelaufenen Tiles zum Löschen');
      return;
    }

    // Delete expired tiles
    for (const tile of expiredTiles) {
      await removeTile(tile.key);
    }

    console.log(`[Offline-Cleanup] ${expiredTiles.length} abgelaufene Tiles erfolgreich gelöscht`);
  } catch (error) {
    console.error('[Offline-Cleanup] Fehler beim Cleanup:', error);
    throw error;
  }
}

/**
 * Gibt Statistiken über den aktuellen Tile-Cache zurück.
 *
 * @param urlTemplate - Das URL-Template der Tiles
 * @returns Promise mit Cache-Statistiken
 *
 * @example
 * const stats = await getTileStorageStats('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
 * console.log(`Gespeicherte Tiles: ${stats.totalTiles}`);
 */
export async function getTileStorageStats(urlTemplate: string): Promise<{
  totalTiles: number;
  oldestTile: Date | null;
  newestTile: Date | null;
}> {
  try {
    const allTiles: TileInfo[] = await getStorageInfo(urlTemplate);

    if (allTiles.length === 0) {
      return {
        totalTiles: 0,
        oldestTile: null,
        newestTile: null,
      };
    }

    const timestamps = allTiles.map((tile) => tile.createdAt);
    const oldestTimestamp = Math.min(...timestamps);
    const newestTimestamp = Math.max(...timestamps);

    return {
      totalTiles: allTiles.length,
      oldestTile: new Date(oldestTimestamp),
      newestTile: new Date(newestTimestamp),
    };
  } catch (error) {
    console.error('[Offline-Cleanup] Fehler beim Abrufen der Statistiken:', error);
    throw error;
  }
}
