/**
 * FahrzeugStatusListe Container für alle Einsatz-Fahrzeuge.
 *
 * **Story 6.1b - Fahrzeug-Status Liste:**
 * Container-Komponente die alle Fahrzeuge eines Einsatzes anzeigt.
 *
 * **Story 6.2 - Fullscreen & Compact Modus:**
 * - Liest DashboardMode via Context für Mode-spezifische Styles
 * - refetchInterval nur in Fullscreen aktiv (AC3)
 * - Compact: Badge-Liste statt Karten (platzsparend)
 *
 * **AC1 - Fahrzeug-Liste:**
 * - Alle Fahrzeuge mit Funkrufname, Typ und FMS-Status
 * - Nach Zuordnungszeitpunkt sortiert (älteste zuerst)
 *
 * **AC1b - Empty State:**
 * - Zeigt "Keine Fahrzeuge erfasst" wenn Liste leer
 */

import { cn } from '@/shared/ui/cn';
import { FahrzeugCard, FahrzeugCardSkeleton } from '../molecules/FahrzeugCard';
import { useEinsatzFahrzeuge } from '../../api/use-einsatz-fahrzeuge';
import { useDashboardMode, type DashboardMode } from '../../contexts';
import { PiTruck, PiWarningCircle, PiArrowClockwise } from 'react-icons/pi';
import type { EinsatzFahrzeugDto } from '@bluelight-hub/shared/client';

interface FahrzeugStatusListeProps {
  /** Einsatz-ID für die Fahrzeug-Abfrage */
  einsatzId: string;
  /** Click Handler für Fahrzeug-Detail (Story 6.1d) */
  onFahrzeugClick?: (fahrzeugId: string) => void;
  /** Zusätzliche CSS Klassen */
  className?: string;
}

/**
 * Formatiert einen Timestamp als HH:MM
 */
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Story 6.2 - Mode-aware Container Classes.
 */
const getContainerClasses = (mode: DashboardMode) =>
  ({
    standard: 'p-4',
    fullscreen: 'p-6 lg:p-8',
    compact: 'p-3',
  })[mode];

/**
 * Loading Skeleton für die Fahrzeug-Liste.
 */
function FahrzeugStatusListeSkeleton() {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <FahrzeugCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}

/**
 * Compact Badge für Fahrzeug (Story 6.2).
 *
 * Zeigt Fahrzeug als farbcodiertes Badge im Compact-Modus.
 */
function FahrzeugBadge({ fahrzeug }: { fahrzeug: EinsatzFahrzeugDto }) {
  const statusColors: Record<number, string> = {
    1: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    2: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    3: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    4: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  };

  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-1 text-xs font-medium', statusColors[fahrzeug.fmsStatus] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200')}>
      {fahrzeug.funkrufname}
    </span>
  );
}

/**
 * FahrzeugStatusListe zeigt alle Fahrzeuge eines Einsatzes.
 *
 * Story 6.2: Liest Mode via Context für Mode-spezifische Layouts.
 * - Standard/Fullscreen: Vollständige Karten
 * - Compact: Badge-Liste (platzsparend)
 */
export function FahrzeugStatusListe({ einsatzId, onFahrzeugClick, className }: FahrzeugStatusListeProps) {
  // Mode via Context (kein Prop-Drilling)
  const mode = useDashboardMode();
  const containerClasses = getContainerClasses(mode);

  // AC3: refetchInterval nur in Fullscreen
  const {
    data: fahrzeuge,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
  } = useEinsatzFahrzeuge(einsatzId, {
    refetchInterval: mode === 'fullscreen' ? 30000 : false,
  });

  // Loading State
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800', containerClasses, className)}>
        <FahrzeugStatusListeSkeleton />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800', containerClasses, className)}>
        <div className="flex flex-col items-center py-8 text-red-500">
          <PiWarningCircle className="mb-2 h-8 w-8" />
          <p className="text-sm">Fehler beim Laden der Fahrzeuge</p>
          <button type="button" onClick={() => refetch()} className="mt-2 text-blue-600 text-sm hover:underline">
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  const fahrzeugCount = fahrzeuge?.length ?? 0;

  // Compact: Badge-Liste statt Karten (platzsparend für Tablets)
  if (mode === 'compact') {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800', containerClasses, className)}>
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium text-gray-600 text-sm dark:text-gray-400">Fahrzeuge</span>
          <span className="text-gray-500 text-xs">{fahrzeugCount}</span>
        </div>
        {fahrzeuge && fahrzeuge.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {fahrzeuge.map((fz) => (
              <FahrzeugBadge key={fz.id} fahrzeug={fz} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 text-xs">Keine Fahrzeuge</p>
        )}
      </div>
    );
  }

  // Standard & Fullscreen: Vollständige Karten
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800', containerClasses, className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiTruck className={cn('text-gray-500', mode === 'fullscreen' ? 'h-6 w-6' : 'h-5 w-5')} />
          <h3 className={cn('font-semibold text-gray-900 dark:text-gray-100', mode === 'fullscreen' ? 'text-xl lg:text-2xl' : 'text-base')}>Fahrzeuge</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('text-gray-500', mode === 'fullscreen' ? 'text-base' : 'text-sm')}>{fahrzeugCount} im Einsatz</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            title="Aktualisieren"
            aria-label="Aktualisieren"
          >
            <PiArrowClockwise className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Last Updated */}
      {dataUpdatedAt && <p className={cn('mb-3 text-gray-400', mode === 'fullscreen' ? 'text-sm' : 'text-xs')}>Aktualisiert: {formatTime(dataUpdatedAt)}</p>}

      {/* Liste oder Empty State */}
      {fahrzeuge && fahrzeuge.length > 0 ? (
        <div className={mode === 'fullscreen' ? 'space-y-4' : 'space-y-3'}>
          {fahrzeuge.map((fahrzeug) => (
            <FahrzeugCard key={fahrzeug.id} fahrzeug={fahrzeug} onClick={onFahrzeugClick ? () => onFahrzeugClick(fahrzeug.id) : undefined} />
          ))}
        </div>
      ) : (
        /* Empty State (AC1b) */
        <div className="flex flex-col items-center py-8 text-gray-500">
          <PiTruck className="mb-2 h-12 w-12 opacity-50" />
          <p className="text-sm">Keine Fahrzeuge erfasst</p>
        </div>
      )}
    </div>
  );
}
