/**
 * RollenUebersicht Container für die Anzeige aller Führungsrollen.
 *
 * **Story 6.1c - Rollen-Übersicht:**
 * Dashboard-Widget das alle besetzten Führungsrollen zeigt.
 *
 * **Story 6.2 - Fullscreen & Compact Modus:**
 * - Liest DashboardMode via Context für Mode-spezifische Styles
 * - refetchInterval nur in Fullscreen aktiv (AC3)
 * - Compact: Inline-Liste statt Grid (platzsparend für Tablets)
 * - Grid-Klassen sind DYNAMISCH basierend auf Mode (nicht mehr hardcoded)
 */

import type { RollenBesetzungListItemDto } from '@/shared';
import { PiArrowClockwise, PiPlus, PiUsers } from 'react-icons/pi';

import { cn } from '@/shared/ui/cn';

import { useRollenBesetzungen } from '../../api';
import { type DashboardMode, useDashboardMode } from '../../contexts';
import { DashboardErrorCard } from '@/features/kraefte/ui';
import { RollenKarte, RollenKarteSkeleton } from '@/features/kraefte';

interface RollenUebersichtProps {
  /** Einsatz ID */
  einsatzId: string;
  /** Click Handler für Rolle freigeben - erhält das vollständige Besetzungs-Objekt */
  onFreigebeClick?: (besetzung: RollenBesetzungListItemDto) => void;
  /** Click Handler für neue Rolle besetzen (Story TD2.5 - AC2) */
  onBesetzeClick?: () => void;
  /** Zusätzliche CSS Klassen */
  className?: string;
  // KEIN mode Prop - wird via useDashboardMode() Context gelesen
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
 * Story 6.2 - Dynamische Grid-Klassen nach Modus.
 *
 * Grid-Klassen waren vorher hardcoded (`grid gap-3 sm:grid-cols-2 lg:grid-cols-3`).
 * Jetzt sind sie Mode-abhängig für bessere Lesbarkeit im Fullscreen.
 */
const getGridClasses = (mode: DashboardMode) =>
  ({
    standard: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3',
    fullscreen: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    compact: 'space-y-1', // Nicht Grid, sondern vertikale Liste im Compact-Modus
  })[mode];

/**
 * Skeleton für RollenUebersicht mit Mode-aware Grid.
 */
function RollenUebersichtSkeleton() {
  const mode = useDashboardMode();
  const gridClasses = getGridClasses(mode);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className={gridClasses}>
        {[1, 2, 3].map((i) => (
          <RollenKarteSkeleton key={i} />
        ))}
      </div>
    </>
  );
}

/**
 * RollenUebersicht zeigt alle besetzten Führungsrollen.
 *
 * Story 6.2: Liest Mode via Context für Mode-spezifische Layouts.
 * Grid-Klassen sind dynamisch basierend auf Mode.
 */
export function RollenUebersicht({ einsatzId, onFreigebeClick, onBesetzeClick, className }: RollenUebersichtProps) {
  // Mode via Context (kein Prop-Drilling)
  const mode = useDashboardMode();
  const containerClasses = getContainerClasses(mode);
  const gridClasses = getGridClasses(mode);

  // AC3: refetchInterval nur in Fullscreen
  const {
    data: besetzungen,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
  } = useRollenBesetzungen(einsatzId, {
    refetchInterval: mode === 'fullscreen' ? 30000 : false,
  });

  // Loading State
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border bg-white dark:bg-gray-800', containerClasses, className)}>
        <RollenUebersichtSkeleton />
      </div>
    );
  }

  // Error State
  if (error) {
    return <DashboardErrorCard title="Rollen" onRetry={() => refetch()} className={className} />;
  }

  const besetzteCount = besetzungen?.length ?? 0;

  // Compact: Inline-Liste statt Grid (platzsparend für Tablets)
  if (mode === 'compact') {
    return (
      <div className={cn('rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800', containerClasses, className)}>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-600 text-sm dark:text-gray-400">Rollen</span>
            <span className="text-gray-500 text-xs">{besetzteCount} besetzt</span>
          </div>
          {/* Story TD2.5 AC3: "Rolle besetzen" Button für Compact Mode mit min-touch-target */}
          {onBesetzeClick && (
            <button
              type="button"
              onClick={onBesetzeClick}
              className={cn(
                'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-blue-600 text-white transition-colors',
                'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                'dark:bg-blue-500 dark:hover:bg-blue-600',
              )}
              aria-label="Neue Rolle besetzen"
            >
              <PiPlus className="h-5 w-5" />
              <span className="sr-only">Rolle besetzen</span>
            </button>
          )}
        </div>
        {besetzungen && besetzungen.length > 0 ? (
          <div className="space-y-1">
            {besetzungen.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 dark:bg-gray-700">
                <span className="font-medium text-gray-700 text-xs dark:text-gray-300">{b.rollenName}</span>
                <span className="text-gray-600 text-xs dark:text-gray-400">{b.personName}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 text-xs">Keine Rollen besetzt</p>
        )}
      </div>
    );
  }

  // Standard & Fullscreen: Vollständige Karten im Grid
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800', containerClasses, className)}>
      {/* Header (AC5, AC7) */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiUsers className={cn('text-gray-500', mode === 'fullscreen' ? 'h-6 w-6' : 'h-5 w-5')} />
          <h3 className={cn('font-semibold text-gray-900 dark:text-gray-100', mode === 'fullscreen' ? 'text-xl lg:text-2xl' : 'text-base')}>Führungsrollen</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('text-gray-500', mode === 'fullscreen' ? 'text-base' : 'text-sm')}>{besetzteCount} besetzt</span>
          {/* Story TD2.5 AC2+AC3: "Rolle besetzen" Button mit mode-aware min-height */}
          {onBesetzeClick && (
            <button
              type="button"
              onClick={onBesetzeClick}
              className={cn(
                'flex items-center gap-2 rounded-lg bg-blue-600 font-medium text-white transition-colors',
                'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                'dark:bg-blue-500 dark:hover:bg-blue-600',
                // AC3: Mode-aware min-height für Touch-Targets
                mode === 'fullscreen' ? 'min-h-[56px] px-4 py-3 text-base' : 'px-3 py-1.5 text-sm',
              )}
              aria-label="Neue Rolle besetzen"
            >
              <PiPlus className={mode === 'fullscreen' ? 'h-5 w-5' : 'h-4 w-4'} />
              <span>Rolle besetzen</span>
            </button>
          )}
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
      {dataUpdatedAt && <p className={cn('mb-3 text-gray-400', mode === 'fullscreen' ? 'text-sm' : 'text-xs')}>Aktualisiert: {formatTime(dataUpdatedAt)}</p>}

      {/* Grid oder Empty State */}
      {besetzungen && besetzungen.length > 0 ? (
        <div className={gridClasses}>
          {besetzungen.map((besetzung) => (
            <RollenKarte key={besetzung.id} besetzung={besetzung} onFreigeben={onFreigebeClick ? () => onFreigebeClick(besetzung) : undefined} />
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
