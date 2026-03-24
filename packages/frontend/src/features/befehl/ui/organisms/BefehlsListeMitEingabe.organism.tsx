import { useCurrentUser } from '@/features/auth/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { useEffect, useMemo, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { PiListChecks, PiQuestion, PiUser, PiWarningCircle } from 'react-icons/pi';
import { useNavigate } from '@tanstack/react-router';
import { cn } from '@/shared/ui/cn';
import { Tooltip } from '@/shared/ui/atoms/tooltip.atom';
import { useAendereEmpfaengerStatus } from '../../api/use-aendere-empfaenger-status';
import type { AendereEmpfaengerStatusInput } from '../../api/use-aendere-empfaenger-status';
import { useBefehleByEinsatz } from '../../api/use-befehle-by-einsatz';
import { useMeineBefehle } from '../../api/use-meine-befehle';
import { useMeineBefehleFilter, useOffeneRueckfragenFilter, setShowMeineBefehle, setShowOffeneRueckfragen } from '../../hooks/use-meine-befehle-filter';
import { useBefehlPermissions } from '../../hooks/use-befehl-permissions';
import { useOffeneRueckfragen } from '../../api/use-offene-rueckfragen';
import { getOffeneRueckfragenCount } from '../../lib/befehl-utils';
import { BefehlEingabeRow } from '../molecules/BefehlEingabeRow.molecule';
import { BefehlKarte } from '../molecules/BefehlKarte.molecule';
import { IntegrationStatusBanner } from '../molecules/IntegrationStatusBanner.molecule';
import { BefehlQuittierenDialog } from './BefehlQuittierenDialog.organism';

interface BefehlsListeMitEingabeProps {
  einsatzId: string;
  /** Befehl-ID aus Deeplink Search-Param für Auto-Open des Quittierungs-Dialogs */
  initialBefehlId?: string;
}

/** Skeleton-Platzhalter für eine einzelne Befehlskarte */
function BefehlKarteSkeleton() {
  return (
    <div className="rounded-lg border border-border-subtle p-4">
      <div className="flex items-center gap-3">
        <div className="h-7 w-24 animate-pulse rounded bg-surface-raised" />
        <div className="h-5 w-16 animate-pulse rounded-full bg-surface-raised" />
      </div>
      <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-surface-raised" />
      <div className="mt-3 flex items-center gap-2">
        <div className="h-4 w-20 animate-pulse rounded bg-surface-raised" />
        <div className="h-4 w-32 animate-pulse rounded bg-surface-raised" />
      </div>
    </div>
  );
}

/**
 * Hauptansicht für Befehle: Eingabezeile oben, darunter die Befehlsliste.
 *
 * Zeigt Skeleton Loading, Leerzustand, Error State und die eigentliche Liste.
 * Real-Time Updates via WebSocket Cache Invalidation (Story 1.7).
 * Quittierungs-Dialog für Empfänger (Story 2.2).
 * Filter "Meine Befehle" mit Toggle/Tabs (Story 2.5).
 */
export function BefehlsListeMitEingabe({ einsatzId, initialBefehlId }: BefehlsListeMitEingabeProps) {
  const [showEingabeRow, setShowEingabeRow] = useState(false);
  const { user: currentUser } = useCurrentUser();
  const navigate = useNavigate();
  const { canCreate, canQuittieren, canManageStatus, canViewAll, isLoading: isPermissionsLoading } = useBefehlPermissions(einsatzId);
  const statusMutation = useAendereEmpfaengerStatus(einsatzId);
  const handleStatusChange = (input: AendereEmpfaengerStatusInput) => {
    statusMutation.mutate(input);
  };
  const hasBefehlAccess = !isPermissionsLoading && canViewAll;
  const [showMeineBefehle, toggleMeineBefehle] = useMeineBefehleFilter();
  const [showOffeneRueckfragen, toggleOffeneRueckfragen] = useOffeneRueckfragenFilter();

  // Alle Befehle laden (nur wenn User eine Einsatz-Rolle hat - sonst 403 vom BefehlRollenGuard)
  const alleBefehleQuery = useBefehleByEinsatz(einsatzId, undefined, hasBefehlAccess);
  // "Meine Befehle" separat laden (nur wenn Filter aktiv + Rolle vorhanden)
  const meineBefehleQuery = useMeineBefehle(einsatzId, hasBefehlAccess && showMeineBefehle ? currentUser?.id : undefined);
  // Offene Rueckfragen Query (nur wenn Filter aktiv + Rolle vorhanden)
  const offeneRueckfragenQuery = useOffeneRueckfragen(einsatzId, hasBefehlAccess && showOffeneRueckfragen);
  // Count client-seitig aus allen Befehlen berechnen (kein extra API-Call noetig)
  const offeneRueckfragenCount = useMemo(() => {
    if (!alleBefehleQuery.data) return 0;
    return alleBefehleQuery.data.filter((b) => getOffeneRueckfragenCount(b) > 0).length;
  }, [alleBefehleQuery.data]);

  // Aktive Query-Daten basierend auf Filter
  const activeQuery = showOffeneRueckfragen ? offeneRueckfragenQuery : showMeineBefehle ? meineBefehleQuery : alleBefehleQuery;

  // Client-seitige Sortierung bei offenen Rueckfragen (AC6: meiste offene zuerst)
  const sortedBefehle = useMemo(() => {
    if (!activeQuery.data) return undefined;
    if (showOffeneRueckfragen) {
      return [...activeQuery.data].sort((a, b) => {
        const countDiff = getOffeneRueckfragenCount(b) - getOffeneRueckfragenCount(a);
        if (countDiff !== 0) return countDiff;
        return new Date(b.erteiltAm).getTime() - new Date(a.erteiltAm).getTime();
      });
    }
    return activeQuery.data;
  }, [activeQuery.data, showOffeneRueckfragen]);

  const befehle = sortedBefehle;
  const isLoading = activeQuery.isLoading;
  const isError = activeQuery.isError;
  const refetch = activeQuery.refetch;

  // Badge-Count: Unquittierte Befehle wo User Empfaenger ist
  const unquittiertCount = useMemo(() => {
    const alleBefehle = alleBefehleQuery.data;
    if (!alleBefehle || !currentUser?.id) return 0;
    return alleBefehle.filter((b) => b.empfaenger.some((e) => e.empfaengerId === currentUser.id && !e.quittiertAm)).length;
  }, [alleBefehleQuery.data, currentUser?.id]);

  // Quittierungs-Dialog State
  const [quittierungBefehlId, setQuittierungBefehlId] = useState<string | null>(null);
  // Quittierungs-Befehl aus allen Befehlen suchen (auch wenn "Meine" aktiv)
  const quittierungBefehl = alleBefehleQuery.data?.find((b) => b.id === quittierungBefehlId);
  const meineEmpfaengerInfo = quittierungBefehl?.empfaenger.find((e) => e.empfaengerId === currentUser?.id);

  // Deeplink: Bei initialBefehlId den Dialog automatisch öffnen und zum Befehl scrollen
  useEffect(() => {
    if (!initialBefehlId || !alleBefehleQuery.data || alleBefehleQuery.isLoading) return;

    const befehl = alleBefehleQuery.data.find((b) => b.id === initialBefehlId);
    if (!befehl) return;

    setQuittierungBefehlId(initialBefehlId);

    const element = document.getElementById(`befehl-${initialBefehlId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Search-Param aus URL entfernen (saubere URL)
    navigate({
      search: {},
      replace: true,
    });
  }, [initialBefehlId, alleBefehleQuery.data, alleBefehleQuery.isLoading, navigate]);

  useHotkeys('mod+n', () => setShowEingabeRow(true), { preventDefault: true, enabled: canCreate && !showEingabeRow });

  return (
    <div className="flex flex-1 flex-col">
      {/* Kopfzeile */}
      <div className="flex items-center justify-between border-border-subtle border-b px-6 py-4">
        <h2 className="font-semibold text-text-primary text-lg">Befehle</h2>
        <div className="flex items-center gap-2">
          {/* Desktop: Toggle-Button "Meine Befehle" */}
          <Button
            intent={showMeineBefehle ? 'primary' : 'secondary'}
            appearance={showMeineBefehle ? 'filled' : 'outline'}
            size="sm"
            onClick={toggleMeineBefehle}
            className="hidden md:inline-flex"
            aria-pressed={showMeineBefehle}
          >
            <PiUser className="mr-1.5 h-4 w-4" />
            Meine Befehle
            {unquittiertCount > 0 && (
              <span
                className={cn(
                  'ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-bold text-xs',
                  showMeineBefehle ? 'bg-surface-overlay/20 text-text-inverse' : 'bg-status-warning-surface text-status-warning-text',
                )}
              >
                {unquittiertCount}
              </span>
            )}
          </Button>

          {/* Desktop: Toggle-Button "Offene Rückfragen" */}
          <Button
            intent={showOffeneRueckfragen ? 'primary' : 'secondary'}
            appearance={showOffeneRueckfragen ? 'filled' : 'outline'}
            size="sm"
            onClick={toggleOffeneRueckfragen}
            className="hidden md:inline-flex"
            aria-pressed={showOffeneRueckfragen}
          >
            <PiQuestion className="mr-1.5 h-4 w-4" />
            Rückfragen
            {offeneRueckfragenCount > 0 && (
              <span
                className={cn(
                  'ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-bold text-xs',
                  showOffeneRueckfragen ? 'bg-surface-overlay/20 text-text-inverse' : 'bg-status-warning-surface text-status-warning-text',
                )}
              >
                {offeneRueckfragenCount}
              </span>
            )}
          </Button>

          {!canCreate && !isPermissionsLoading ? (
            <Tooltip content="Nur Ersteller/Befehlsgeber dürfen Befehle erstellen">
              <Button intent="primary" size="sm" kbd="ctrl+n" onClick={() => setShowEingabeRow(true)} disabled aria-disabled="true">
                Neuer Befehl
              </Button>
            </Tooltip>
          ) : (
            <Button intent="primary" size="sm" kbd="ctrl+n" onClick={() => setShowEingabeRow(true)} disabled={showEingabeRow || isPermissionsLoading}>
              {isPermissionsLoading ? 'Laden...' : 'Neuer Befehl'}
            </Button>
          )}
        </div>
      </div>

      {/* Integration Status Banner (Story 5.3 AC5) */}
      <IntegrationStatusBanner />

      {/* Mobile: Tabs "Alle Befehle" | "Meine Befehle (n)" | "Rückfragen (n)" */}
      <div className="flex border-border-subtle border-b md:hidden" role="tablist" aria-label="Befehlsfilter">
        <button
          type="button"
          role="tab"
          id="tab-alle"
          aria-selected={!showMeineBefehle && !showOffeneRueckfragen}
          onClick={() => {
            setShowMeineBefehle(false);
            setShowOffeneRueckfragen(false);
          }}
          className={cn(
            'flex-1 px-4 py-3 text-center font-medium text-sm transition-colors',
            'min-h-[48px]',
            !showMeineBefehle && !showOffeneRueckfragen ? 'border-action-primary border-b-2 text-action-primary' : 'text-text-muted hover:text-text-secondary',
          )}
        >
          Alle
        </button>
        <button
          type="button"
          role="tab"
          id="tab-meine"
          aria-selected={showMeineBefehle}
          onClick={() => {
            setShowMeineBefehle(true);
            setShowOffeneRueckfragen(false);
          }}
          className={cn(
            'flex-1 px-4 py-3 text-center font-medium text-sm transition-colors',
            'min-h-[48px]',
            showMeineBefehle ? 'border-action-primary border-b-2 text-action-primary' : 'text-text-muted hover:text-text-secondary',
          )}
        >
          Meine
          {unquittiertCount > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-status-warning-surface px-1 font-bold text-xs text-status-warning-text">
              {unquittiertCount}
            </span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          id="tab-rueckfragen"
          aria-selected={showOffeneRueckfragen}
          onClick={() => {
            setShowOffeneRueckfragen(true);
            setShowMeineBefehle(false);
          }}
          className={cn(
            'flex-1 px-4 py-3 text-center font-medium text-sm transition-colors',
            'min-h-[48px]',
            showOffeneRueckfragen ? 'border-action-primary border-b-2 text-action-primary' : 'text-text-muted hover:text-text-secondary',
          )}
        >
          Rückfragen
          {offeneRueckfragenCount > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-status-warning-surface px-1 font-bold text-xs text-status-warning-text">
              {offeneRueckfragenCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab-Content */}
      <div role="tabpanel" aria-labelledby={showOffeneRueckfragen ? 'tab-rueckfragen' : showMeineBefehle ? 'tab-meine' : 'tab-alle'}>
        {/* Befehl-Eingabezeile */}
        {showEingabeRow && (
          <div className="px-6 pt-4">
            <BefehlEingabeRow einsatzId={einsatzId} onClose={() => setShowEingabeRow(false)} />
          </div>
        )}

        {/* Keine Einsatz-Rolle zugewiesen */}
        {!isPermissionsLoading && !canViewAll && (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <PiWarningCircle className="mb-4 h-12 w-12 text-status-warning-text" />
            <p className="font-medium text-text-primary text-lg">Keine Befehl-Rolle zugewiesen</p>
            <p className="mt-1 text-text-muted text-sm">Bitten Sie einen Administrator, Ihnen eine Rolle in diesem Einsatz zuzuweisen.</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          /* biome-ignore lint/a11y/useSemanticElements: role="status" auf div ist Standard-Pattern fuer Skeleton Loading */
          <div className="flex flex-col gap-3 p-6" role="status" aria-label="Befehle werden geladen">
            <BefehlKarteSkeleton />
            <BefehlKarteSkeleton />
            <BefehlKarteSkeleton />
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <PiWarningCircle className="mb-4 h-12 w-12 text-status-danger-text" />
            <p className="font-medium text-text-primary text-lg">Fehler beim Laden der Befehle</p>
            <p className="mt-1 text-text-muted text-sm">Die Befehle konnten nicht geladen werden.</p>
            <Button intent="secondary" size="sm" className="mt-4" onClick={() => refetch()}>
              Erneut versuchen
            </Button>
          </div>
        )}

        {/* Leerzustand */}
        {!isLoading && !isError && befehle?.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <PiListChecks className="mb-4 h-12 w-12 text-text-muted" />
            <p className="font-medium text-text-primary text-lg">{showOffeneRueckfragen ? 'Keine offenen Rückfragen' : showMeineBefehle ? 'Keine eigenen Befehle' : 'Noch keine Befehle erteilt'}</p>
            <p className="mt-1 text-text-muted text-sm">
              {showOffeneRueckfragen ? (
                'Aktuell gibt es keine Befehle mit unbeantworteten Rückfragen.'
              ) : showMeineBefehle ? (
                'Du bist derzeit bei keinem Befehl als Empfänger eingetragen.'
              ) : (
                <>
                  Erstelle den ersten Befehl mit <kbd className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-text-secondary text-xs">Ctrl+N</kbd>
                </>
              )}
            </p>
          </div>
        )}

        {/* Screenreader-Announcer fuer neue Eintraege (separiert von der Liste) */}
        <div aria-live="polite" className="sr-only">
          {!isLoading && !isError && befehle && befehle.length > 0 && `${befehle.length} Befehle geladen`}
        </div>

        {/* Befehlsliste */}
        {!isLoading && !isError && befehle && befehle.length > 0 && (
          <ul className="flex flex-col gap-3 p-6" aria-label={showOffeneRueckfragen ? 'Befehle mit offenen Rückfragen' : showMeineBefehle ? 'Meine Befehlsliste' : 'Befehlsliste'}>
            {befehle.map((befehl) => (
              <li key={befehl.id} id={`befehl-${befehl.id}`}>
                <BefehlKarte
                  nummer={befehl.nummer}
                  auftrag={befehl.auftrag}
                  status={befehl.status}
                  empfaenger={befehl.empfaenger}
                  erteiltAm={befehl.erteiltAm}
                  kommentare={befehl.kommentare}
                  einsatzId={einsatzId}
                  befehlId={befehl.id}
                  currentUserId={currentUser?.id}
                  onQuittieren={setQuittierungBefehlId}
                  showMeineBefehle={showMeineBefehle}
                  originalBefehlId={befehl.originalBefehlId}
                  allBefehle={alleBefehleQuery.data}
                  canQuittieren={canQuittieren}
                  onStatusChange={handleStatusChange}
                  canManageStatus={canManageStatus}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quittierungs-Dialog */}
      {quittierungBefehl && currentUser?.id && (
        <BefehlQuittierenDialog
          isOpen={!!quittierungBefehlId}
          onClose={() => setQuittierungBefehlId(null)}
          befehlId={quittierungBefehl.id}
          befehlNummer={quittierungBefehl.nummer}
          empfaengerId={currentUser.id}
          einsatzId={einsatzId}
          bereitsQuittiert={!!meineEmpfaengerInfo?.quittiertAm}
        />
      )}
    </div>
  );
}
