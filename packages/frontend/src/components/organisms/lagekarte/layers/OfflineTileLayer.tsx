import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.offline';

/**
 * Props für OfflineTileLayer-Komponente
 */
interface OfflineTileLayerProps {
  /**
   * URL-Template für Tiles (z.B. 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
   */
  url: string;
  /**
   * Attribution-String für Copyright-Notice
   */
  attribution: string;
}

/**
 * Offline-fähige Tile-Layer-Komponente für react-leaflet.
 *
 * Diese Komponente verwendet leaflet.offline um Tiles aus dem IndexedDB-Cache zu laden
 * wenn sie verfügbar sind, oder vom Server zu fetchen wenn online.
 *
 * Features:
 * - Automatisches Caching von Tiles in IndexedDB
 * - Offline-Fallback auf gecachte Tiles
 * - Transparente Online/Offline-Umschaltung
 *
 * @component
 * @example
 * ```tsx
 * <MapContainer>
 *   <OfflineTileLayer
 *     url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
 *     attribution="© OpenStreetMap contributors"
 *   />
 * </MapContainer>
 * ```
 */
export const OfflineTileLayer: React.FC<OfflineTileLayerProps> = ({ url, attribution }) => {
  const map = useMap();
  const layerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    // Create offline-capable tile layer
    const offlineLayer = L.tileLayer.offline(url, {
      attribution,
      useCache: true, // Use cached tiles when available
      saveToCache: true, // Save newly loaded tiles to cache
      crossOrigin: true, // Required for CORS
    });

    // Add layer to map
    offlineLayer.addTo(map);
    layerRef.current = offlineLayer;

    console.log('[OfflineTileLayer] Offline tile layer initialized');

    // Cleanup: Remove layer when component unmounts
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
        console.log('[OfflineTileLayer] Offline tile layer removed');
      }
    };
  }, [map, url, attribution]);

  // This component doesn't render anything itself - it manages a Leaflet layer
  return null;
};
