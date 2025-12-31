/**
 * KraefteDashboard - Zentrales Dashboard für alle Kräfte-Widgets.
 *
 * **Story 6.1d - Dashboard Container & Layout:**
 * Integriert StaerkeCard, FahrzeugStatusListe und RollenUebersicht
 * in einem responsiven Grid-Layout.
 *
 * **ACs erfüllt:**
 * - AC1: Grid-Layout mit Stärke (oben links), Fahrzeuge (oben rechts), Rollen (unten)
 * - AC2: Alle 3 Queries werden parallel geladen
 * - AC3: Responsive (Mobile: vertikal, Tablet+: Grid)
 * - AC4: Widgets zeigen ihre eigenen Loading States
 * - AC5: Partial Error States - einzelne Widgets zeigen Fehler unabhängig
 * - AC7: Header mit Titel, Refresh-Button und Aktualisiert-Zeitstempel
 */

import { cn } from '@/shared/ui/cn';
import { PiChartBar, PiArrowClockwise, PiWarningCircle } from 'react-icons/pi';
import { useTaktischeStaerke, useEinsatzFahrzeuge, useRollenBesetzungen } from '../../api';
import { StaerkeCard } from '../molecules';
import { FahrzeugStatusListe, RollenUebersicht } from '../organisms';

interface KraefteDashboardProps {
  einsatzId: string;
  className?: string;
}

/**
 * Formatiert einen Timestamp als HH:MM
 */
function formatTime(timestamp: number): string {
  if (!timestamp || timestamp === 0) return '';
  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface DashboardHeaderProps {
  onRefresh: () => void;
  lastUpdated: number;
  isRefreshing: boolean;
}

function DashboardHeader({ onRefresh, lastUpdated, isRefreshing }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <PiChartBar className="h-6 w-6 text-gray-500 dark:text-gray-400" />
        <h1 className="font-bold text-2xl text-gray-900 dark:text-gray-100">Kräfte-Dashboard</h1>
      </div>

      <div className="flex items-center gap-4">
        {lastUpdated > 0 && <span className="text-gray-500 text-sm dark:text-gray-400">Aktualisiert: {formatTime(lastUpdated)}</span>}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className={cn(
            'rounded-lg p-2 text-gray-500 transition-colors',
            'hover:bg-gray-100 hover:text-gray-700',
            'dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300',
            'disabled:cursor-not-allowed disabled:opacity-50',
            isRefreshing && 'animate-spin',
          )}
          title="Alle Daten aktualisieren"
        >
          <PiArrowClockwise className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export function KraefteDashboard({ einsatzId, className }: KraefteDashboardProps) {
  // Alle drei Queries parallel laden (AC2)
  const staerkeQuery = useTaktischeStaerke(einsatzId);
  const fahrzeugeQuery = useEinsatzFahrzeuge(einsatzId);
  const rollenQuery = useRollenBesetzungen(einsatzId);

  // Kombinierte States (AC4, AC5)
  const isAnyFetching = staerkeQuery.isFetching || fahrzeugeQuery.isFetching || rollenQuery.isFetching;
  const latestUpdate = Math.max(staerkeQuery.dataUpdatedAt || 0, fahrzeugeQuery.dataUpdatedAt || 0, rollenQuery.dataUpdatedAt || 0);

  // Refetch alle Queries (AC5, AC7)
  const refetchAll = () => {
    staerkeQuery.refetch();
    fahrzeugeQuery.refetch();
    rollenQuery.refetch();
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header (AC7) */}
      <DashboardHeader onRefresh={refetchAll} lastUpdated={latestUpdate} isRefreshing={isAnyFetching} />

      {/* Grid Layout (AC1, AC3) - md:768px für bessere Tablet-Unterstützung */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {/* Stärke-Card (oben links) - AC5: eigener Error-State */}
        <div className="md:col-span-1">
          {staerkeQuery.isError ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <PiWarningCircle className="h-8 w-8 text-red-500" />
              <p className="text-center text-red-600 text-sm dark:text-red-400">Stärke konnte nicht geladen werden</p>
              <button
                type="button"
                onClick={() => staerkeQuery.refetch()}
                className="rounded-md bg-red-100 px-3 py-1 text-red-700 text-sm hover:bg-red-200 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700"
              >
                Erneut versuchen
              </button>
            </div>
          ) : (
            <StaerkeCard
              fuehrung={staerkeQuery.data?.fuehrung ?? 0}
              unterfuehrung={staerkeQuery.data?.unterfuehrung ?? 0}
              mannschaft={staerkeQuery.data?.mannschaft ?? 0}
              gesamt={staerkeQuery.data?.gesamt ?? 0}
              isLoading={staerkeQuery.isLoading}
              className="h-full"
            />
          )}
        </div>

        {/* Fahrzeug-Liste (oben rechts) - AC5: eigener Error-State */}
        <div className="md:col-span-1">
          {fahrzeugeQuery.isError ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <PiWarningCircle className="h-8 w-8 text-red-500" />
              <p className="text-center text-red-600 text-sm dark:text-red-400">Fahrzeuge konnten nicht geladen werden</p>
              <button
                type="button"
                onClick={() => fahrzeugeQuery.refetch()}
                className="rounded-md bg-red-100 px-3 py-1 text-red-700 text-sm hover:bg-red-200 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700"
              >
                Erneut versuchen
              </button>
            </div>
          ) : (
            <FahrzeugStatusListe einsatzId={einsatzId} className="h-full" />
          )}
        </div>

        {/* Rollen-Übersicht (unten, volle Breite) - AC5: eigener Error-State */}
        <div className="md:col-span-2">
          {rollenQuery.isError ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <PiWarningCircle className="h-8 w-8 text-red-500" />
              <p className="text-center text-red-600 text-sm dark:text-red-400">Rollen konnten nicht geladen werden</p>
              <button
                type="button"
                onClick={() => rollenQuery.refetch()}
                className="rounded-md bg-red-100 px-3 py-1 text-red-700 text-sm hover:bg-red-200 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700"
              >
                Erneut versuchen
              </button>
            </div>
          ) : (
            <RollenUebersicht einsatzId={einsatzId} />
          )}
        </div>
      </div>
    </div>
  );
}
