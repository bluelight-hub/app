import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { cleanupExpiredTiles, getTileStorageStats } from './offline-cleanup';

// Mock leaflet.offline functions
vi.mock('leaflet.offline', () => ({
  getStorageInfo: vi.fn(),
  removeTile: vi.fn(),
}));

import { getStorageInfo, removeTile } from 'leaflet.offline';

describe('offline-cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console mocks
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('cleanupExpiredTiles', () => {
    it('should not delete tiles if none are expired', async () => {
      const now = Date.now();
      const mockTiles = [
        { key: 'tile1', createdAt: now - 1000 * 60 * 60 * 24 * 10 }, // 10 days old
        { key: 'tile2', createdAt: now - 1000 * 60 * 60 * 24 * 20 }, // 20 days old
        { key: 'tile3', createdAt: now - 1000 * 60 * 60 * 24 * 5 }, // 5 days old
      ];

      (getStorageInfo as Mock).mockResolvedValue(mockTiles);

      await cleanupExpiredTiles('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

      expect(getStorageInfo).toHaveBeenCalledWith('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
      expect(removeTile).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('[Offline-Cleanup] Keine abgelaufenen Tiles zum Löschen');
    });

    it('should delete only expired tiles (older than 30 days)', async () => {
      const now = Date.now();
      const thirtyDaysAgo = now - 1000 * 60 * 60 * 24 * 30;
      const mockTiles = [
        { key: 'tile1', createdAt: now - 1000 * 60 * 60 * 24 * 31 }, // 31 days old (expired)
        { key: 'tile2', createdAt: now - 1000 * 60 * 60 * 24 * 20 }, // 20 days old (not expired)
        { key: 'tile3', createdAt: thirtyDaysAgo - 1000 }, // 30 days + 1 second (expired)
      ];

      (getStorageInfo as Mock).mockResolvedValue(mockTiles);
      (removeTile as Mock).mockResolvedValue(undefined);

      await cleanupExpiredTiles('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

      expect(removeTile).toHaveBeenCalledTimes(2);
      expect(removeTile).toHaveBeenCalledWith('tile1');
      expect(removeTile).toHaveBeenCalledWith('tile3');
      expect(console.log).toHaveBeenCalledWith('[Offline-Cleanup] 2 abgelaufene Tiles erfolgreich gelöscht');
    });

    it('should delete all tiles if all are expired', async () => {
      const now = Date.now();
      const mockTiles = [
        { key: 'tile1', createdAt: now - 1000 * 60 * 60 * 24 * 35 }, // 35 days old
        { key: 'tile2', createdAt: now - 1000 * 60 * 60 * 24 * 40 }, // 40 days old
        { key: 'tile3', createdAt: now - 1000 * 60 * 60 * 24 * 31 }, // 31 days old
      ];

      (getStorageInfo as Mock).mockResolvedValue(mockTiles);
      (removeTile as Mock).mockResolvedValue(undefined);

      await cleanupExpiredTiles('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

      expect(removeTile).toHaveBeenCalledTimes(3);
      expect(console.log).toHaveBeenCalledWith('[Offline-Cleanup] Gefundene Tiles: 3, Abgelaufen: 3');
    });

    it('should handle empty tile storage', async () => {
      (getStorageInfo as Mock).mockResolvedValue([]);

      await cleanupExpiredTiles('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

      expect(removeTile).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('[Offline-Cleanup] Keine abgelaufenen Tiles zum Löschen');
    });

    it('should support custom TTL (7 days)', async () => {
      const now = Date.now();
      const mockTiles = [
        { key: 'tile1', createdAt: now - 1000 * 60 * 60 * 24 * 8 }, // 8 days old (expired with 7-day TTL)
        { key: 'tile2', createdAt: now - 1000 * 60 * 60 * 24 * 5 }, // 5 days old (not expired)
      ];

      (getStorageInfo as Mock).mockResolvedValue(mockTiles);
      (removeTile as Mock).mockResolvedValue(undefined);

      await cleanupExpiredTiles(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        7, // 7-day TTL
      );

      expect(removeTile).toHaveBeenCalledTimes(1);
      expect(removeTile).toHaveBeenCalledWith('tile1');
    });

    it('should handle errors from getStorageInfo', async () => {
      const error = new Error('IndexedDB access failed');
      (getStorageInfo as Mock).mockRejectedValue(error);

      await expect(cleanupExpiredTiles('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')).rejects.toThrow('IndexedDB access failed');

      expect(console.error).toHaveBeenCalledWith('[Offline-Cleanup] Fehler beim Cleanup:', error);
    });

    it('should handle errors from removeTile', async () => {
      const now = Date.now();
      const mockTiles = [{ key: 'tile1', createdAt: now - 1000 * 60 * 60 * 24 * 35 }];

      (getStorageInfo as Mock).mockResolvedValue(mockTiles);
      const removeError = new Error('Tile removal failed');
      (removeTile as Mock).mockRejectedValue(removeError);

      await expect(cleanupExpiredTiles('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')).rejects.toThrow('Tile removal failed');

      expect(console.error).toHaveBeenCalledWith('[Offline-Cleanup] Fehler beim Cleanup:', removeError);
    });
  });

  describe('getTileStorageStats', () => {
    it('should return correct stats for multiple tiles', async () => {
      const now = Date.now();
      const mockTiles = [
        { key: 'tile1', createdAt: now - 1000 * 60 * 60 * 24 * 10 }, // 10 days old
        { key: 'tile2', createdAt: now - 1000 * 60 * 60 * 24 * 5 }, // 5 days old (newest)
        { key: 'tile3', createdAt: now - 1000 * 60 * 60 * 24 * 20 }, // 20 days old (oldest)
      ];

      (getStorageInfo as Mock).mockResolvedValue(mockTiles);

      const stats = await getTileStorageStats('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

      expect(stats.totalTiles).toBe(3);
      expect(stats.oldestTile).toEqual(new Date(mockTiles[2].createdAt));
      expect(stats.newestTile).toEqual(new Date(mockTiles[1].createdAt));
    });

    it('should return empty stats for no tiles', async () => {
      (getStorageInfo as Mock).mockResolvedValue([]);

      const stats = await getTileStorageStats('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

      expect(stats.totalTiles).toBe(0);
      expect(stats.oldestTile).toBeNull();
      expect(stats.newestTile).toBeNull();
    });

    it('should return correct stats for single tile', async () => {
      const now = Date.now();
      const mockTiles = [{ key: 'tile1', createdAt: now }];

      (getStorageInfo as Mock).mockResolvedValue(mockTiles);

      const stats = await getTileStorageStats('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

      expect(stats.totalTiles).toBe(1);
      expect(stats.oldestTile).toEqual(new Date(now));
      expect(stats.newestTile).toEqual(new Date(now));
    });

    it('should handle errors from getStorageInfo', async () => {
      const error = new Error('Storage access failed');
      (getStorageInfo as Mock).mockRejectedValue(error);

      await expect(getTileStorageStats('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')).rejects.toThrow('Storage access failed');

      expect(console.error).toHaveBeenCalledWith('[Offline-Cleanup] Fehler beim Abrufen der Statistiken:', error);
    });
  });
});
