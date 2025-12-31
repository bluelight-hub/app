/**
 * KraefteDashboard - Zentrales Dashboard für alle Kräfte-Widgets.
 *
 * **Story 6.1d - Dashboard Container & Layout:**
 * Integriert StaerkeCard, FahrzeugStatusListe und RollenUebersicht
 * in einem responsiven Grid-Layout.
 *
 * **Story 6.2 - Fullscreen & Compact Modus:**
 * - AC1: Fullscreen-Modus für Beamer (3m lesbar)
 * - AC2: Compact-Modus für Tablet
 * - AC3: Auto-Refresh alle 30s nur in Fullscreen
 * - AC4: ESC-Handler für Fullscreen-Exit
 * - AC5: Mode-Persistenz via localStorage
 *
 * **ACs erfüllt:**
 * - AC1: Grid-Layout mit Stärke (oben links), Fahrzeuge (oben rechts), Rollen (unten)
 * - AC2: Alle 3 Queries werden parallel geladen
 * - AC3: Responsive (Mobile: vertikal, Tablet+: Grid)
 * - AC4: Widgets zeigen ihre eigenen Loading States
 * - AC5: Partial Error States - einzelne Widgets zeigen Fehler unabhängig
 * - AC7: Header mit Titel, Refresh-Button und Aktualisiert-Zeitstempel
 */

import { useCallback, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { cn } from '@/shared/ui/cn';
import { PiChartBar, PiArrowClockwise, PiArrowsOut, PiDevices } from 'react-icons/pi';
import { FullscreenCloseButton } from '@/features/lagekarte/ui/organisms/FullscreenCloseButton';
import { useTaktischeStaerke } from '../../api';
import { DashboardModeProvider, type DashboardMode } from '../../contexts';
import { StaerkeCard } from '../molecules';
import { DashboardErrorCard } from '../molecules/DashboardErrorCard';
import { FahrzeugStatusListe, RollenUebersicht } from '../organisms';

interface KraefteDashboardProps {
  einsatzId: string;
  className?: string;
  /** Dashboard-Modus (Story 6.2) */
  mode?: DashboardMode;
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
  mode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
}

/**
 * DashboardHeader mit Mode-Selector (AC5).
 *
 * Story 6.2: Header passt sich dem Mode an.
 * Fullscreen hat größere Schrift und sticky Positionierung.
 */
function DashboardHeader({ onRefresh, lastUpdated, isRefreshing, mode, onModeChange }: DashboardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', mode === 'fullscreen' && 'sticky top-0 z-10 -mx-6 -mt-6 bg-white px-6 py-4 shadow-sm dark:bg-gray-800 lg:-mx-8 lg:px-8')}>
      <div className="flex items-center gap-3">
        <PiChartBar className={cn('text-gray-500 dark:text-gray-400', mode === 'fullscreen' ? 'h-8 w-8' : 'h-6 w-6')} />
        <h1 className={cn('font-bold text-gray-900 dark:text-gray-100', mode === 'fullscreen' ? 'text-3xl lg:text-4xl' : 'text-2xl')}>Kräfte-Dashboard</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Timestamp (AC3: Auto-Refresh Indikator) */}
        {lastUpdated > 0 && <span className={cn('text-gray-500 dark:text-gray-400', mode === 'fullscreen' ? 'text-lg' : 'text-sm')}>Aktualisiert: {formatTime(lastUpdated)}</span>}

        {/* Mode Selector (AC5) */}
        <ModeSelector mode={mode} onModeChange={onModeChange} />

        {/* Refresh Button */}
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
            mode === 'fullscreen' && 'p-3',
          )}
          title="Alle Daten aktualisieren"
        >
          <PiArrowClockwise className={mode === 'fullscreen' ? 'h-6 w-6' : 'h-5 w-5'} />
        </button>
      </div>
    </div>
  );
}

interface ModeSelectorProps {
  mode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
}

/**
 * Mode-Selector für Dashboard-Modi (AC5).
 *
 * Ermöglicht Wechsel zwischen Compact, Normal und Fullscreen.
 */
function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
      <button
        type="button"
        onClick={() => onModeChange('compact')}
        className={cn(
          'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          mode === 'compact' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white',
        )}
        title="Kompakt-Modus für Tablets"
      >
        <PiDevices className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onModeChange('standard')}
        className={cn(
          'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          mode === 'standard' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white',
        )}
        title="Standard-Ansicht"
      >
        Normal
      </button>
      <button
        type="button"
        onClick={() => onModeChange('fullscreen')}
        className={cn(
          'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          mode === 'fullscreen' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white',
        )}
        title="Vollbild-Modus für Beamer"
      >
        <PiArrowsOut className="h-4 w-4" />
      </button>
    </div>
  );
}

export function KraefteDashboard({ einsatzId, className, mode = 'standard' }: KraefteDashboardProps) {
  const navigate = useNavigate();

  // NUR StaerkeCard Query hier - FahrzeugStatusListe und RollenUebersicht
  // haben eigene Hooks und lesen refetchInterval via useDashboardMode()
  const staerkeQuery = useTaktischeStaerke(einsatzId, {
    refetchInterval: mode === 'fullscreen' ? 30000 : false,
  });

  // Kombinierte States für Header (Child-Komponenten updaten sich selbst)
  const isAnyFetching = staerkeQuery.isFetching;
  const latestUpdate = staerkeQuery.dataUpdatedAt || 0;

  // Mode Navigation Handler mit localStorage Speicherung (AC5)
  const handleModeChange = useCallback(
    (newMode: DashboardMode) => {
      localStorage.setItem('kraefte-dashboard-mode', newMode);
      navigate({
        search: { mode: newMode },
        replace: true,
      });
    },
    [navigate],
  );

  const handleExitFullscreen = useCallback(() => {
    handleModeChange('standard');
  }, [handleModeChange]);

  // AC4: ESC-Handler für Fullscreen (FullscreenCloseButton hat eigenen Handler)
  // Aber wir brauchen auch einen im Dashboard für Konsistenz
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mode === 'fullscreen') {
        event.preventDefault();
        handleExitFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [mode, handleExitFullscreen]);

  // Layout-Klassen nach Modus
  const gridClasses = {
    standard: 'grid gap-4 md:grid-cols-2 md:gap-6',
    fullscreen: 'grid gap-6 lg:grid-cols-3 xl:gap-8',
    compact: 'grid gap-2 md:grid-cols-2 md:gap-3',
  };

  return (
    <DashboardModeProvider value={mode}>
      <div className={cn('space-y-6', mode === 'fullscreen' && 'p-6 lg:p-8', className)}>
        {/* AC4: Exit-Button in FullScreen */}
        {mode === 'fullscreen' && <FullscreenCloseButton onClose={handleExitFullscreen} />}

        {/* Header mit Mode-Selector (AC5) */}
        <DashboardHeader onRefresh={() => staerkeQuery.refetch()} lastUpdated={latestUpdate} isRefreshing={isAnyFetching} mode={mode} onModeChange={handleModeChange} />

        {/* Grid Layout nach Modus */}
        <div className={gridClasses[mode]}>
          {/* Stärke-Card - KORREKT: Data-Props, nicht einsatzId */}
          <div className={mode === 'fullscreen' ? 'lg:col-span-1' : 'md:col-span-1'}>
            {staerkeQuery.isError ? (
              <DashboardErrorCard title="Stärke" onRetry={() => staerkeQuery.refetch()} compact={mode === 'compact'} />
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

          {/* Fahrzeug-Liste - Hat eigenen Hook, liest Mode via Context */}
          <div className={mode === 'fullscreen' ? 'lg:col-span-1' : 'md:col-span-1'}>
            <FahrzeugStatusListe einsatzId={einsatzId} className="h-full" />
          </div>

          {/* Rollen-Übersicht - Hat eigenen Hook, liest Mode via Context */}
          <div className={cn(mode === 'fullscreen' ? 'lg:col-span-1' : 'md:col-span-2')}>
            <RollenUebersicht einsatzId={einsatzId} />
          </div>
        </div>
      </div>
    </DashboardModeProvider>
  );
}
