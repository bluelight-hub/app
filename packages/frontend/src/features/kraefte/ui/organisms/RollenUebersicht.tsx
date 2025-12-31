/**
 * RollenUebersicht Container für die Anzeige aller Führungsrollen.
 *
 * **Story 6.1c - Rollen-Übersicht:**
 * Dashboard-Widget das alle besetzten Führungsrollen zeigt.
 */

import { cn } from '@/shared/ui/cn';
import { PiUsers, PiArrowClockwise, PiWarningCircle } from 'react-icons/pi';
import { useRollenBesetzungen } from '../../api';
import { RollenKarte, RollenKarteSkeleton } from '../molecules/RollenKarte';

interface RollenUebersichtProps {
  /** Einsatz ID */
  einsatzId: string;
  /** Click Handler für Rolle freigeben */
  onFreigebeClick?: (rollenBesetzungId: string) => void;
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
 * RollenUebersicht zeigt alle besetzten Führungsrollen mit:
 * - Header mit Statistik (AC5)
 * - Refresh-Button und Aktualisierungs-Zeit (AC7)
 * - Grid von RollenKarten
 * - Empty/Error/Loading States
 */
export function RollenUebersicht({ einsatzId, onFreigebeClick, className }: RollenUebersichtProps) {
  const { data: besetzungen, isLoading, error, refetch, dataUpdatedAt } = useRollenBesetzungen(einsatzId);

  // Loading State
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border bg-white p-4 dark:bg-gray-800', className)}>
        <RollenUebersichtSkeleton />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={cn('rounded-lg border bg-white p-4 dark:bg-gray-800', className)}>
        <div className="flex flex-col items-center py-8 text-red-500">
          <PiWarningCircle className="mb-2 h-8 w-8" />
          <p className="text-sm">Fehler beim Laden der Rollen</p>
          <button type="button" onClick={() => refetch()} className="mt-2 text-blue-600 text-sm hover:underline">
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  const besetzteCount = besetzungen?.length ?? 0;

  return (
    <div className={cn('rounded-lg border bg-white p-4 dark:bg-gray-800', className)}>
      {/* Header (AC5, AC7) */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiUsers className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Führungsrollen</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-sm">{besetzteCount} besetzt</span>
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

      {/* Last Updated (AC7) */}
      {dataUpdatedAt && <p className="mb-3 text-gray-400 text-xs">Aktualisiert: {formatTime(dataUpdatedAt)}</p>}

      {/* Grid oder Empty State */}
      {besetzungen && besetzungen.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {besetzungen.map((besetzung) => (
            <RollenKarte key={besetzung.id} besetzung={besetzung} onFreigeben={onFreigebeClick ? () => onFreigebeClick(besetzung.id) : undefined} />
          ))}
        </div>
      ) : (
        /* Empty State (AC1b) */
        <div className="flex flex-col items-center py-8 text-gray-500">
          <PiUsers className="mb-2 h-12 w-12 opacity-50" />
          <p className="text-sm">Keine Rollen besetzt</p>
        </div>
      )}
    </div>
  );
}

function RollenUebersichtSkeleton() {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <RollenKarteSkeleton key={i} />
        ))}
      </div>
    </>
  );
}
