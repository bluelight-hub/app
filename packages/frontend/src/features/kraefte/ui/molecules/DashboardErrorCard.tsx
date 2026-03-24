/**
 * DashboardErrorCard - Einheitliche Error-Card für Dashboard-Widgets.
 *
 * **Story 6.2 - Fullscreen & Compact Modus (Code Review Action Item 4):**
 * Extrahiert aus Story 6.1d zur Wiederverwendung.
 * Liest DashboardMode via Context für Mode-spezifische Darstellung.
 * Fullscreen: Größere Icons und Schrift
 * Compact: Kompakte Darstellung
 */

import { PiWarningCircle, PiArrowClockwise } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { useDashboardMode, type DashboardMode } from '../../contexts';

interface DashboardErrorCardProps {
  /** Titel des Widgets (z.B. "Stärke", "Fahrzeuge", "Rollen") */
  title: string;
  /** Retry-Callback */
  onRetry: () => void;
  /** Zusätzliche CSS Klassen */
  className?: string;
}

/**
 * Story 6.2 - Mode-spezifische Style-Klassen.
 */
const getModeClasses = (mode: DashboardMode) => ({
  container: {
    standard: 'h-full gap-2 p-4',
    fullscreen: 'h-full gap-4 p-6 lg:p-8',
    compact: 'gap-1 p-3',
  }[mode],
  icon: {
    standard: 'h-8 w-8',
    fullscreen: 'h-12 w-12 lg:h-14 lg:w-14',
    compact: 'h-5 w-5',
  }[mode],
  text: {
    standard: 'text-sm',
    fullscreen: 'text-base lg:text-lg',
    compact: 'text-xs',
  }[mode],
  buttonIcon: {
    standard: 'h-4 w-4',
    fullscreen: 'h-5 w-5',
    compact: 'h-3 w-3',
  }[mode],
});

/**
 * Einheitliche Error-Card für Dashboard-Widgets.
 *
 * Story 6.2: Mode-aware via useDashboardMode() Context.
 * Zeigt Fehlermeldung mit Icon und Retry-Button.
 */
export function DashboardErrorCard({ title, onRetry, className }: DashboardErrorCardProps) {
  const mode = useDashboardMode();
  const classes = getModeClasses(mode);

  return (
    <div className={cn('flex flex-col items-center justify-center rounded-panel border border-status-danger-border bg-status-danger-surface', classes.container, className)}>
      <PiWarningCircle className={cn('text-status-danger-text', classes.icon)} />
      <p className={cn('text-center text-status-danger-text', classes.text)}>{title} konnte nicht geladen werden</p>
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          'flex items-center gap-1 rounded-control px-2 py-1 text-status-danger-text transition-opacity hover:opacity-80 focus:outline-none focus-visible:shadow-focus-ring',
          classes.text,
          // AC2: Touch-Target min. 44x44px in Compact-Mode
          mode === 'compact' && 'min-h-[44px] min-w-[44px] px-2 py-2',
          mode === 'fullscreen' && 'px-4 py-3',
        )}
        aria-label={`${title} erneut laden`}
      >
        <PiArrowClockwise className={classes.buttonIcon} />
        Erneut versuchen
      </button>
    </div>
  );
}
