import { Button } from '@/shared/ui/atoms/button.atom';
import { cn } from '@/shared/ui/cn';
import type React from 'react';
import { PiPencilSimple, PiX } from 'react-icons/pi';

interface MapToolbarToggleProps {
  /**
   * Ob die Werkzeuge angezeigt werden
   */
  isOpen: boolean;

  /**
   * Callback wenn Toggle-State sich ändert
   */
  onToggle: (isOpen: boolean) => void;
}

/**
 * Toggle-Button für Karten-Werkzeuge (POI + Zeichnen)
 *
 * Zeigt einen Button zum Ein-/Ausblenden der Werkzeug-Toolbars.
 * Die eigentlichen Tools (PoiPlacementControl + DrawingToolbar) werden
 * conditional in LagekarteView gerendert.
 *
 * Features:
 * - Glassmorphism Design
 * - Dark-Mode Support
 * - Desktop & Mobile responsive
 * - Active State wenn Tools geöffnet
 *
 * @example
 * ```tsx
 * <MapToolbarToggle
 *   isOpen={toolsVisible}
 *   onToggle={(open) => setToolsVisible(open)}
 * />
 * ```
 */
export const MapToolbarToggle: React.FC<MapToolbarToggleProps> = ({ isOpen, onToggle }) => {
  return (
    <>
      {/* Desktop: Im Flex-Container (keine absolute Positionierung) */}
      <div
        className={cn(
          // Glassmorphism
          'rounded-xl border border-border-subtle/50 bg-surface-panel/90 shadow-xl backdrop-blur-lg',
          // Transition
          'transition-all duration-300 ease-in-out',
        )}
      >
        <Button
          onClick={() => onToggle(!isOpen)}
          intent={isOpen ? 'primary' : 'secondary'}
          appearance={isOpen ? 'filled' : 'outline'}
          size="md"
          aria-label={isOpen ? 'Werkzeuge schließen' : 'Werkzeuge öffnen'}
          aria-expanded={isOpen}
          className="gap-2"
        >
          {isOpen ? <PiX size={20} aria-hidden="true" /> : <PiPencilSimple size={20} aria-hidden="true" />}
          <span>{isOpen ? 'Schließen' : 'Werkzeuge'}</span>
        </Button>
      </div>
    </>
  );
};
