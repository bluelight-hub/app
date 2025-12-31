/**
 * DashboardErrorCard - Einheitliche Error-Card für Dashboard-Widgets.
 *
 * **Story 6.2 - Fullscreen & Compact Modus:**
 * Extrahiert aus Story 6.1d zur Wiederverwendung und
 * Mode-spezifischen Darstellung.
 */

import { PiWarningCircle, PiArrowClockwise } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';

interface DashboardErrorCardProps {
  /** Titel des Widgets (z.B. "Stärke", "Fahrzeuge", "Rollen") */
  title: string;
  /** Retry-Callback */
  onRetry: () => void;
  /** Kompakte Darstellung für Compact-Modus */
  compact?: boolean;
}

/**
 * Einheitliche Error-Card für Dashboard-Widgets.
 *
 * Zeigt Fehlermeldung mit Icon und Retry-Button.
 * Unterstützt Mode-spezifische Darstellung (compact).
 */
export function DashboardErrorCard({ title, onRetry, compact = false }: DashboardErrorCardProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50', 'dark:border-red-800 dark:bg-red-900/20', compact ? 'gap-1 p-3' : 'h-full gap-2 p-4')}>
      <PiWarningCircle className={cn('text-red-500', compact ? 'h-5 w-5' : 'h-8 w-8')} />
      <p className={cn('text-center text-red-600 dark:text-red-400', compact ? 'text-xs' : 'text-sm')}>{title} konnte nicht geladen werden</p>
      <button type="button" onClick={onRetry} className={cn('flex items-center gap-1 text-red-600 hover:text-red-700', 'dark:text-red-400 dark:hover:text-red-300', compact ? 'text-xs' : 'text-sm')}>
        <PiArrowClockwise className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
        Erneut versuchen
      </button>
    </div>
  );
}
