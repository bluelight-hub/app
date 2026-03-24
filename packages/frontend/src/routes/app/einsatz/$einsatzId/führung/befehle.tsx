import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { PiCaretDown, PiCaretUp, PiExport, PiFunnel, PiPlus, PiUser } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Tooltip } from '@/shared/ui/atoms/tooltip.atom';
import { z } from 'zod';
import {
  BefehlDetailPanel,
  BefehlEingabeRow,
  BefehlExportDialog,
  BefehlQuittierenDialog,
  BefehlFilterRow,
  BefehlTabellenView,
  ConnectionStatusBanner,
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
  useBefehlPermissions,
  useBefehlWebSocketStatus,
  useHasActiveFilters,
  useMeineBefehleFilter,
  useMeineBefehle,
  toQueryFilters,
} from '@/features/befehl';
import { useCurrentUser } from '@/features/auth/api';
import { extractBefehlsgeberNames, extractEmpfaengerNames } from '@/features/befehl/lib/extract-filter-options';
import { useHandlungsbedarf } from '@/features/befehl/hooks/use-handlungsbedarf';
import { HandlungsbedarfSection } from '@/features/befehl/ui/organisms/HandlungsbedarfSection.organism';
import { BefehlCompactCard } from '@/features/befehl/ui/molecules/BefehlCompactCard.molecule';

const searchSchema = z.object({
  befehlId: z.string().optional(),
});

export const Route = createFileRoute('/app/einsatz/$einsatzId/führung/befehle')({
  validateSearch: (search) => searchSchema.parse(search),
  component: BefehleSeite,
});

/** Seite fuer das Befehlsmanagement innerhalb eines Einsatzes. Unified View mit Zone A (Handlungsbedarf) + Zone B (Tabelle). */
function BefehleSeite() {
  const { einsatzId } = Route.useParams();
  const { befehlId } = Route.useSearch();
  const navigate = Route.useNavigate();
  // WebSocket-Verbindung + Notifications laufen im SingleEinsatzLayout (einsatzweit)
  const isConnected = useBefehlWebSocketStatus();
  const { user: currentUser } = useCurrentUser();
  const { canCreate, canExport, canQuittieren, isLoading: isPermissionsLoading } = useBefehlPermissions(einsatzId);
  const [showMeineBefehle, toggleMeineBefehle] = useMeineBefehleFilter();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [showEingabeRow, setShowEingabeRow] = useState(false);
  const [quittierungBefehlId, setQuittierungBefehlId] = useState<string | null>(null);

  useHotkeys('mod+n', () => setShowEingabeRow(true), { preventDefault: true, enabled: canCreate && !showEingabeRow });

  // Filter-State aus Store
  const filterState = useBefehleFilter();
  const activeFilterCount = useActiveFilterCount();
  const hasFilters = useHasActiveFilters();

  // Server-seitige Query mit Filtern
  const queryFilters = useMemo(() => toQueryFilters(filterState), [filterState]);
  const { data: befehle, isError, refetch } = useBefehleByEinsatz(einsatzId, hasFilters ? queryFilters : undefined);

  // Ungefilterte Befehle fuer Optionslisten + Handlungsbedarf
  const { data: allBefehle } = useBefehleByEinsatz(einsatzId);
  const empfaengerOptions = useMemo(() => extractEmpfaengerNames(allBefehle ?? []), [allBefehle]);
  const befehlsgeberOptions = useMemo(() => extractBefehlsgeberNames(allBefehle ?? []), [allBefehle]);

  // "Meine Befehle" Query (nur wenn Filter aktiv)
  const meineBefehleQuery = useMeineBefehle(einsatzId, showMeineBefehle ? currentUser?.id : undefined);

  // Badge-Count: Unquittierte Befehle wo User Empfaenger ist
  const unquittiertCount = useMemo(() => {
    if (!allBefehle || !currentUser?.id) return 0;
    return allBefehle.filter((b) => b.empfaenger.some((e) => e.empfaengerId === currentUser.id && !e.quittiertAm)).length;
  }, [allBefehle, currentUser?.id]);

  // Aktive Datenquelle: "Meine Befehle" oder alle (gefiltert)
  const aktiveBefehle = showMeineBefehle ? meineBefehleQuery.data : befehle;

  // Handlungsbedarf berechnen (immer aus ungefilterten Befehlen)
  const handlungsbedarf = useHandlungsbedarf(allBefehle, currentUser?.id);

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

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-border-subtle border-b px-4 py-2">
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
                  showMeineBefehle ? 'bg-white/20 text-white' : 'bg-status-warning-surface text-status-warning-text',
                )}
              >
                {unquittiertCount}
              </span>
            )}
          </Button>

          {/* Filter Toggle (Mobile: Dropdown, Desktop: inline) */}
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen((prev) => !prev)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-medium text-sm transition-colors',
              hasFilters ? 'border-action-primary/35 bg-primary-50 text-action-primary' : 'border-border-subtle text-text-secondary hover:bg-action-secondary hover:text-text-primary',
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
          {/* Ergebnis-Count */}
          <span className="text-text-muted text-sm" aria-live="polite">
            {aktiveBefehle ? `${aktiveBefehle.length} Befehle` : ''}
          </span>

          {/* Export-Button */}
          {isPermissionsLoading ? (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-text-muted text-sm"
              aria-label="Berechtigungen werden geladen"
            >
              <PiExport className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Export</span>
            </button>
          ) : canExport ? (
            <button
              type="button"
              onClick={() => setIsExportDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-text-secondary text-sm hover:bg-action-secondary hover:text-text-primary focus:outline-none focus-visible:shadow-focus-ring"
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
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-text-muted text-sm"
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
        <div id="befehl-filter-panel" className="border-border-subtle border-b">
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

      {/* Error-State */}
      {isError && (
        <div className="bg-status-danger-surface px-4 py-2 text-status-danger-text text-sm">
          Filter konnten nicht angewendet werden.{' '}
          <button type="button" onClick={() => void refetch()} className="underline hover:no-underline focus:outline-none focus-visible:shadow-focus-ring">
            Erneut versuchen
          </button>
        </div>
      )}

      {/* Befehl-Eingabezeile */}
      {showEingabeRow && (
        <div className="border-border-subtle border-b px-4 py-4">
          <BefehlEingabeRow einsatzId={einsatzId} onClose={() => setShowEingabeRow(false)} />
        </div>
      )}

      {/* Scrollbarer Content-Bereich */}
      <div className="flex-1 overflow-y-auto">
        {/* Zone A: Handlungsbedarf */}
        {!showMeineBefehle && <HandlungsbedarfSection handlungsbedarf={handlungsbedarf} onBefehlSelect={handleBefehlSelect} onQuittieren={setQuittierungBefehlId} />}

        {/* Zone B: Alle Befehle */}
        {hasFilters && aktiveBefehle?.length === 0 && !isError ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <p className="text-text-muted">Keine Befehle gefunden — Filter anpassen</p>
            <button
              type="button"
              onClick={resetBefehleFilter}
              className="mt-2 text-primary-600 text-sm hover:text-primary-700 focus:outline-none focus-visible:shadow-focus-ring dark:text-primary-400 dark:hover:text-primary-300"
            >
              Filter zurücksetzen
            </button>
          </div>
        ) : (
          <>
            {/* Desktop: Tabelle */}
            <BefehlTabellenView einsatzId={einsatzId} befehle={aktiveBefehle} className="hidden md:block" onBefehlSelect={handleBefehlSelect} selectedBefehlId={befehlId} />

            {/* Mobile: Compact Card Liste */}
            <div className="flex flex-col gap-2 p-3 md:hidden">
              {aktiveBefehle?.map((befehl) => (
                <BefehlCompactCard key={befehl.id} befehl={befehl} onClick={() => handleBefehlSelect(befehl.id)} selected={befehlId === befehl.id} />
              ))}
              {!aktiveBefehle?.length && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-text-muted">Noch keine Befehle erteilt.</p>
                  <p className="mt-1 text-text-muted text-sm">
                    Erstelle den ersten Befehl mit <kbd className="rounded border border-border-subtle bg-surface-raised px-1.5 py-0.5 font-mono text-xs">Ctrl+N</kbd>.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Detail Slide-Over Panel */}
      <BefehlDetailPanel
        befehl={selectedBefehl}
        isOpen={!!befehlId && !!selectedBefehl}
        onClose={handlePanelClose}
        einsatzId={einsatzId}
        onQuittieren={setQuittierungBefehlId}
        currentUserId={currentUser?.id}
        canQuittieren={canQuittieren}
      />

      {/* Export Dialog */}
      <BefehlExportDialog isOpen={isExportDialogOpen} onClose={() => setIsExportDialogOpen(false)} einsatzId={einsatzId} />

      {/* Quittierungs-Dialog */}
      {quittierungBefehlId &&
        currentUser?.id &&
        (() => {
          const quittierungBefehl = allBefehle?.find((b) => b.id === quittierungBefehlId);
          if (!quittierungBefehl) return null;
          return (
            <BefehlQuittierenDialog
              isOpen={!!quittierungBefehlId}
              onClose={() => setQuittierungBefehlId(null)}
              befehlId={quittierungBefehl.id}
              befehlNummer={quittierungBefehl.nummer}
              empfaengerId={currentUser.id}
              einsatzId={einsatzId}
              bereitsQuittiert={!!quittierungBefehl.empfaenger.find((e) => e.empfaengerId === currentUser.id)?.quittiertAm}
            />
          );
        })()}
    </div>
  );
}
