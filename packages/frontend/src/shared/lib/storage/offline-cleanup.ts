/**
 * Offline-Tile-Cleanup ist aktuell deaktiviert.
 *
 * Die Leaflet-basierte Offline-Funktionalität wurde mit der MapLibre-Migration entfernt.
 * Siehe GitHub Issue #628 für die Reimplementierung.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function cleanupExpiredTiles(_urlTemplate: string, _ttlDays = 30): Promise<void> {
  // No-op: Offline-Tiles wurden mit der MapLibre-Migration entfernt
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getTileStorageStats(_urlTemplate: string): Promise<{
  totalTiles: number;
  oldestTile: Date | null;
  newestTile: Date | null;
}> {
  return { totalTiles: 0, oldestTile: null, newestTile: null };
}
