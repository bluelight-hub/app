/**
 * FahrzeugStatusListe Container für alle Einsatz-Fahrzeuge.
 *
 * **Story 6.1b - Fahrzeug-Status Liste:**
 * Container-Komponente die alle Fahrzeuge eines Einsatzes anzeigt.
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
import { PiTruck, PiWarningCircle, PiArrowClockwise } from 'react-icons/pi';

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
 * FahrzeugStatusListe zeigt alle Fahrzeuge eines Einsatzes.
 *
 * - Lädt Fahrzeuge automatisch via useEinsatzFahrzeuge Hook
 * - Header mit Icon, Titel, Anzahl und Refresh-Button
 * - Zeigt Empty State wenn keine Fahrzeuge vorhanden
 * - Zeigt Error State bei API-Fehlern
 * - Unterstützt Click-Handler für Detail-Dialog (Story 6.1d)
 */
export function FahrzeugStatusListe({ einsatzId, onFahrzeugClick, className }: FahrzeugStatusListeProps) {
  const { data: fahrzeuge, isLoading, error, refetch, dataUpdatedAt } = useEinsatzFahrzeuge(einsatzId);

  // Loading State
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800', className)}>
        <FahrzeugStatusListeSkeleton />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800', className)}>
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

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800', className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiTruck className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Fahrzeuge</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-sm">{fahrzeugCount} im Einsatz</span>
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
      {dataUpdatedAt && <p className="mb-3 text-gray-400 text-xs">Aktualisiert: {formatTime(dataUpdatedAt)}</p>}

      {/* Liste oder Empty State */}
      {fahrzeuge && fahrzeuge.length > 0 ? (
        <div className="space-y-3">
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
