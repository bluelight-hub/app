import { Button } from '@/components/atoms/button.atom';
import { cn } from '@/shared/utils/cn';
import type React from 'react';
import { PiCamera, PiDownload } from 'react-icons/pi';

interface LagekarteToolbarProps {
  /**
   * Callback wenn Offline-Download-Button geklickt wird
   */
  onOfflineDownloadClick: () => void;
  /**
   * Callback wenn ETB-Export-Button geklickt wird
   */
  onEtbExportClick: () => void;
  /**
   * Zeigt Loading-State während Screenshot-Generierung
   */
  isExportingToEtb?: boolean;
}

/**
 * Lagekarte-Toolbar-Komponente
 *
 * Zeigt zentrale Toolbar-Funktionen für die Lagekarte an:
 * - Offline-Download: Karten-Region für Offline-Nutzung herunterladen
 * - ETB-Export: Screenshot der Lagekarte ins Einsatztagebuch exportieren
 *
 * @param onOfflineDownloadClick - Callback wenn Offline-Download-Button geklickt wird
 * @param onEtbExportClick - Callback wenn ETB-Export-Button geklickt wird
 * @param isExportingToEtb - Zeigt Loading-State während Screenshot-Generierung
 *
 * @remarks
 * - Position: Top-right corner of map (next to zoom controls)
 * - Glassmorphism-Stil konsistent mit DrawingToolbar
 * - Mobile: Bleibt top-right, aber mit touch-friendly size
 * - Fullscreen-Button ist jetzt im Layout-Header (nicht in dieser Toolbar)
 *
 * @example
 * ```tsx
 * <LagekarteToolbar
 *   onOfflineDownloadClick={() => setOfflineModalOpen(true)}
 *   onEtbExportClick={handleExportToEtb}
 *   isExportingToEtb={isExporting}
 * />
 * ```
 */
export const LagekarteToolbar: React.FC<LagekarteToolbarProps> = ({ onOfflineDownloadClick, onEtbExportClick, isExportingToEtb = false }) => {
  return (
    <div
      className={cn(
        // Glassmorphism
        'rounded-xl border border-gray-200/50 bg-white/90 shadow-xl backdrop-blur-lg',
        'dark:border-gray-700/50 dark:bg-gray-900/90',
        // Padding
        'p-2',
        // Flex layout für multiple buttons
        'flex flex-col gap-2',
      )}
    >
      <Button
        type="button"
        onClick={onOfflineDownloadClick}
        intent="secondary"
        appearance="outline"
        size="md"
        className={cn(
          'gap-2',
          // Hover scale animation
          'hover:scale-[1.02]',
        )}
        aria-label="Offline-Karte herunterladen"
        title="Karten-Region für Offline-Nutzung herunterladen"
      >
        <PiDownload size={20} aria-hidden="true" />
        <span className="hidden md:inline">Offline-Download</span>
      </Button>

      <Button
        type="button"
        onClick={onEtbExportClick}
        intent="primary"
        appearance="outline"
        size="md"
        disabled={isExportingToEtb}
        className={cn(
          'gap-2',
          // Hover scale animation
          'hover:scale-[1.02]',
          // Loading state
          isExportingToEtb && 'cursor-wait opacity-50',
        )}
        aria-label="Lagekarte ins ETB exportieren"
        title="Screenshot der Lagekarte ins Einsatztagebuch exportieren"
      >
        <PiCamera size={20} aria-hidden="true" />
        <span className="hidden md:inline">{isExportingToEtb ? 'Exportiere...' : 'ETB-Export'}</span>
      </Button>
    </div>
  );
};
