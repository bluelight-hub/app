/**
 * StaerkeCard Komponente für die taktische Stärke-Anzeige.
 *
 * **Story 6.1a - Taktische Stärke-Anzeige:**
 * Zeigt Führung/Unterführung/Mannschaft/Gesamt im Dashboard.
 *
 * **AC2 - Design:**
 * - Zahlen prominent (min. 24px / text-2xl)
 * - Farblich unterschieden:
 *   - Führung = Blau (text-blue-600)
 *   - Unterführung = Grün (text-green-600)
 *   - Mannschaft = Grau (text-gray-600)
 *   - Gesamt = Schwarz/Bold
 */

import { cn } from '@/shared/ui/cn';

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
 * Skeleton Loading State für StaerkeCard
 */
function StaerkeCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800', 'animate-pulse', className)}>
      {/* Title Skeleton */}
      <div className="mb-4 h-5 w-32 rounded bg-gray-200 dark:bg-gray-700" />

      {/* Values Skeleton */}
      <div className="flex items-center justify-between gap-4">
        {['fuehrung', 'unterfuehrung', 'mannschaft', 'gesamt'].map((label) => (
          <div key={label} className="text-center">
            <div className="mx-auto mb-1 h-8 w-10 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mx-auto h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * StaerkeCard zeigt die taktische Stärke im Format:
 * "Führung / Unterführung / Mannschaft / Gesamt"
 */
export function StaerkeCard({ fuehrung, unterfuehrung, mannschaft, gesamt, isLoading, className }: StaerkeCardProps) {
  if (isLoading) {
    return <StaerkeCardSkeleton className={className} />;
  }

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800', className)}>
      {/* Title */}
      <h3 className="mb-4 font-medium text-gray-900 text-sm dark:text-gray-100">Taktische Stärke</h3>

      {/* Values */}
      <div className="flex items-center justify-between gap-4">
        {/* Führung - Blau */}
        <div className="text-center">
          <span className="font-bold text-2xl text-blue-600 dark:text-blue-400">{fuehrung}</span>
          <p className="text-gray-500 text-xs dark:text-gray-400">Führung</p>
        </div>

        {/* Separator */}
        <span className="text-gray-400 text-xl dark:text-gray-500">/</span>

        {/* Unterführung - Grün */}
        <div className="text-center">
          <span className="font-bold text-2xl text-green-600 dark:text-green-400">{unterfuehrung}</span>
          <p className="text-gray-500 text-xs dark:text-gray-400">Unterführung</p>
        </div>

        {/* Separator */}
        <span className="text-gray-400 text-xl dark:text-gray-500">/</span>

        {/* Mannschaft - Grau */}
        <div className="text-center">
          <span className="font-bold text-2xl text-gray-600 dark:text-gray-300">{mannschaft}</span>
          <p className="text-gray-500 text-xs dark:text-gray-400">Mannschaft</p>
        </div>

        {/* Separator */}
        <span className="text-gray-400 text-xl dark:text-gray-500">/</span>

        {/* Gesamt - Bold/Schwarz */}
        <div className="text-center">
          <span className="font-bold text-2xl text-gray-900 dark:text-white">{gesamt}</span>
          <p className="text-gray-500 text-xs dark:text-gray-400">Gesamt</p>
        </div>
      </div>
    </div>
  );
}
