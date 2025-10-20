/**
 * Offline Tiles Utility
 *
 * Handles tile download for offline map usage using leaflet.offline library.
 *
 * @module utils/offline-tiles
 */

import L from 'leaflet';
import 'leaflet.offline';

/**
 * Downloads map tiles for offline usage
 *
 * Uses leaflet.offline Control API to download tiles within specified bounds
 * and zoom levels. Progress is tracked via event callbacks.
 *
 * @param baseLayer - Leaflet TileLayer to download tiles from
 * @param bounds - Geographic bounding box for download region
 * @param zoomLevels - Array of zoom levels to download (e.g., [13, 14, 15])
 * @param onProgress - Callback for progress updates (0-100)
 * @param onComplete - Callback when download completes successfully
 * @param onError - Callback for error handling
 * @returns SaveTiles control instance
 *
 * @example
 * ```typescript
 * const layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
 * const bounds = map.getBounds();
 *
 * const control = downloadTiles(
 *   layer,
 *   bounds,
 *   [13, 14, 15],
 *   (progress) => console.log(`Progress: ${progress}%`),
 *   () => console.log('Download complete!'),
 *   (error) => console.error('Download failed:', error)
 * );
 * ```
 *
 * @see https://github.com/allartk/leaflet.offline
 */
export function downloadTiles(
  baseLayer: L.TileLayer,
  bounds: L.LatLngBounds,
  zoomLevels: number[],
  onProgress: (progress: number) => void,
  onComplete: () => void,
  onError: (error: Error) => void,
): L.Control.SaveTiles {
  // Create save control with leaflet.offline
  const saveControl = L.control.savetiles(baseLayer, {
    zoomlevels: zoomLevels,
    bounds, // Pass bounds directly to control
    confirm: null, // Skip built-in confirmation dialog (we handle UI separately)
  });

  let totalTiles = 0;
  let savedTiles = 0;

  /**
   * Track download start
   * Event provides total tile count for progress calculation
   * NOTE: Events are fired on baseLayer, not on the control itself
   */
  baseLayer.on('savestart', (event: { _tilesforSave?: unknown[] }) => {
    totalTiles = event._tilesforSave?.length || 0;
    savedTiles = 0;
    onProgress(0);

    console.log(`[offline-tiles] Download started: ${totalTiles} tiles`);
  });

  /**
   * Track individual tile downloads
   * Fired for each successfully downloaded tile
   */
  baseLayer.on('savetileend', () => {
    savedTiles++;
    const progress = totalTiles > 0 ? (savedTiles / totalTiles) * 100 : 0;
    onProgress(progress);
  });

  /**
   * Handle download completion
   * Fired when all tiles have been downloaded
   */
  baseLayer.on('saveend', () => {
    onProgress(100);
    onComplete();

    console.log(`[offline-tiles] Download complete: ${savedTiles} tiles saved`);

    // Clean up event listeners after download completes
    baseLayer.off('savestart');
    baseLayer.off('savetileend');
    baseLayer.off('saveend');
    baseLayer.off('tileerror');
  });

  /**
   * Handle tile download errors
   * Fired when a tile fails to download
   */
  baseLayer.on('tileerror', (error: { error?: string }) => {
    console.error('[offline-tiles] Tile download error:', error);
    onError(new Error(error.error || 'Tile download failed'));
  });

  // Trigger download programmatically
  // Note: _saveTiles() is a private method, but necessary for programmatic use
  (saveControl as L.Control.SaveTiles & { _saveTiles: () => void })._saveTiles();

  return saveControl;
}
