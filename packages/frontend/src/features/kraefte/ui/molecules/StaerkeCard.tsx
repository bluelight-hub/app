/**
 * StaerkeCard Komponente für die taktische Stärke-Anzeige.
 *
 * **Story 6.1a - Taktische Stärke-Anzeige:**
 * Zeigt Führung/Unterführung/Mannschaft//Gesamt im Dashboard (FwDV-konform).
 *
 * **Story 6.2 - Fullscreen & Compact Modus:**
 * Liest DashboardMode via Context für Mode-spezifische Styles.
 * - Fullscreen: Große Schrift (min. 32px) für 3m Lesbarkeit
 * - Compact: Nur Gesamt-Wert (platzsparend für Tablets)
 *
 * **AC2 - Design:**
 * - Zahlen prominent (min. 24px / text-2xl, Fullscreen: 36-48px)
 * - Farblich unterschieden:
 *   - Führung = Blau (text-blue-600)
 *   - Unterführung = Grün (text-green-600)
 *   - Mannschaft = Grau (text-gray-600)
 *   - Gesamt = Schwarz/Bold
 */

import { cn } from '@/shared/ui/cn';
import { useDashboardMode, type DashboardMode } from '../../contexts';

interface StaerkeCardProps {
  /** Anzahl Führungskräfte */
  fuehrung: number;
  /** Anzahl Unterführer */
  unterfuehrung: number;
  /** Anzahl Mannschaftsmitglieder */
  mannschaft: number;
  /** Gesamtanzahl */
  gesamt: number;
  /** Loading State */
  isLoading?: boolean;
  /** Zusätzliche CSS Klassen */
  className?: string;
}

/**
 * Story 6.2 - Mode-aware Size Classes.
 */
const getModeClasses = (mode: DashboardMode) => ({
  number: {
    standard: 'text-2xl font-bold',
    fullscreen: 'text-4xl font-bold lg:text-5xl',
    compact: 'text-xl font-semibold',
  }[mode],
  label: {
    standard: 'text-xs text-gray-500 dark:text-gray-400',
    fullscreen: 'text-base text-gray-500 lg:text-lg dark:text-gray-400',
    compact: 'text-[10px] text-gray-500 dark:text-gray-400',
  }[mode],
  container: {
    standard: 'p-4',
    fullscreen: 'p-6 lg:p-8',
    compact: 'p-3',
  }[mode],
  title: {
    standard: 'text-sm',
    fullscreen: 'text-xl lg:text-2xl',
    compact: 'text-xs',
  }[mode],
  gap: {
    standard: 'gap-4',
    fullscreen: 'gap-8',
    compact: 'gap-2',
  }[mode],
  separator: {
    standard: 'text-xl',
    fullscreen: 'text-2xl lg:text-3xl',
    compact: 'text-lg',
  }[mode],
});

/**
 * Skeleton Loading State für StaerkeCard.
 *
 * Story 6.2: Skeleton passt sich dem DashboardMode an.
 */
function StaerkeCardSkeleton({ className }: { className?: string }) {
  const mode = useDashboardMode();
  const classes = getModeClasses(mode);

  return (
    <div className={cn('animate-pulse rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800', classes.container, className)}>
      <div className="mb-4 h-5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
      <div className={cn('flex items-center justify-between', classes.gap)}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="text-center">
            <div className={cn('mx-auto mb-1 rounded bg-gray-200 dark:bg-gray-700', mode === 'fullscreen' ? 'h-12 w-14' : mode === 'compact' ? 'h-6 w-8' : 'h-8 w-10')} />
            <div className="mx-auto h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * StaerkeCard zeigt die taktische Stärke im Format:
 * "Führung / Unterführung / Mannschaft // Gesamt" (FwDV-konform)
 *
 * Story 6.2: Liest DashboardMode via Context für Mode-spezifische Styles.
 * Daten werden via Props übergeben (Query im Parent).
 */
export function StaerkeCard({ fuehrung, unterfuehrung, mannschaft, gesamt, isLoading, className }: StaerkeCardProps) {
  const mode = useDashboardMode();
  const classes = getModeClasses(mode);

  if (isLoading) {
    return <StaerkeCardSkeleton className={className} />;
  }

  // Compact-Modus: Nur Gesamt anzeigen (platzsparend)
  if (mode === 'compact') {
    return (
      <div className={cn('flex items-center justify-between rounded-lg border border-gray-200 bg-white', 'dark:border-gray-700 dark:bg-gray-800', classes.container, className)}>
        <span className="font-medium text-gray-600 text-sm dark:text-gray-400">Stärke</span>
        <span className="font-bold text-gray-900 text-xl dark:text-white">{gesamt}</span>
      </div>
    );
  }

  // Standard & Fullscreen: Alle Kategorien mit Separatoren
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800', classes.container, className)}>
      <h3 className={cn('mb-4 font-medium text-gray-900 dark:text-gray-100', classes.title)}>Taktische Stärke</h3>

      <div className={cn('flex items-center justify-between', classes.gap)}>
        {/* Führung - Blau */}
        <div className="text-center">
          <span className={cn(classes.number, 'text-blue-600 dark:text-blue-400')}>{fuehrung}</span>
          <p className={classes.label}>Führung</p>
        </div>

        <span className={cn('text-gray-400 dark:text-gray-500', classes.separator)}>/</span>

        {/* Unterführung - Grün */}
        <div className="text-center">
          <span className={cn(classes.number, 'text-green-600 dark:text-green-400')}>{unterfuehrung}</span>
          <p className={classes.label}>Unterführung</p>
        </div>

        <span className={cn('text-gray-400 dark:text-gray-500', classes.separator)}>/</span>

        {/* Mannschaft - Grau */}
        <div className="text-center">
          <span className={cn(classes.number, 'text-gray-600 dark:text-gray-300')}>{mannschaft}</span>
          <p className={classes.label}>Mannschaft</p>
        </div>

        {/* Separator - Doppelter Schrägstrich vor Gesamt (FwDV-konform) */}
        <span className={cn('text-gray-400 dark:text-gray-500', classes.separator)}>{'//'}</span>

        {/* Gesamt - Bold/Schwarz */}
        <div className="text-center">
          <span className={cn(classes.number, 'text-gray-900 dark:text-white')}>{gesamt}</span>
          <p className={classes.label}>Gesamt</p>
        </div>
      </div>
    </div>
  );
}
