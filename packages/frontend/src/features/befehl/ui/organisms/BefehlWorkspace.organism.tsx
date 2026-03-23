import { cn } from '@/shared/ui/cn';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Tooltip } from '@/shared/ui/atoms/tooltip.atom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { PiArrowClockwise, PiCaretDown, PiCaretUp, PiExport, PiFunnel, PiPlus, PiUser } from 'react-icons/pi';
import { useCurrentUser } from '@/features/auth/api';
import { extractBefehlsgeberNames, extractEmpfaengerNames } from '../../lib/extract-filter-options';
import { useHandlungsbedarf } from '../../hooks/use-handlungsbedarf';
import { useDelayedLoading } from '../../hooks/use-delayed-loading';
import { useCurrentBefehleView } from '../../hooks/use-befehle-view-store';
import {
  useBefehleByEinsatz,
  useBefehleFilter,
  useBefehlPermissions,
  useBefehlWebSocketStatus,
  useActiveFilterCount,
  useHasActiveFilters,
  useMeineBefehleFilter,
  useMeineBefehle,
  toQueryFilters,
  resetBefehleFilter,
  setBefehlsgeberName,
  setBis,
  setEmpfaengerName,
  setSearchText,
  setStatusFilter,
  setVon,
} from '../../';
import { BefehlWorkspaceSkeleton } from './BefehlWorkspaceSkeleton.organism';
import { BefehlDetailPanel } from './BefehlDetailPanel.organism';
import { BefehlExportDialog } from './BefehlExportDialog.organism';
import { BefehlQuittierenDialog } from './BefehlQuittierenDialog.organism';
import { HandlungsbedarfSection } from './HandlungsbedarfSection.organism';
import { BefehlTabellenView } from './BefehlTabellenView.organism';
import { BefehlKanbanView } from './BefehlKanbanView.organism';
import { BefehlFilterRow } from '../molecules/BefehlFilterRow.molecule';
import { BefehlEingabeRow } from '../molecules/BefehlEingabeRow.molecule';
import { BefehlCompactCard } from '../molecules/BefehlCompactCard.molecule';
import { BefehleViewToggle } from '../molecules/BefehleViewToggle.molecule';
import { ConnectionStatusBanner } from '../atoms/ConnectionStatusBanner.atom';

interface BefehlWorkspaceProps {
  einsatzId: string;
  /** Aktuell ausgewählter Befehl (aus Route-Search-Param) */
  selectedBefehlId?: string;
  /** Callback wenn ein Befehl ausgewählt wird */
  onSelectBefehl: (id: string) => void;
  /** Callback wenn das Detail-Panel geschlossen wird */
  onClosePanel: () => void;
}

/**
 * Befehl-Workspace — Feature-Composite für den Befehlsarbeitsraum
 *
 * Orchestriert alle Befehl-Subkomponenten mit:
 * - Semantischer Skeleton-Ladezustand (300ms-Gate)
 * - Inline-Fehlerzustand mit Retry
 * - Leerzustand mit kontextueller Folgeaktion
 * - Offline-/Degraded-Banner
 * - WCAG 2.1 AA Accessibility (aria-live, Focus-Management, Keyboard-Navigation)
 */
export function BefehlWorkspace({ einsatzId, selectedBefehlId, onSelectBefehl, onClosePanel }: BefehlWorkspaceProps) {
  const isConnected = useBefehlWebSocketStatus();
  const { user: currentUser } = useCurrentUser();
  const { canCreate, canExport, canQuittieren, canKorrigieren, canManageStatus, canViewAll, isBeobachter, rolle, isLoading: isPermissionsLoading } = useBefehlPermissions(einsatzId);
  const [showMeineBefehle, toggleMeineBefehle] = useMeineBefehleFilter();
  const currentView = useCurrentBefehleView();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [showEingabeRow, setShowEingabeRow] = useState(false);
  const [quittierungBefehlId, setQuittierungBefehlId] = useState<string | null>(null);
  /** aria-live Statusmeldung */
  const [statusMessage, setStatusMessage] = useState('');

  /** Ref für Focus-Management: erster Befehl in Liste */
  const befehlListRef = useRef<HTMLDivElement>(null);
  /** Timer-Refs für Cleanup */
  const timerIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Verhindert wiederholten Auto-Focus nach Initial-Load */
  const hasInitialFocusRef = useRef(false);

  /** rAF-Ref fuer Panel-Close Focus-Restauration */
  const panelCloseRafRef = useRef<number>();

  // Cleanup Timer + Panel-Close rAF bei Unmount
  useEffect(() => {
    return () => {
      timerIdsRef.current.forEach(clearTimeout);
      if (panelCloseRafRef.current != null) {
        cancelAnimationFrame(panelCloseRafRef.current);
      }
    };
  }, []);

  // Story 4.2: EMPFAENGER sieht standardmaessig "Meine Befehle"
  const hasSetRolleDefaultRef = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Ref-Guard verhindert Re-Execution, showMeineBefehle wuerde Loop verursachen
  useEffect(() => {
    if (hasSetRolleDefaultRef.current || isPermissionsLoading || rolle === null) return;
    if (rolle === 'EMPFAENGER' && !showMeineBefehle) {
      toggleMeineBefehle();
    }
    hasSetRolleDefaultRef.current = true;
  }, [rolle, isPermissionsLoading, toggleMeineBefehle]);

  // Hotkey: Ctrl+N für neuen Befehl
  useHotkeys('mod+n', () => setShowEingabeRow(true), { preventDefault: true, enabled: canCreate && !showEingabeRow });

  // Filter-State aus Store
  const filterState = useBefehleFilter();
  const activeFilterCount = useActiveFilterCount();
  const hasFilters = useHasActiveFilters();

  // Server-seitige Query mit Filtern
  const queryFilters = useMemo(() => toQueryFilters(filterState), [filterState]);
  const { data: befehle, isLoading, isError, error, refetch, isRefetching } = useBefehleByEinsatz(einsatzId, hasFilters ? queryFilters : undefined);

  // Ungefilterte Liste wird immer geladen: für Filter-Dropdown-Optionen,
  // Handlungsbedarf-Berechnung, selectedBefehl-Lookup und unquittiertCount —
  // unabhängig vom aktiven Filter. TanStack Query dedupliziert bei identischem Key.
  const { data: allBefehle, isLoading: isAllLoading } = useBefehleByEinsatz(einsatzId);
  const empfaengerOptions = useMemo(() => extractEmpfaengerNames(allBefehle ?? []), [allBefehle]);
  const befehlsgeberOptions = useMemo(() => extractBefehlsgeberNames(allBefehle ?? []), [allBefehle]);

  // "Meine Befehle" Query (nur wenn Filter aktiv)
  const meineBefehleQuery = useMeineBefehle(einsatzId, showMeineBefehle ? currentUser?.id : undefined);

  // Unquittierte Befehle
  const unquittiertCount = useMemo(() => {
    if (!allBefehle || !currentUser?.id) return 0;
    return allBefehle.filter((b) => b.empfaenger.some((e) => e.empfaengerId === currentUser.id && !e.quittiertAm)).length;
  }, [allBefehle, currentUser?.id]);

  // Aktive Datenquelle
  const aktiveBefehle = showMeineBefehle ? meineBefehleQuery.data : befehle;

  // Handlungsbedarf
  const handlungsbedarf = useHandlungsbedarf(allBefehle, currentUser?.id);

  const selectedBefehl = allBefehle?.find((b) => b.id === selectedBefehlId) ?? null;

  // 300ms-Gate für Skeleton (primaere Query genuegt)
  const showSkeleton = useDelayedLoading(isLoading);

  // Befehl für Quittierungs-Dialog (M2: extrahiert aus IIFE im JSX)
  const quittierungBefehl = quittierungBefehlId ? (allBefehle?.find((b) => b.id === quittierungBefehlId) ?? null) : null;

  /** Retry-Handler für Fehler */
  const handleRetry = useCallback(async () => {
    setStatusMessage('Befehle werden erneut geladen…');
    try {
      await refetch();
      setStatusMessage('Befehle erfolgreich geladen');
      timerIdsRef.current.push(setTimeout(() => setStatusMessage(''), 3000));
    } catch {
      setStatusMessage('Laden fehlgeschlagen – bitte erneut versuchen');
    }
  }, [refetch]);

  /** Focus auf ersten Befehl nur beim Initial-Load (nicht bei Background-Refetch) */
  useEffect(() => {
    if (hasInitialFocusRef.current) return;
    if (!isLoading && !isAllLoading && aktiveBefehle && aktiveBefehle.length > 0 && befehlListRef.current) {
      const firstFocusable = befehlListRef.current.querySelector<HTMLElement>('[tabindex="0"], button, a, [role="row"]');
      if (firstFocusable && !selectedBefehlId) {
        hasInitialFocusRef.current = true;
        let cancelled = false;
        const rafId = requestAnimationFrame(() => {
          if (cancelled) return;
          firstFocusable.focus({ preventScroll: true });
        });
        return () => {
          cancelled = true;
          cancelAnimationFrame(rafId);
        };
      }
    }
  }, [isLoading, isAllLoading, aktiveBefehle, selectedBefehlId]);

  /** Story 4.3 AC1: ScrollIntoView fuer selektierten Befehl (Cross-Context Recall) */
  useEffect(() => {
    if (!selectedBefehlId || isLoading || isAllLoading) return;
    let cancelled = false;
    const rafId = requestAnimationFrame(() => {
      if (cancelled) return;
      const row = document.getElementById(`befehl-row-${selectedBefehlId}`);
      row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [selectedBefehlId, isLoading, isAllLoading]);

  /** Story 4.3 AC3: Befehl nicht gefunden (Deep-Link zu geloeschtem/unzugaenglichem Befehl) */
  const isBefehlNotFound = !!selectedBefehlId && !isLoading && !isAllLoading && !!allBefehle && !selectedBefehl;

  /** Focus-Restauration nach Panel-Schliessung */
  const handlePanelClose = useCallback(() => {
    onClosePanel();
    if (panelCloseRafRef.current != null) {
      cancelAnimationFrame(panelCloseRafRef.current);
    }
    panelCloseRafRef.current = requestAnimationFrame(() => {
      if (selectedBefehlId) {
        const row = document.getElementById(`befehl-row-${selectedBefehlId}`);
        if (row) {
          row.focus();
          return;
        }
      }
      befehlListRef.current?.querySelector<HTMLElement>('[tabindex="0"], button, a')?.focus();
    });
  }, [onClosePanel, selectedBefehlId]);

  // --- Lade-Zustand (300ms-Gate, primaere Query) ---
  if (isLoading) {
    if (showSkeleton) {
      return <BefehlWorkspaceSkeleton />;
    }
    return null;
  }

  // --- Fehler-Zustand (Inline, kein Modal/Toast) ---
  if (isError && !befehle) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8" role="alert">
        <div className="max-w-md text-center">
          <p className="font-medium text-gray-900 text-lg dark:text-gray-100">Befehle konnten nicht geladen werden</p>
          <p className="mt-2 text-gray-500 text-sm dark:text-gray-400">{error?.message ?? 'Verbindungsfehler — bitte überprüfe die Netzwerkverbindung.'}</p>
          <Button intent="primary" size="sm" className="mt-4" onClick={handleRetry} autoFocus>
            <PiArrowClockwise className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section className="flex h-full flex-col" aria-label="Befehlsarbeitsraum">
      {/* aria-live Region für Status-Updates */}
      <div aria-live="polite" className="sr-only">
        {statusMessage}
      </div>

      {/* Offline-/Degraded-Banner */}
      <ConnectionStatusBanner isConnected={isConnected} />

      {/* Inline-Fehler bei Filter-Queries (Daten teilweise vorhanden) */}
      {isError && befehle && (
        <div className="flex items-center justify-between bg-red-50 px-4 py-2 text-red-600 text-sm dark:bg-red-900/20 dark:text-red-400" role="status">
          <span>Filter konnten nicht angewendet werden.</span>
          <button
            type="button"
            onClick={handleRetry}
            className="ml-3 rounded-md px-2 py-1 font-medium text-red-700 underline hover:no-underline focus:outline-none focus-visible:shadow-focus-ring dark:text-red-300"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-gray-200 border-b px-4 py-2 dark:border-gray-700" role="toolbar" aria-label="Befehl-Aktionen">
        <div className="flex items-center gap-2">
          {/* Neuer Befehl Button */}
          {isPermissionsLoading ? (
            <Button intent="primary" size="sm" disabled aria-label="Berechtigungen werden geladen">
              <PiPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Laden…</span>
            </Button>
          ) : !canCreate ? (
            <Tooltip content="Nur Ersteller/Befehlsgeber dürfen Befehle erstellen">
              <Button intent="primary" size="sm" disabled aria-disabled="true">
                <PiPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Neuer Befehl</span>
              </Button>
            </Tooltip>
          ) : (
            <Button intent="primary" size="sm" kbd="ctrl+n" onClick={() => setShowEingabeRow(true)} disabled={showEingabeRow}>
              <PiPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Neuer Befehl</span>
            </Button>
          )}

          {/* Meine Befehle Toggle */}
          <Button intent={showMeineBefehle ? 'primary' : 'secondary'} appearance={showMeineBefehle ? 'filled' : 'outline'} size="sm" onClick={toggleMeineBefehle} aria-pressed={showMeineBefehle}>
            <PiUser className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Meine Befehle</span>
            {unquittiertCount > 0 && (
              <span
                className={cn(
                  'ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-bold text-xs',
                  showMeineBefehle ? 'bg-white/20 text-white' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
                )}
              >
                {unquittiertCount}
              </span>
            )}
          </Button>

          {/* Filter Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen((prev) => !prev)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-medium text-sm transition-colors focus:outline-none focus-visible:shadow-focus-ring',
              hasFilters
                ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-900/20 dark:text-primary-300'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800',
            )}
            aria-expanded={isMobileFilterOpen}
            aria-controls="befehl-filter-panel"
          >
            <PiFunnel className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Filter</span>
            {hasFilters && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 font-bold text-white text-xs">{activeFilterCount}</span>}
            {isMobileFilterOpen ? <PiCaretUp className="h-3 w-3" aria-hidden="true" /> : <PiCaretDown className="h-3 w-3" aria-hidden="true" />}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Ansicht-Toggle (Tabelle/Kanban/Liste) */}
          <BefehleViewToggle className="hidden md:inline-flex" />

          {/* Ergebnis-Count */}
          <span className="text-gray-500 text-sm dark:text-gray-400">{aktiveBefehle ? `${aktiveBefehle.length} Befehle` : ''}</span>

          {/* Aktualisieren */}
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRefetching}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-gray-600 text-sm hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:shadow-focus-ring dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200',
              isRefetching && 'cursor-not-allowed opacity-50',
            )}
            aria-label="Befehle aktualisieren"
          >
            <PiArrowClockwise className={cn('h-4 w-4', isRefetching && 'animate-spin')} aria-hidden="true" />
          </button>

          {/* Export-Button */}
          {isPermissionsLoading ? (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-gray-400 text-sm dark:text-gray-600"
              aria-label="Berechtigungen werden geladen"
            >
              <PiExport className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Export</span>
            </button>
          ) : canExport ? (
            <button
              type="button"
              onClick={() => setIsExportDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-gray-600 text-sm hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:shadow-focus-ring dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              aria-label="Befehle exportieren"
            >
              <PiExport className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Export</span>
            </button>
          ) : (
            <Tooltip content="Nur Ersteller/Befehlsgeber dürfen Befehle exportieren">
              <button
                type="button"
                disabled
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-gray-400 text-sm dark:text-gray-600"
                aria-label="Befehle exportieren (keine Berechtigung)"
                aria-disabled="true"
              >
                <PiExport className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Filter-Panel (Dropdown) */}
      {isMobileFilterOpen && (
        <div id="befehl-filter-panel" className="border-gray-200 border-b dark:border-gray-700">
          <BefehlFilterRow
            statusFilter={filterState.statusFilter}
            onStatusFilterChange={setStatusFilter}
            searchText={filterState.searchText}
            onSearchTextChange={setSearchText}
            empfaengerName={filterState.empfaengerName}
            onEmpfaengerNameChange={setEmpfaengerName}
            empfaengerOptions={empfaengerOptions}
            befehlsgeberName={filterState.befehlsgeberName}
            onBefehlsgeberNameChange={setBefehlsgeberName}
            befehlsgeberOptions={befehlsgeberOptions}
            von={filterState.von}
            onVonChange={setVon}
            bis={filterState.bis}
            onBisChange={setBis}
            onReset={resetBefehleFilter}
            activeFilterCount={activeFilterCount}
            className="px-4 py-3"
          />
        </div>
      )}

      {/* Befehl-Eingabezeile */}
      {showEingabeRow && (
        <div className="border-gray-200 border-b px-4 py-4 dark:border-gray-700">
          <BefehlEingabeRow einsatzId={einsatzId} onClose={() => setShowEingabeRow(false)} />
        </div>
      )}

      {/* Scrollbarer Content-Bereich */}
      <div className="flex-1 overflow-y-auto" ref={befehlListRef} aria-busy={isRefetching}>
        {/* Zone A: Handlungsbedarf */}
        {!showMeineBefehle && <HandlungsbedarfSection handlungsbedarf={handlungsbedarf} onBefehlSelect={onSelectBefehl} onQuittieren={setQuittierungBefehlId} />}

        {/* Leerzustand */}
        {!hasFilters && aktiveBefehle?.length === 0 && !isError && (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center" role="status">
            <p className="font-medium text-gray-700 dark:text-gray-300">Keine offenen Befehle</p>
            <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">
              {canCreate ? (
                <>
                  Erstelle den ersten Befehl mit <kbd className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:border-gray-600 dark:bg-gray-800">Ctrl+N</kbd>.
                </>
              ) : (
                'Noch keine Befehle im aktiven Einsatz erteilt.'
              )}
            </p>
            {canCreate && (
              <Button intent="primary" size="sm" className="mt-4" onClick={() => setShowEingabeRow(true)}>
                <PiPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Neuer Befehl
              </Button>
            )}
          </div>
        )}

        {/* Filter-Leerzustand */}
        {hasFilters && aktiveBefehle?.length === 0 && !isError && (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-500 dark:text-gray-400">Keine Befehle gefunden — Filter anpassen</p>
            <button
              type="button"
              onClick={resetBefehleFilter}
              className="mt-2 text-primary-600 text-sm hover:text-primary-700 focus:outline-none focus-visible:shadow-focus-ring dark:text-primary-400 dark:hover:text-primary-300"
            >
              Filter zurücksetzen
            </button>
          </div>
        )}

        {/* Zone B: Befehle (Tabelle / Kanban / Liste — gesteuert durch ViewStore) */}
        {(aktiveBefehle?.length ?? 0) > 0 && (
          <>
            {/* Desktop: View abhängig vom Store-Toggle */}
            {currentView === 'kanban' ? (
              <BefehlKanbanView
                einsatzId={einsatzId}
                befehle={aktiveBefehle}
                className="hidden md:flex"
                onBefehlSelect={onSelectBefehl}
                onQuittieren={setQuittierungBefehlId}
                currentUserId={currentUser?.id}
                canQuittieren={canQuittieren}
              />
            ) : (
              <BefehlTabellenView einsatzId={einsatzId} befehle={aktiveBefehle} className="hidden md:block" onBefehlSelect={onSelectBefehl} selectedBefehlId={selectedBefehlId} />
            )}

            {/* Mobile: Compact Card Liste (immer, unabhängig vom View-Toggle) */}
            <ul className="flex flex-col gap-2 p-3 md:hidden" aria-label="Befehlsliste">
              {aktiveBefehle?.map((befehl) => (
                <li key={befehl.id} className="list-none">
                  <BefehlCompactCard befehl={befehl} onClick={() => onSelectBefehl(befehl.id)} selected={selectedBefehlId === befehl.id} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Story 4.3 AC3: Befehl nicht gefunden — Inline-Fehler (kein Modal/Overlay) */}
      {isBefehlNotFound && (
        <div className="border-red-200 border-t bg-red-50 px-6 py-8 text-center dark:border-red-800 dark:bg-red-900/20" role="alert" aria-live="assertive">
          <p className="font-medium text-gray-900 text-lg dark:text-gray-100">Dieser Befehl ist nicht mehr verfügbar</p>
          <p className="mt-2 text-gray-500 text-sm dark:text-gray-400">Der Befehl wurde möglicherweise gelöscht oder Sie haben keine Berechtigung.</p>
          <button
            type="button"
            onClick={onClosePanel}
            className="mt-4 rounded-md bg-primary-600 px-4 py-2 font-medium text-sm text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            Zurück zur Befehlsübersicht
          </button>
        </div>
      )}

      {/* Detail Slide-Over Panel (Inspector-Panel Story 4.3) */}
      <BefehlDetailPanel
        befehl={selectedBefehl}
        isOpen={!!selectedBefehlId && !!selectedBefehl}
        onClose={handlePanelClose}
        einsatzId={einsatzId}
        onQuittieren={setQuittierungBefehlId}
        currentUserId={currentUser?.id}
        canQuittieren={canQuittieren}
        canKorrigieren={canKorrigieren}
        canManageStatus={canManageStatus}
        isBeobachter={isBeobachter}
        canViewAll={canViewAll}
      />

      {/* Export Dialog */}
      <BefehlExportDialog isOpen={isExportDialogOpen} onClose={() => setIsExportDialogOpen(false)} einsatzId={einsatzId} />

      {/* Quittierungs-Dialog */}
      {quittierungBefehlId && currentUser?.id && quittierungBefehl && (
        <BefehlQuittierenDialog
          isOpen={!!quittierungBefehlId}
          onClose={() => setQuittierungBefehlId(null)}
          befehlId={quittierungBefehl.id}
          befehlNummer={quittierungBefehl.nummer}
          empfaengerId={currentUser.id}
          einsatzId={einsatzId}
          bereitsQuittiert={!!quittierungBefehl.empfaenger.find((e) => e.empfaengerId === currentUser.id)?.quittiertAm}
        />
      )}
    </section>
  );
}
