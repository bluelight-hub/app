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
import { DashboardErrorCard } from '@/features/kraefte/ui';
import { FahrzeugCard, FahrzeugCardSkeleton } from '../molecules/FahrzeugCard';
import { useEinsatzFahrzeuge } from '@/features/kraefte';
import { useDashboardMode, type DashboardMode } from '../../contexts';
import { PiArrowClockwise, PiTruck } from 'react-icons/pi';
import type { EinsatzFahrzeugDto } from '@/shared';

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
        <div className="h-5 w-32 animate-pulse rounded bg-surface-raised" />
        <div className="h-4 w-20 animate-pulse rounded bg-surface-raised" />
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
    1: 'bg-status-success-surface text-status-success-text',
    2: 'bg-status-warning-surface text-status-warning-text',
    3: 'bg-status-danger-surface text-status-danger-text',
    4: 'bg-status-info-surface text-status-info-text',
  };

  return (
    <span className={cn('inline-flex items-center rounded-control px-2 py-1 text-xs font-medium', statusColors[fahrzeug.fmsStatus] ?? 'bg-surface-raised text-text-primary')}>
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
      <div className={cn('rounded-panel border border-border-subtle bg-surface-panel', containerClasses, className)}>
        <FahrzeugStatusListeSkeleton />
      </div>
    );
  }

  // Error State
  if (error) {
    return <DashboardErrorCard title="Fahrzeuge" onRetry={() => refetch()} className={className} />;
  }

  const fahrzeugCount = fahrzeuge?.length ?? 0;

  // Compact: Badge-Liste statt Karten (platzsparend für Tablets)
  if (mode === 'compact') {
    return (
      <div className={cn('rounded-panel border border-border-subtle bg-surface-panel', containerClasses, className)}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-text-secondary">Fahrzeuge</span>
          <span className="text-xs text-text-muted">{fahrzeugCount}</span>
        </div>
        {fahrzeuge && fahrzeuge.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {fahrzeuge.map((fz) => (
              <FahrzeugBadge key={fz.id} fahrzeug={fz} />
            ))}
          </div>
        ) : (
          <p className="text-center text-xs text-text-muted">Keine Fahrzeuge</p>
        )}
      </div>
    );
  }

  // Standard & Fullscreen: Vollständige Karten
  return (
    <div className={cn('rounded-panel border border-border-subtle bg-surface-panel shadow-panel', containerClasses, className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiTruck className={cn('text-text-muted', mode === 'fullscreen' ? 'h-6 w-6' : 'h-5 w-5')} />
          <h3 className={cn('font-semibold text-text-primary', mode === 'fullscreen' ? 'text-xl lg:text-2xl' : 'text-base')}>Fahrzeuge</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('text-text-muted', mode === 'fullscreen' ? 'text-base' : 'text-sm')}>{fahrzeugCount} im Einsatz</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-control p-1 text-text-muted hover:bg-action-secondary hover:text-text-secondary focus:outline-none focus-visible:shadow-focus-ring"
            title="Aktualisieren"
            aria-label="Aktualisieren"
          >
            <PiArrowClockwise className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Last Updated */}
      {dataUpdatedAt && <p className={cn('mb-3 text-text-muted', mode === 'fullscreen' ? 'text-sm' : 'text-xs')}>Aktualisiert: {formatTime(dataUpdatedAt)}</p>}

      {/* Liste oder Empty State */}
      {fahrzeuge && fahrzeuge.length > 0 ? (
        <div className={mode === 'fullscreen' ? 'space-y-4' : 'space-y-3'}>
          {fahrzeuge.map((fahrzeug) => (
            <FahrzeugCard key={fahrzeug.id} fahrzeug={fahrzeug} onClick={onFahrzeugClick ? () => onFahrzeugClick(fahrzeug.id) : undefined} />
          ))}
        </div>
      ) : (
        /* Empty State (AC1b) */
        <div className="flex flex-col items-center py-8 text-text-muted">
          <PiTruck className="mb-2 h-12 w-12 opacity-50" />
          <p className="text-sm">Keine Fahrzeuge erfasst</p>
        </div>
      )}
    </div>
  );
}
