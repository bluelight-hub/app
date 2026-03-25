/**
 * Erinnerungen Liste
 *
 * Zeigt alle Erinnerungen fuer einen Einsatz an.
 *
 * **Story 1.3 AC1:** Liste zeigt alle Erinnerungen
 * **Story 1.3 AC3:** Bearbeiten nur bei GEPLANT Status
 * **Story 1.5:** Automatischer Alarm bei Faelligkeit
 * **Story 1.7 AC5:** Sortierung nach Urgency Level
 * **Story 1.8 AC1:** Offline-Banner und Sync-Status
 * **Story 2.4 AC2:** FloatingPill Portal fuer urgent Alarme
 * **Story 3.1:** Tabs fuer "Meine" / "Team" Ansicht
 * **Story 3.2 AC1:** Echtzeit-Updates via WebSocket
 * **Story 3.2 AC3:** Toast-Notification bei Team-Events
 * **Story 3.6:** Filter fuer Team-Erinnerungen nach Zuweisung
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ErinnerungResponseDto } from '@/shared';
import { Button } from '@/shared/ui/atoms/button.atom';
import { cn } from '@/shared/ui/cn';
import { Tabs } from '@/shared/ui/molecules/tabs.molecule';
import { PiAlarm, PiBookmarkSimple, PiPlus, PiWifiHigh, PiWifiSlash } from 'react-icons/pi';
import { useCurrentUser } from '@/features/auth';
import { useAktiveEinsatzTeilnehmer, useEinsatzDetail } from '@/features/einsatz/api';
import { useKategorienByEinsatz } from '@/features/kategorien';
import { sanitizeName } from '@/shared/utils/sanitize';
import { useErinnerungenByEinsatz } from '../../api';
import { useErinnerungWebSocket, useOfflineStatus, useReconnectSync, useTrayBadge, useTrayClickNavigation } from '../../hooks';
import {
  addAnimatedId,
  openQuickCreateDialog,
  resetKategorieFilterStore,
  resetStatusFilterStore,
  resetTeamFilterStore,
  setAvailableTeilnehmer,
  setKategorieFilter,
  setStatusFilter,
  setTeamFilter,
  setTeamSort,
  useAvailableTeilnehmer,
  useKategorieFilter,
  useStatusFilter,
  useTeamFilter,
  useTeamSort,
  type KategorieFilterType,
  type StatusFilterType,
  type TeamFilterType,
  type TeamSortType,
} from '../../stores';
import { compareErinnerungen } from '../../utils/sorting-utils';
import { isMyErinnerung } from '../../utils/erinnerung-ownership';
import { KategorieFilterDropdown, StatusFilterDropdown, TeamFilterDropdown, TeamSortDropdown } from '../atoms';
import { ActiveFiltersBar } from './ActiveFiltersBar';
import { ErinnerungCard } from './ErinnerungCard';
import { KategorieDashboard } from './KategorieDashboard';
import { OfflineBanner } from './OfflineBanner';
import { PresetBar } from './PresetBar';
import { SavePresetDialog } from '../organisms/SavePresetDialog';

interface ErinnerungenListProps {
  /** Einsatz-ID fuer die Erinnerungen */
  einsatzId: string;
  /** Zusaetzliche CSS-Klassen */
  className?: string;
  /** Kompakte Ansicht (weniger Padding, keine Header) */
  compact?: boolean;
  /** Story 9.7: Callback fuer WebSocket-Verbindungsstatus (fuer LiveIndikator) */
  onConnectionStatusChange?: (isConnected: boolean) => void;
}

/**
 * Liste aller Erinnerungen fuer einen Einsatz.
 *
 * Zeigt Erinnerungen sortiert nach Faelligkeit an.
 * Unterstuetzt Erstellen und Bearbeiten von Erinnerungen.
 *
 * Story 3.6 Issue #6: Wrapper-Komponente mit User-Guard.
 * Delegiert an ErinnerungenListInner wenn User eingeloggt ist.
 */
export function ErinnerungenList({ einsatzId, className, compact = false, onConnectionStatusChange }: ErinnerungenListProps) {
  const { user } = useCurrentUser();

  // Story 3.6 Issue #6: Guard - User muss eingeloggt sein
  if (!user) {
    return (
      <div className={cn('rounded-panel border border-status-warning-border bg-status-warning-surface p-4', className)}>
        <p className="text-sm text-status-warning-text">Bitte einloggen um Erinnerungen zu sehen</p>
      </div>
    );
  }

  // Nach Guard ist user garantiert non-null - rendere innere Komponente
  return <ErinnerungenListInner einsatzId={einsatzId} className={className} compact={compact} currentUserId={user.id} onConnectionStatusChange={onConnectionStatusChange} />;
}

/**
 * Props fuer die innere Erinnerungen-Liste Komponente.
 */
interface ErinnerungenListInnerProps extends ErinnerungenListProps {
  /** Garantiert non-null User-ID (nach Guard in Wrapper) */
  currentUserId: string;
  /** Story 9.7: Callback fuer WebSocket-Verbindungsstatus */
  onConnectionStatusChange?: (isConnected: boolean) => void;
}

/**
 * Innere Komponente mit allen Hooks.
 *
 * Wird nur gerendert wenn User eingeloggt ist (currentUserId garantiert non-null).
 * Ermoeglicht saubere Hook-Aufrufe ohne bedingte Logik (React Rules of Hooks).
 */
const LIVE_EINSATZ_STATUS = new Set(['IN_BEARBEITUNG', 'ANGELEGT']);

function ErinnerungenListInner({ einsatzId, className, compact = false, currentUserId, onConnectionStatusChange }: ErinnerungenListInnerProps) {
  const { data: erinnerungen, isLoading, error } = useErinnerungenByEinsatz({ einsatzId });

  // L1: Einsatz-Status fuer bedingte Statistik-Invalidierung (Query wird dedupliziert via TanStack)
  const { einsatz } = useEinsatzDetail(einsatzId);
  const isLiveEinsatz = einsatz?.status != null && LIVE_EINSATZ_STATUS.has(einsatz.status);

  // Story 3.6 Task 3.1: Team-Filter Store Hooks
  const selectedFilter = useTeamFilter();
  const availableTeilnehmer = useAvailableTeilnehmer();

  // Story 3.8: Sort Store Hooks
  const selectedSort = useTeamSort();

  // Story 8.3 Task 3.1: Kategorie-Filter Store Hook
  const selectedKategorieFilter = useKategorieFilter();

  // Story 8.4 Task 3: Status-Filter Store Hook
  const selectedStatusFilter = useStatusFilter();

  // Story 3.6 Task 3.4: Teilnehmer aus Einsatz laden
  const { data: einsatzTeilnehmer } = useAktiveEinsatzTeilnehmer(einsatzId);

  // Story 8.3 Task 3.2: Kategorien aus Einsatz laden
  const { data: kategorien = [] } = useKategorienByEinsatz(einsatzId);

  /**
   * Story 3.6 Issue #4 / Story 8.3 / Story 8.4: Cleanup bei Unmount
   *
   * Resettet die Filter Stores wenn die Komponente unmountet wird.
   * Verhindert Memory Leaks und stale Filter-States.
   */
  useEffect(() => {
    return () => {
      resetTeamFilterStore();
      resetKategorieFilterStore();
      resetStatusFilterStore();
    };
  }, []);

  /**
   * Story 3.6 Issue #2 Fix: Primary Effect - Einsatz-Teilnehmer (hat Prioritaet)
   * Story 3.6 Issue #3: XSS Defense-in-Depth - Namen werden sanitiert
   *
   * Setzt die verfuegbaren Teilnehmer aus den Einsatz-Teilnehmern.
   * Dieser Effect hat Prioritaet - wenn Einsatz-Teilnehmer vorhanden sind,
   * werden sie verwendet (unabhaengig vom Fallback).
   */
  useEffect(() => {
    if (einsatzTeilnehmer && einsatzTeilnehmer.length > 0) {
      // Mapping von AktiveTeilnehmerResponseDto zu Teilnehmer Format
      const teilnehmerList = einsatzTeilnehmer.map((t) => ({
        id: t.userId,
        name: sanitizeName(t.username || `${t.personVorname} ${t.personNachname}`),
      }));
      setAvailableTeilnehmer(teilnehmerList);
    }
  }, [einsatzTeilnehmer]);

  /**
   * Story 3.6 Issue #2 Fix: Fallback Effect - Teilnehmer aus Erinnerungen
   * Story 3.6 Issue #3: XSS Defense-in-Depth - Namen werden sanitiert
   *
   * Wird nur verwendet wenn KEINE Einsatz-Teilnehmer vorhanden sind.
   * Extrahiert Teilnehmer aus den Erinnerungen (erstelltVon, assignedTo).
   *
   * Separate Effects verhindern Race Conditions zwischen Primary und Fallback.
   */
  useEffect(() => {
    // Nur wenn keine Einsatz-Teilnehmer vorhanden sind
    if ((!einsatzTeilnehmer || einsatzTeilnehmer.length === 0) && erinnerungen && erinnerungen.length > 0) {
      // Story 3.6 Task 4.4: Fallback - Teilnehmer aus Erinnerungen extrahieren
      const teilnehmerMap = new Map<string, string>();
      for (const e of erinnerungen) {
        // eslint-disable-next-line typescript/no-explicit-any -- DTO missing fields
        if (e.erstelltVon && (e as any).erstellerName) {
          // eslint-disable-next-line typescript/no-explicit-any -- DTO missing fields
          teilnehmerMap.set(e.erstelltVon, sanitizeName((e as any).erstellerName));
        }
        if (e.assignedToId && e.assignedToName) {
          teilnehmerMap.set(e.assignedToId as unknown as string, sanitizeName(e.assignedToName));
        }
      }
      const fallbackList = Array.from(teilnehmerMap, ([id, name]) => ({ id, name }));
      setAvailableTeilnehmer(fallbackList);
    }
  }, [einsatzTeilnehmer, erinnerungen]);

  // Story 3.6 Task 3.1: Filter-Change Handler
  const handleFilterChange = useCallback((filter: TeamFilterType) => {
    setTeamFilter(filter);
  }, []);

  // Story 3.8: Sort-Change Handler
  const handleSortChange = useCallback((sort: TeamSortType) => {
    setTeamSort(sort);
  }, []);

  // Story 8.3 Task 3: Kategorie-Filter-Change Handler
  const handleKategorieFilterChange = useCallback((filter: KategorieFilterType) => {
    setKategorieFilter(filter);
  }, []);

  // Story 8.4 Task 3: Status-Filter-Change Handler
  const handleStatusFilterChange = useCallback((filter: StatusFilterType) => {
    setStatusFilter(filter);
  }, []);

  // Story 8.6 Task 3: Clear-Filter Handler fuer ActiveFiltersBar
  const handleClearTeamFilter = useCallback(() => {
    setTeamFilter({ type: 'all' });
  }, []);

  const handleClearKategorieFilter = useCallback(() => {
    setKategorieFilter({ type: 'all' });
  }, []);

  const handleClearStatusFilter = useCallback(() => {
    setStatusFilter({ type: 'all' });
  }, []);

  const handleClearAllFilters = useCallback(() => {
    resetTeamFilterStore();
    resetKategorieFilterStore();
    resetStatusFilterStore();
  }, []);

  // Story 1.8: Offline-Status und Sync-Handling
  const { isOffline, pendingActionsCount, offlineSince } = useOfflineStatus();
  const { isSyncing } = useReconnectSync(einsatzId);

  // Story 1.9: Tray-Badge synchronisieren und Tray-Click Navigation
  useTrayBadge();
  useTrayClickNavigation(einsatzId);

  // Story 3.2 AC2: Animation-Callbacks fuer WebSocket-Events
  const handleWebSocketCreated = useCallback((event: { erinnerungId: string }) => {
    addAnimatedId(event.erinnerungId, 'insert');
  }, []);

  const handleWebSocketUpdated = useCallback((event: { erinnerungId: string }) => {
    addAnimatedId(event.erinnerungId, 'update');
  }, []);

  const handleWebSocketAcknowledged = useCallback((event: { erinnerungId: string }) => {
    addAnimatedId(event.erinnerungId, 'update');
  }, []);

  // Story 3.2 AC1+AC3: WebSocket fuer Echtzeit-Updates und Team-Toasts
  const { isConnected } = useErinnerungWebSocket({
    einsatzId,
    enabled: true,
    showTeamToasts: true, // AC3: Toast bei Team-Events
    invalidateStatistik: isLiveEinsatz, // L1: Statistik nur bei Live-Einsaetzen invalidieren
    // Story 3.2 AC2: Animation bei Status-Aenderung
    onCreated: handleWebSocketCreated,
    onUpdated: handleWebSocketUpdated,
    onAcknowledged: handleWebSocketAcknowledged,
  });

  // Story 9.7: WebSocket-Verbindungsstatus an Parent melden (fuer LiveIndikator)
  useEffect(() => {
    onConnectionStatusChange?.(isConnected);
  }, [isConnected, onConnectionStatusChange]);

  // Story 1.5: Alarm Trigger Hook wurde nach SingleEinsatzLayout verschoben
  // für app-weite Erinnerungsprüfung (auch auf Lagekarte, ETB, etc.)

  // Story 8.9: SavePresetDialog State
  const [isSavePresetOpen, setIsSavePresetOpen] = useState(false);

  const handleCreateClick = () => {
    openQuickCreateDialog(einsatzId);
  };

  /**
   * Story 1.7 AC5 / Story 3.8 / Story 8.7: Sortier-Logik
   *
   * Verarbeitet verschiedene Sortier-Modi:
   * - faelligkeit (Standard): Urgency Priority, dann Faelligkeit aufsteigend
   * - faelligkeit_desc: Faelligkeit absteigend (spaeteste zuerst, keine Urgency-Logik)
   * - erstellt: Erstellungsdatum absteigend (neueste oben)
   * - status: Status-Prioritaet (Acknowledge-Pflicht oben), dann Faelligkeit
   */
  const sortedErinnerungen = useMemo(() => {
    return [...(erinnerungen ?? [])].sort((a, b) => compareErinnerungen(a, b, selectedSort));
  }, [erinnerungen, selectedSort]);

  /**
   * Story 3.1 AC2: Filter-Logik fuer "Meine" Erinnerungen
   * Story 3.6 Issue #5: Nutzt extrahierte Helper-Funktion
   */
  const myErinnerungen = useMemo(() => {
    return sortedErinnerungen.filter((e) => isMyErinnerung(e, currentUserId));
  }, [sortedErinnerungen, currentUserId]);

  // Story 3.1 AC6: Team-Tab zeigt alle nicht-abgeschlossenen Erinnerungen
  const teamErinnerungen = useMemo(() => {
    return sortedErinnerungen.filter((e) => e.status !== 'ERLEDIGT');
  }, [sortedErinnerungen]);

  /**
   * Story 3.6 Task 3.2: Gefilterte Team-Erinnerungen basierend auf selectedFilter
   * Story 3.6 Issue #5: Nutzt extrahierte Helper-Funktion fuer 'mine' case
   *
   * Filter-Logik (Tagged Union):
   * - { type: 'all' }: Alle Team-Erinnerungen (AC5)
   * - { type: 'mine' }: Ersteller ODER Zugewiesener === currentUserId (AC3)
   * - { type: 'unassigned' }: assignedToId ist null/undefined (AC4)
   * - { type: 'user', userId }: assignedToId === userId (AC2)
   */
  const filteredTeamErinnerungen = useMemo(() => {
    const base = teamErinnerungen;

    switch (selectedFilter.type) {
      case 'all':
        return base;
      case 'mine':
        return base.filter((e) => isMyErinnerung(e, currentUserId));
      case 'unassigned':
        return base.filter((e) => !e.assignedToId);
      case 'user':
        // AC2: Filter by specific userId
        return base.filter((e) => (e.assignedToId as string | null | undefined) === selectedFilter.userId);
    }
  }, [teamErinnerungen, selectedFilter, currentUserId]);

  /**
   * Story 8.3 Task 3.3: Gefilterte Erinnerungen basierend auf Kategorie-Filter
   *
   * Filter-Logik (Tagged Union):
   * - { type: 'all' }: Alle Team-Erinnerungen (keine Kategorie-Filterung) (AC1)
   * - { type: 'kategorie', kategorieId }: Nur Erinnerungen mit dieser Kategorie (AC2)
   * - { type: 'untagged' }: Nur Erinnerungen ohne zugewiesene Kategorie (AC4)
   */
  const filteredByKategorie = useMemo(() => {
    switch (selectedKategorieFilter.type) {
      case 'all':
        return filteredTeamErinnerungen;
      case 'kategorie':
        return filteredTeamErinnerungen.filter((e) => e.kategorieId === selectedKategorieFilter.kategorieId);
      case 'untagged':
        return filteredTeamErinnerungen.filter((e) => !e.kategorieId);
    }
  }, [filteredTeamErinnerungen, selectedKategorieFilter]);

  /**
   * Story 8.4 Task 3: Gefilterte Erinnerungen basierend auf Status-Filter
   *
   * Filter-Logik (Tagged Union):
   * - { type: 'all' }: Alle Erinnerungen (keine Status-Filterung)
   * - { type: 'status', status }: Nur Erinnerungen mit diesem Status
   */
  const filteredByStatus = useMemo(() => {
    switch (selectedStatusFilter.type) {
      case 'all':
        return filteredByKategorie;
      case 'status':
        return filteredByKategorie.filter((e) => e.status === selectedStatusFilter.status);
    }
  }, [filteredByKategorie, selectedStatusFilter]);

  /** Story 8.3 / Story 8.4: Ist einer der Filter aktiv? */
  const isAnyFilterActive = selectedFilter.type !== 'all' || selectedKategorieFilter.type !== 'all' || selectedStatusFilter.type !== 'all';

  if (isLoading) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="h-20 rounded-panel bg-surface-raised" />
        <div className="mt-2 h-20 rounded-panel bg-surface-raised" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('rounded-panel border border-status-danger-border bg-status-danger-surface p-4', className)}>
        <p className="text-sm text-status-danger-text">Fehler beim Laden der Erinnerungen</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Story 1.8 AC1: Offline-Banner */}
      <OfflineBanner isOffline={isOffline} pendingCount={pendingActionsCount} isSyncing={isSyncing} offlineSince={offlineSince} className="mb-2 rounded-lg" />

      {/* Header (nur wenn nicht kompakt) */}
      {!compact && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiAlarm className="h-5 w-5 text-status-warning-text" />
            <h3 className="font-semibold text-text-primary">Erinnerungen</h3>
            {sortedErinnerungen.length > 0 && <span className="rounded-pill bg-status-warning-surface px-2 py-0.5 text-xs font-medium text-status-warning-text">{sortedErinnerungen.length}</span>}
            {/* Story 3.2 Task 1.2: WebSocket-Status-Indikator */}
            <span
              className={cn('flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs', isConnected ? 'bg-status-success-surface text-status-success-text' : 'bg-surface-raised text-text-muted')}
              title={isConnected ? 'Echtzeit-Updates aktiv' : 'Verbindung unterbrochen'}
            >
              {isConnected ? <PiWifiHigh className="h-3 w-3" /> : <PiWifiSlash className="h-3 w-3" />}
            </span>
          </div>
          <Button size="sm" appearance="ghost" onClick={handleCreateClick}>
            <PiPlus className="mr-1 h-4 w-4" />
            Neu
          </Button>
        </div>
      )}

      {/* Story 8.9 Task 4.3: SavePresetDialog verdrahten mit Store */}
      <SavePresetDialog
        isOpen={isSavePresetOpen}
        onClose={() => setIsSavePresetOpen(false)}
        teilnehmerMap={new Map(availableTeilnehmer.map((t) => [t.id, t.name]))}
        kategorienMap={new Map(kategorien.map((k) => [k.id, k.name]))}
      />

      {/* Story 3.1 AC1: Tabs fuer "Meine" / "Team" Ansicht */}
      <Tabs
        items={[
          {
            label: `Meine (${myErinnerungen.length})`,
            content: (
              <ErinnerungListContent
                erinnerungen={myErinnerungen}
                einsatzId={einsatzId}
                currentUserId={currentUserId}
                showCreator={false}
                compact={compact}
                onCreateClick={handleCreateClick}
                emptyMessage="Du hast keine eigenen Erinnerungen"
              />
            ),
          },
          {
            label: `Team (${teamErinnerungen.length})`,
            content: (
              <div className="space-y-3">
                {/* Story 8.9: PresetBar oberhalb der Filter-Dropdowns */}
                <PresetBar />
                {/* Story 8.10: KategorieDashboard zwischen PresetBar und Filter-Dropdowns */}
                <KategorieDashboard erinnerungen={erinnerungen ?? []} kategorien={kategorien} />
                {/* Story 3.6 / Story 3.8 / Story 8.3 / Story 8.4: Filter & Sort Dropdowns im Team-Tab Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <TeamFilterDropdown selectedFilter={selectedFilter} onFilterChange={handleFilterChange} teilnehmer={availableTeilnehmer} currentUserId={currentUserId} className="w-44" />
                    {/* Story 8.3 Task 4: Kategorie-Filter-Dropdown */}
                    <KategorieFilterDropdown selectedFilter={selectedKategorieFilter} onFilterChange={handleKategorieFilterChange} kategorien={kategorien} className="w-44" />
                    {/* Story 8.4 Task 3: Status-Filter-Dropdown */}
                    <StatusFilterDropdown selectedFilter={selectedStatusFilter} onFilterChange={handleStatusFilterChange} />
                    <TeamSortDropdown selectedSort={selectedSort} onSortChange={handleSortChange} className="w-36" />
                    {/* Story 8.9 Task 4.1: "Preset speichern" Button - nur wenn mindestens ein Filter aktiv */}
                    {isAnyFilterActive && (
                      <Button size="sm" appearance="ghost" onClick={() => setIsSavePresetOpen(true)} aria-label="Filter als Preset speichern">
                        <PiBookmarkSimple className="mr-1 h-4 w-4" />
                        Speichern
                      </Button>
                    )}
                  </div>
                  {/* Story 8.6 AC5: Anzeige der gefilterten Anzahl bei aktivem Filter */}
                  {isAnyFilterActive && (
                    <span className="text-xs text-text-muted">
                      {filteredByStatus.length} von {teamErinnerungen.length}
                    </span>
                  )}
                </div>
                {/* Story 8.6 AC2-4: Aktive Filter als Chips anzeigen */}
                <ActiveFiltersBar
                  teamFilter={selectedFilter}
                  kategorieFilter={selectedKategorieFilter}
                  statusFilter={selectedStatusFilter}
                  kategorien={kategorien}
                  teilnehmer={availableTeilnehmer}
                  onClearTeamFilter={handleClearTeamFilter}
                  onClearKategorieFilter={handleClearKategorieFilter}
                  onClearStatusFilter={handleClearStatusFilter}
                  onClearAll={handleClearAllFilters}
                />
                <ErinnerungListContent
                  erinnerungen={filteredByStatus}
                  einsatzId={einsatzId}
                  currentUserId={currentUserId}
                  showCreator={true}
                  compact={compact}
                  onCreateClick={handleCreateClick}
                  emptyMessage={isAnyFilterActive ? 'Keine Erinnerungen fuer diesen Filter' : 'Keine Team-Erinnerungen vorhanden'}
                />
              </div>
            ),
          },
        ]}
        defaultIndex={0}
      />
    </div>
  );
}

/**
 * Interne Hilfskomponente fuer die Erinnerungsliste innerhalb der Tabs.
 *
 * Rendert entweder die Liste der Erinnerungen oder einen Empty State.
 */
interface ErinnerungListContentProps {
  erinnerungen: ErinnerungResponseDto[];
  einsatzId: string;
  currentUserId?: string;
  showCreator: boolean;
  compact: boolean;
  onCreateClick: () => void;
  emptyMessage: string;
}

function ErinnerungListContent({ erinnerungen, einsatzId, currentUserId, showCreator, compact, onCreateClick, emptyMessage }: ErinnerungListContentProps) {
  if (erinnerungen.length === 0) {
    return (
      <div className={cn('rounded-panel border border-dashed border-border-subtle bg-surface-panel p-6 text-center', compact && 'p-4')}>
        <PiAlarm className="mx-auto h-8 w-8 text-text-muted" />
        <p className="mt-2 text-sm text-text-muted">{emptyMessage}</p>
        <Button size="sm" appearance="ghost" className="mt-3" onClick={onCreateClick}>
          <PiPlus className="mr-1 h-4 w-4" />
          Erinnerung erstellen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {erinnerungen.map((erinnerung) => (
        <ErinnerungCard key={erinnerung.id} erinnerung={erinnerung} einsatzId={einsatzId} showCreator={showCreator} currentUserId={currentUserId} />
      ))}
    </div>
  );
}
