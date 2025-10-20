import { Button } from '@/components/atoms/button.atom';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { cn } from '@/utils/cn';
import type React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { PiX, PiInfo } from 'react-icons/pi';
import type L from 'leaflet';

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
}

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
export const OfflineRegionModal: React.FC<OfflineRegionModalProps> = ({ isOpen, onClose, currentMapBounds }) => {
  // Zoom-Level State (default: 15)
  const [zoomLevel, setZoomLevel] = useState(15);

  // Selected Bounds State (initialisiert mit currentMapBounds)
  const [selectedBounds, setSelectedBounds] = useState<L.LatLngBounds | null>(null);

  // Storage-Quota State (TODO: Implement in Task 6)
  const [_storageQuota, _setStorageQuota] = useState<{
    used: number;
    available: number;
    percentage: number;
  } | null>(null);

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
   * Handler: Zoom-Level-Slider geändert
   */
  const handleZoomChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setZoomLevel(Number(event.target.value));
  }, []);

  /**
   * Handler: Download-Button geklickt
   */
  const handleDownload = useCallback(() => {
    // TODO: Implement in Task 7 & 8
    setIsDownloading(true);
    // Placeholder: Simulate download
    setTimeout(() => {
      setIsDownloading(false);
      setDownloadProgress(100);
      onClose();
    }, 2000);
  }, [onClose]);

  /**
   * Berechne geschätzte Tile-Anzahl
   * (Vereinfachte Formel, wird in Task 5 verfeinert)
   */
  const estimatedTileCount = 500; // Placeholder

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
            {/* Map-Preview Section (Placeholder für Task 4) */}
            <div>
              <h3 className="mb-2 font-medium text-gray-900 text-sm dark:text-gray-100">Karten-Region</h3>
              <div className={cn('h-64 w-full rounded-lg border-2 border-gray-300 border-dashed', 'dark:border-gray-600', 'flex items-center justify-center', 'bg-gray-50 dark:bg-gray-800')}>
                <p className="text-gray-500 text-sm dark:text-gray-400">Map-Preview (Task 4)</p>
              </div>
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
              <p className="mt-2 text-gray-600 text-sm dark:text-gray-400">Ca. {estimatedTileCount} Tiles (10 MB)</p>
            </div>

            {/* Storage-Info Section (Placeholder für Task 6) */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
              <div className="flex items-start gap-3">
                <PiInfo className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-200">Verfügbarer Speicher</p>
                  <p className="mt-1 text-blue-700 dark:text-blue-300">Loading... (Task 6)</p>
                </div>
              </div>
            </div>

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
