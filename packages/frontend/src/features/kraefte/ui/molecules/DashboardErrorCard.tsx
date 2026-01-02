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
export function DashboardErrorCard({ title, onRetry }: DashboardErrorCardProps) {
  const mode = useDashboardMode();
  const classes = getModeClasses(mode);

  return (
    <div className={cn('flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50', 'dark:border-red-800 dark:bg-red-900/20', classes.container)}>
      <PiWarningCircle className={cn('text-red-500', classes.icon)} />
      <p className={cn('text-center text-red-600 dark:text-red-400', classes.text)}>{title} konnte nicht geladen werden</p>
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          'flex items-center gap-1 text-red-600 hover:text-red-700',
          'dark:text-red-400 dark:hover:text-red-300',
          classes.text,
          // AC2: Touch-Target min. 44x44px in Compact-Mode
          mode === 'compact' && 'min-h-[44px] min-w-[44px] px-2 py-2',
          mode === 'fullscreen' && 'px-4 py-3',
        )}
      >
        <PiArrowClockwise className={classes.buttonIcon} />
        Erneut versuchen
      </button>
    </div>
  );
}
