import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { PiFunnel, PiCaretDown, PiCaretUp, PiExport, PiChartBar } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { Tooltip } from '@/shared/ui/atoms/tooltip.atom';
import { z } from 'zod';
import {
  BefehlDetailPanel,
  BefehlExportDialog,
  BefehlFilterRow,
  BefehlKanbanView,
  BefehlTabellenView,
  BefehleViewToggle,
  ConnectionStatusBanner,
  KritischeBefehleCounter,
  resetBefehleFilter,
  setBefehlsgeberName,
  setBis,
  setEmpfaengerName,
  setSearchText,
  setStatusFilter,
  setVon,
  useActiveFilterCount,
  useBefehleByEinsatz,
  useBefehleFilter,
  useBefehleView,
  useBefehlNotifications,
  useBefehlPermissions,
  useBefehlWebSocket,
  useHasActiveFilters,
  toQueryFilters,
} from '@/features/befehl';
import { extractBefehlsgeberNames, extractEmpfaengerNames } from '@/features/befehl/lib/extract-filter-options';
import { getBefehlKritikalitaet } from '@/features/befehl/lib/befehl-priority';

const searchSchema = z.object({
  befehlId: z.string().optional(),
});

export const Route = createFileRoute('/app/einsatz/$einsatzId/führung/befehle')({
  validateSearch: (search) => searchSchema.parse(search),
  component: BefehleSeite,
});

/** Seite fuer das Befehlsmanagement innerhalb eines Einsatzes. */
function BefehleSeite() {
  const { einsatzId } = Route.useParams();
  const { befehlId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { onBefehlErstellt, onBefehlQuittiert } = useBefehlNotifications({ einsatzId });
  const { isConnected } = useBefehlWebSocket({ einsatzId, onBefehlErstellt, onBefehlQuittiert });
  const { canExport, canViewMetriken, isLoading: isPermissionsLoading } = useBefehlPermissions(einsatzId);
  const [view] = useBefehleView();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [showOnlyKritisch, setShowOnlyKritisch] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Filter-State aus Store
  const filterState = useBefehleFilter();
  const activeFilterCount = useActiveFilterCount();
  const hasFilters = useHasActiveFilters();

  // Server-seitige Query mit Filtern
  const queryFilters = useMemo(() => toQueryFilters(filterState), [filterState]);
  const { data: befehle, isError } = useBefehleByEinsatz(einsatzId, hasFilters ? queryFilters : undefined);

  // Ungefilterte Befehle fuer Optionslisten (damit Optionen nicht verschwinden beim Filtern)
  const { data: allBefehle } = useBefehleByEinsatz(einsatzId);
  const empfaengerOptions = useMemo(() => extractEmpfaengerNames(allBefehle ?? []), [allBefehle]);
  const befehlsgeberOptions = useMemo(() => extractBefehlsgeberNames(allBefehle ?? []), [allBefehle]);

  /** Client-seitiger Kritikalitaets-Filter (ergaenzt server-seitigen Status-Filter) */
  const angezeigteBefeble = useMemo(() => {
    if (!showOnlyKritisch || !befehle) return befehle;
    return befehle.filter((b) => {
      const k = getBefehlKritikalitaet(b);
      return k === 'KRITISCH' || k === 'WARNUNG';
    });
  }, [befehle, showOnlyKritisch]);

  const selectedBefehl = allBefehle?.find((b) => b.id === befehlId) ?? null;

  const handleBefehlSelect = (id: string) => {
    navigate({ search: { befehlId: id } });
  };

  const handlePanelClose = () => {
    navigate({ search: {} });
  };

  return (
    <div className="flex h-full flex-col">
      <ConnectionStatusBanner isConnected={isConnected} />

      {/* Mobile: Collapsible Filter Toggle (<768px) */}
      <button
        type="button"
        onClick={() => setIsMobileFilterOpen((prev) => !prev)}
        className={cn(
          'flex w-full items-center justify-between border-b px-4 py-2.5 text-sm font-medium md:hidden',
          'border-gray-200 dark:border-gray-700',
          hasFilters ? 'text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400',
        )}
        aria-expanded={isMobileFilterOpen}
        aria-controls="befehl-filter-panel"
      >
        <span className="flex items-center gap-2">
          <PiFunnel className="h-4 w-4" aria-hidden="true" />
          {hasFilters ? `Filter (${activeFilterCount})` : 'Filter anzeigen'}
        </span>
        {isMobileFilterOpen ? <PiCaretUp className="h-4 w-4" aria-hidden="true" /> : <PiCaretDown className="h-4 w-4" aria-hidden="true" />}
      </button>

      {/* Filter-Panel: Desktop immer sichtbar, Mobile collapsible */}
      <div id="befehl-filter-panel" className={cn('md:block', isMobileFilterOpen ? 'block' : 'hidden')}>
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

      {/* Toolbar mit View-Toggle + Kritische-Befehle-Counter + Filter-Ergebnis Count */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <BefehleViewToggle />
          {allBefehle && (
            <KritischeBefehleCounter
              befehle={allBefehle}
              onClick={() => setShowOnlyKritisch((prev) => !prev)}
              className={showOnlyKritisch ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-gray-900' : undefined}
            />
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* aria-live Region fuer Filter-Ergebnis */}
          <span className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
            {angezeigteBefeble ? `${angezeigteBefeble.length} Befehle` : ''}
          </span>
          {/* Metriken-Link: Nur fuer BEFEHLSGEBER sichtbar */}
          {canViewMetriken && (
            <Link
              to="/app/einsaetze/metriken"
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <PiChartBar className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Metriken</span>
            </Link>
          )}
          {/* Export-Button: Nur fuer BEFEHLSGEBER/ERSTELLER aktiv */}
          {canExport ? (
            <button
              type="button"
              onClick={() => setIsExportDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
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
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-400 cursor-not-allowed dark:text-gray-600"
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

      {/* Error-State */}
      {isError && (
        <div className="px-4 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400">
          Filter konnten nicht angewendet werden.{' '}
          <button type="button" onClick={() => window.location.reload()} className="underline hover:no-underline">
            Erneut versuchen
          </button>
        </div>
      )}

      {/* Leerzustand bei gefilterter leerer Ergebnismenge */}
      {hasFilters && angezeigteBefeble?.length === 0 && !isError ? (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-500 dark:text-gray-400">Keine Befehle gefunden — Filter anpassen</p>
          <button type="button" onClick={resetBefehleFilter} className="mt-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
            Filter zurücksetzen
          </button>
        </div>
      ) : (
        <>
          {/* Bedingte Ansicht basierend auf View-Auswahl */}
          {view === 'kanban' ? (
            <BefehlKanbanView einsatzId={einsatzId} befehle={angezeigteBefeble} className="flex-1" />
          ) : (
            <>
              <BefehlTabellenView einsatzId={einsatzId} befehle={angezeigteBefeble} className="hidden flex-1 md:block" onBefehlSelect={handleBefehlSelect} selectedBefehlId={befehlId} />
              <BefehlKanbanView einsatzId={einsatzId} befehle={angezeigteBefeble} className="flex-1 md:hidden" />
            </>
          )}
        </>
      )}

      {/* Detail Slide-Over Panel */}
      <BefehlDetailPanel befehl={selectedBefehl} isOpen={!!befehlId && !!selectedBefehl} onClose={handlePanelClose} einsatzId={einsatzId} />

      {/* Export Dialog */}
      <BefehlExportDialog isOpen={isExportDialogOpen} onClose={() => setIsExportDialogOpen(false)} einsatzId={einsatzId} />
    </div>
  );
}
