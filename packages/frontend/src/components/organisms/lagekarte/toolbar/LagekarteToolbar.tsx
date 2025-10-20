import { Button } from '@/components/atoms/button.atom';
import { cn } from '@/utils/cn';
import type React from 'react';
import { PiDownload } from 'react-icons/pi';

interface LagekarteToolbarProps {
  /**
   * Callback wenn Offline-Download-Button geklickt wird
   */
  onOfflineDownloadClick: () => void;
}

/**
 * Lagekarte-Toolbar-Komponente
 *
 * Zeigt zentrale Toolbar-Funktionen für die Lagekarte an:
 * - Offline-Download: Karten-Region für Offline-Nutzung herunterladen
 *
 * @param onOfflineDownloadClick - Callback wenn Offline-Download-Button geklickt wird
 *
 * @remarks
 * - Position: Top-right corner of map (next to zoom controls)
 * - Glassmorphism-Stil konsistent mit DrawingToolbar
 * - Mobile: Bleibt top-right, aber mit touch-friendly size
 *
 * @example
 * ```tsx
 * <LagekarteToolbar
 *   onOfflineDownloadClick={() => setOfflineModalOpen(true)}
 * />
 * ```
 */
export const LagekarteToolbar: React.FC<LagekarteToolbarProps> = ({ onOfflineDownloadClick }) => {
  return (
    <div
      className={cn(
        // Glassmorphism
        'rounded-xl border border-gray-200/50 bg-white/90 shadow-xl backdrop-blur-lg',
        'dark:border-gray-700/50 dark:bg-gray-900/90',
        // Padding
        'p-2',
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
    </div>
  );
};
