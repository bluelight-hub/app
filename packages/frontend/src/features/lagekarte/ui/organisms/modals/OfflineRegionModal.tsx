import { Button } from '@/shared/ui/atoms/button.atom';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { cn } from '@/shared/utils/cn';
import type React from 'react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { PiX, PiInfo, PiWarning } from 'react-icons/pi';
import type L from 'leaflet';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet/dist/leaflet.css';
import { getStorageQuota, type StorageQuota } from '@/shared/utils';
import { downloadTiles } from '@/features/lagekarte/utils';
import { toast } from 'sonner';

interface OfflineRegionModalProps {
  /**
   * Ob Modal geöffnet ist
   */
  isOpen: boolean;
  /**
   * Callback zum Schließen des Modals
   */
  onClose: () => void;
  /**
   * Aktuelle Map-Bounds (für initiale Region-Selection)
   */
  currentMapBounds?: L.LatLngBounds;
  /**
   * Leaflet Map instance (required for tile downloads)
   */
  map?: L.Map;
}

/**
 * RegionSelectionMap Component
 *
 * Mini-Map mit Leaflet.PM Rectangle-Tool für Region-Selection
 */
interface RegionSelectionMapProps {
  initialBounds?: L.LatLngBounds;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
}

/**
 * Component that sets up Leaflet.PM rectangle drawing on the map
 */
const RectangleDrawControl: React.FC<{ initialBounds?: L.LatLngBounds; onBoundsChange: (bounds: L.LatLngBounds) => void }> = ({ initialBounds, onBoundsChange }) => {
  const map = useMap();
  const rectangleRef = useRef<L.Rectangle | null>(null);

  useEffect(() => {
    if (!map) return;

    // Defensive check: Ensure PM is available
    if (!map.pm?.Toolbar) {
      console.warn('[OfflineRegionModal] Leaflet.PM not available');
      return;
    }

    // Enable Leaflet.PM controls
    map.pm.addControls({
      position: 'topright',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawPolygon: false,
      drawCircle: false,
      drawRectangle: true,
      editMode: true,
      dragMode: false,
      cutPolygon: false,
      removalMode: true,
    });

    // Create initial rectangle if bounds provided
    if (initialBounds && !rectangleRef.current) {
      const rect = new (window.L as typeof L).Rectangle(initialBounds, {
        color: '#3b82f6',
        weight: 2,
        fillOpacity: 0.2,
        pmIgnore: false,
      });
      rect.addTo(map);
      rectangleRef.current = rect;
      onBoundsChange(initialBounds);

      // Enable editing for the rectangle
      (rect as L.Rectangle & { pm?: { enable: () => void } }).pm?.enable();
    }

    // Listen to rectangle creation
    const handleRectangleCreated = (e: L.LeafletEvent & { layer: L.Rectangle }) => {
      // Remove old rectangle if exists
      if (rectangleRef.current) {
        map.removeLayer(rectangleRef.current);
      }

      // Store new rectangle
      rectangleRef.current = e.layer;
      onBoundsChange(e.layer.getBounds());

      // Enable editing for the new rectangle
      (e.layer as L.Rectangle & { pm?: { enable: () => void } }).pm?.enable();
    };

    // Listen to rectangle edits
    const handleEdit = () => {
      if (rectangleRef.current) {
        onBoundsChange(rectangleRef.current.getBounds());
      }
    };

    // Attach event listeners
    map.on('pm:create', handleRectangleCreated);
    map.on('pm:edit', handleEdit);

    // Cleanup
    return () => {
      // Defensive check: Only remove PM listeners if PM still exists
      if (map.pm) {
        map.off('pm:create', handleRectangleCreated);
        map.off('pm:edit', handleEdit);
      }

      if (rectangleRef.current) {
        map.removeLayer(rectangleRef.current);
      }

      // Defensive check: Ensure PM still available during cleanup
      if (map.pm?.Toolbar) {
        map.pm.removeControls();
      }
    };
  }, [map, initialBounds, onBoundsChange]);

  return null;
};

/**
 * Mini-Map component for region selection
 */
const RegionSelectionMap: React.FC<RegionSelectionMapProps> = ({ initialBounds, onBoundsChange }) => {
  // Default center (Germany) if no bounds provided
  const defaultCenter: [number, number] = [51.1657, 10.4515];
  const defaultZoom = 6;

  // Calculate center from initialBounds if available
  const center: [number, number] = initialBounds ? [initialBounds.getCenter().lat, initialBounds.getCenter().lng] : defaultCenter;
  const zoom = initialBounds ? 10 : defaultZoom;

  return (
    <MapContainer center={center} zoom={zoom} className="h-64 w-full rounded-lg sm:h-80" zoomControl={true} scrollWheelZoom={true}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <RectangleDrawControl initialBounds={initialBounds} onBoundsChange={onBoundsChange} />
    </MapContainer>
  );
};

/**
 * Offline-Region-Modal-Komponente
 *
 * Ermöglicht das Herunterladen von Karten-Regionen für Offline-Nutzung.
 *
 * Features:
 * - Map-Preview mit Region-Selection (Bounding-Box)
 * - Zoom-Level-Slider (8-18, default 15)
 * - Storage-Quota-Check mit Warnung bei <10%
 * - Download-Button mit Progress-Bar
 *
 * @param isOpen - Ob Modal geöffnet ist
 * @param onClose - Callback zum Schließen
 * @param currentMapBounds - Aktuelle Map-Bounds (initial bounds)
 *
 * @remarks
 * - Accessibility: WCAG 2.1 AA compliant
 * - Keyboard: Esc to close, Tab for navigation
 * - Focus trap: Focus bleibt im Modal
 * - Mobile: Full-screen (100vw), Desktop: Max-width 2xl
 *
 * @example
 * ```tsx
 * <OfflineRegionModal
 *   isOpen={isOfflineModalOpen}
 *   onClose={() => setIsOfflineModalOpen(false)}
 *   currentMapBounds={mapRef.current?.getBounds()}
 * />
 * ```
 */
export const OfflineRegionModal: React.FC<OfflineRegionModalProps> = ({ isOpen, onClose, currentMapBounds, map }) => {
  // Zoom-Level State (default: 15)
  const [zoomLevel, setZoomLevel] = useState(15);

  // Selected Bounds State (initialisiert mit currentMapBounds)
  const [selectedBounds, setSelectedBounds] = useState<L.LatLngBounds | null>(null);

  // Storage-Quota State
  const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null);
  const [storageQuotaError, setStorageQuotaError] = useState<string | null>(null);

  // Download State
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  /**
   * Initialize selected bounds when modal opens
   */
  useEffect(() => {
    if (isOpen && currentMapBounds && !selectedBounds) {
      setSelectedBounds(currentMapBounds);
    }
  }, [isOpen, currentMapBounds, selectedBounds]);

  /**
   * Fetch storage quota when modal opens
   */
  useEffect(() => {
    if (isOpen) {
      getStorageQuota()
        .then(setStorageQuota)
        .catch((error) => {
          console.error('Failed to get storage quota:', error);
          setStorageQuotaError(error instanceof Error ? error.message : 'Unknown error');
        });
    }
  }, [isOpen]);

  /**
   * Handler: Region-Bounds geändert (Drag/Resize Rectangle)
   */
  const handleBoundsChange = useCallback((bounds: L.LatLngBounds) => {
    setSelectedBounds(bounds);
  }, []);

  /**
   * Handler: Zoom-Level-Slider geändert
   */
  const handleZoomChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setZoomLevel(Number(event.target.value));
  }, []);

  /**
   * Handler: Download-Button geklickt
   * Initiates tile download using leaflet.offline
   */
  const handleDownload = useCallback(() => {
    if (!selectedBounds) {
      console.error('[OfflineRegionModal] No bounds selected for download');
      return;
    }

    if (!map) {
      console.error('[OfflineRegionModal] No map reference available for download');
      return;
    }

    // Create offline-capable TileLayer for downloading
    // Using standard OSM tile URL
    const offlineLayer = (window.L as typeof L).tileLayer.offline('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      crossOrigin: true,
    });

    setIsDownloading(true);
    setDownloadProgress(0);

    // Start download
    const _control = downloadTiles(
      map, // Pass map reference for tile coordinate calculations
      offlineLayer,
      selectedBounds,
      [zoomLevel], // Download only selected zoom level
      // onProgress callback
      (progress) => {
        setDownloadProgress(progress);
      },
      // onComplete callback
      () => {
        setIsDownloading(false);
        console.log('[OfflineRegionModal] Download abgeschlossen!');
        toast.success('Karten-Download abgeschlossen!');
      },
      // onError callback
      (error) => {
        setIsDownloading(false);
        console.error('[OfflineRegionModal] Download fehlgeschlagen:', error.message);
        toast.error(`Karten-Download fehlgeschlagen: ${error.message}`);
      },
    );

    // Note: control is created but not stored in state (no cancel button implemented yet)
    // If cancel functionality is needed in the future, store control: setSaveControl(control)
  }, [selectedBounds, zoomLevel, map]);

  /**
   * Calculate tile count for a given bounding box and zoom range
   * Based on Web Mercator projection tile coordinates
   *
   * @param bounds - Lat/Lng bounding box
   * @param minZoom - Minimum zoom level
   * @param maxZoom - Maximum zoom level (same as minZoom for single zoom level)
   * @returns Total number of tiles
   */
  const calculateTileCount = useCallback((bounds: L.LatLngBounds, minZoom: number, maxZoom: number): number => {
    let totalTiles = 0;

    for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
      const n = 2 ** zoom;

      // Convert lat/lng to tile coordinates (Web Mercator)
      const nw = bounds.getNorthWest();
      const se = bounds.getSouthEast();

      const nwX = Math.floor(((nw.lng + 180) / 360) * n);
      const nwY = Math.floor(((1 - Math.log(Math.tan((nw.lat * Math.PI) / 180) + 1 / Math.cos((nw.lat * Math.PI) / 180)) / Math.PI) / 2) * n);

      const seX = Math.floor(((se.lng + 180) / 360) * n);
      const seY = Math.floor(((1 - Math.log(Math.tan((se.lat * Math.PI) / 180) + 1 / Math.cos((se.lat * Math.PI) / 180)) / Math.PI) / 2) * n);

      const width = Math.abs(seX - nwX) + 1;
      const height = Math.abs(seY - nwY) + 1;

      totalTiles += width * height;
    }

    return totalTiles;
  }, []);

  /**
   * Calculate estimated download size and tile count
   * Assumes average tile size of 30 KB (typical for OSM PNG tiles)
   */
  const { tileCount: estimatedTileCount, sizeMB: estimatedSizeMB } = useMemo(() => {
    if (!selectedBounds) {
      return { tileCount: 0, sizeMB: 0 };
    }

    const tileCount = calculateTileCount(selectedBounds, zoomLevel, zoomLevel);
    const avgTileSizeKB = 30; // Average OSM tile size
    const sizeMB = Math.round((tileCount * avgTileSizeKB) / 1024);

    return { tileCount, sizeMB };
  }, [selectedBounds, zoomLevel, calculateTileCount]);

  /**
   * Check if download is large (>1000 tiles)
   */
  const isLargeDownload = estimatedTileCount > 1000;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

      {/* Full-screen Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        {/* Modal Panel */}
        <DialogPanel
          className={cn(
            // Sizing
            'w-full max-w-2xl',
            // Glassmorphism
            'rounded-xl border border-gray-200/50 bg-white/95 shadow-2xl backdrop-blur-lg',
            'dark:border-gray-700/50 dark:bg-gray-900/95',
            // Padding
            'p-6',
            // Mobile: Full-screen
            'md:p-8',
          )}
        >
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <DialogTitle className="font-semibold text-gray-900 text-xl dark:text-gray-100">Offline-Region auswählen</DialogTitle>
            <Button type="button" onClick={onClose} intent="secondary" appearance="ghost" size="icon" className="p-2" aria-label="Modal schließen" disabled={isDownloading}>
              <PiX size={20} aria-hidden="true" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Map-Preview Section */}
            <div>
              <h3 className="mb-2 font-medium text-gray-900 text-sm dark:text-gray-100">Karten-Region</h3>
              <p className="mb-3 text-gray-600 text-sm dark:text-gray-400">
                Zeichne ein Rechteck auf der Karte, um die Offline-Region auszuwählen. Du kannst das Rechteck anpassen, indem du es verschiebst oder die Ecken ziehst.
              </p>
              <RegionSelectionMap initialBounds={currentMapBounds} onBoundsChange={handleBoundsChange} />
            </div>

            {/* Zoom-Level-Slider Section */}
            <div>
              <h3 className="mb-2 font-medium text-gray-900 text-sm dark:text-gray-100">Zoom-Level: {zoomLevel}</h3>
              <input
                type="range"
                min={8}
                max={18}
                value={zoomLevel}
                onChange={handleZoomChange}
                className={cn(
                  'w-full',
                  // Tailwind range styling
                  'h-2 rounded-lg bg-gray-200 accent-blue-600',
                  'dark:bg-gray-700',
                  'cursor-pointer',
                )}
                aria-label="Zoom-Level auswählen"
                disabled={isDownloading}
              />
              <div className="mt-1 flex justify-between text-gray-600 text-xs dark:text-gray-400">
                <span>8 (Land)</span>
                <span>15 (Nachbarschaft)</span>
                <span>18 (Straße)</span>
              </div>
              {selectedBounds ? (
                <div className="mt-2 space-y-1">
                  <p className="text-gray-600 text-sm dark:text-gray-400">
                    Ca. {estimatedTileCount.toLocaleString('de-DE')} Tiles ({estimatedSizeMB} MB)
                  </p>
                  {isLargeDownload && <p className="font-medium text-orange-600 text-sm dark:text-orange-400">⚠️ Großer Download! Kann länger dauern.</p>}
                </div>
              ) : (
                <p className="mt-2 text-gray-600 text-sm dark:text-gray-400">Wähle eine Region aus, um die Größe zu berechnen.</p>
              )}
            </div>

            {/* Storage-Info Section */}
            {storageQuota && (
              <div
                className={cn(
                  'rounded-lg border p-4',
                  // Warning styling if <10% available
                  storageQuota.percentage > 90 ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30' : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30',
                )}
              >
                <div className="flex items-start gap-3">
                  {storageQuota.percentage > 90 ? (
                    <PiWarning className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600 dark:text-orange-400" aria-hidden="true" />
                  ) : (
                    <PiInfo className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  )}
                  <div className="text-sm">
                    <p className={cn('font-medium', storageQuota.percentage > 90 ? 'text-orange-900 dark:text-orange-200' : 'text-blue-900 dark:text-blue-200')}>Verfügbarer Speicher</p>
                    <p className={cn('mt-1', storageQuota.percentage > 90 ? 'text-orange-700 dark:text-orange-300' : 'text-blue-700 dark:text-blue-300')}>
                      {storageQuota.available.toLocaleString('de-DE')} MB ({100 - storageQuota.percentage}% frei)
                    </p>
                    {storageQuota.percentage > 90 && <p className="mt-2 font-medium text-orange-900 dark:text-orange-200">⚠️ Wenig Speicher! Bitte Platz freigeben.</p>}
                  </div>
                </div>
              </div>
            )}
            {storageQuotaError && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                <div className="flex items-start gap-3">
                  <PiInfo className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-600 dark:text-gray-400" aria-hidden="true" />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 dark:text-gray-200">Speicher-Info nicht verfügbar</p>
                    <p className="mt-1 text-gray-600 text-xs dark:text-gray-400">{storageQuotaError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Progress-Bar (nur während Download) */}
            {isDownloading && (
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">Lade Tiles...</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{downloadProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-300 dark:bg-blue-500"
                    style={{ width: `${downloadProgress}%` }}
                    role="progressbar"
                    aria-valuenow={downloadProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 flex justify-end gap-3">
            <Button type="button" onClick={onClose} intent="secondary" appearance="outline" size="md" disabled={isDownloading}>
              Abbrechen
            </Button>
            <Button type="button" onClick={handleDownload} intent="primary" appearance="filled" size="md" disabled={isDownloading}>
              {isDownloading ? 'Lädt...' : 'Download starten'}
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};
