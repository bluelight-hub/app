/**
 * Pinnwand Erinnerungen - Urgency-basierte Swimlane-Ansicht
 *
 * Zeigt Erinnerungen gruppiert in 5 Urgency-Zonen (Priority Board Stil).
 *
 * Swimlanes:
 * 1. "Sofort handeln" (AUSGELOEST/ESKALIERT) - Rot
 * 2. "Aufmerksamkeit" (GEPLANT/SNOOZED, faellig in <= 5 Min) - Amber
 * 3. "Unter Kontrolle" (ACKNOWLEDGED) - Gruen
 * 4. "Eingeplant" (GEPLANT/SNOOZED, faellig in > 5 Min) - Blau
 * 5. "Abgeschlossen" (ERLEDIGT) - Grau, default eingeklappt
 */

import { useCurrentUser } from '@/features/auth';
import { useAktiveEinsatzTeilnehmer, useEinsatzDetail } from '@/features/einsatz/api';
import { useKategorienByEinsatz } from '@/features/kategorien';
import { Button } from '@/shared/ui/atoms/button.atom';
import { cn } from '@/shared/ui/cn';
import { sanitizeName } from '@/shared/utils/sanitize';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PiAlarm, PiBookmarkSimple, PiCaretDown, PiCaretUp, PiPlus, PiWifiHigh, PiWifiSlash } from 'react-icons/pi';
import { useErinnerungenByEinsatz } from '../../api';
import { useErinnerungWebSocket, useOfflineStatus, useReconnectSync, useTrayBadge, useTrayClickNavigation } from '../../hooks';
import {
  addAnimatedId,
  type KategorieFilterType,
  openQuickCreateDialog,
  resetKategorieFilterStore,
  resetStatusFilterStore,
  resetTeamFilterStore,
  setAvailableTeilnehmer,
  setKategorieFilter,
  setStatusFilter,
  setTeamFilter,
  setTeamSort,
  type StatusFilterType,
  type TeamFilterType,
  type TeamSortType,
  useAvailableTeilnehmer,
  useKategorieFilter,
  useStatusFilter,
  useTeamFilter,
  useTeamSort,
} from '../../stores';
import { isMyErinnerung } from '../../utils/erinnerung-ownership';
import { compareErinnerungen } from '../../utils/sorting-utils';
import { groupByUrgency, type UrgencyGroups } from '../../utils/urgency-grouping';
import { KategorieFilterDropdown, StatusFilterDropdown, TeamFilterDropdown, TeamSortDropdown } from '../atoms';
import { ActiveFiltersBar } from '../molecules/ActiveFiltersBar';
import { ErinnerungCard, type ErinnerungCardAccentColor, type ErinnerungCardVariant } from '../molecules/ErinnerungCard';
import { KategorieDashboard } from '../molecules/KategorieDashboard';
import { OfflineBanner } from '../molecules/OfflineBanner';
import { PresetBar } from '../molecules/PresetBar';
import { SavePresetDialog } from './SavePresetDialog';

interface PinnwandErinnerungenProps {
  /** Einsatz-ID fuer die Erinnerungen */
  einsatzId: string;
  /** Zusaetzliche CSS-Klassen */
  className?: string;
}

/**
 * Pinnwand-Erinnerungen mit Urgency-basierter Swimlane-Ansicht.
 *
 * Wrapper-Komponente mit User-Guard.
 * Delegiert an PinnwandErinnerungenInner wenn User eingeloggt ist.
 */
export function PinnwandErinnerungen({ einsatzId, className }: PinnwandErinnerungenProps) {
  const { user } = useCurrentUser();

  // Guard - User muss eingeloggt sein
  if (!user) {
    return (
      <div className={cn('rounded-panel border border-status-warning-border bg-status-warning-surface p-4', className)}>
        <p className="text-sm text-status-warning-text">Bitte einloggen um Erinnerungen zu sehen</p>
      </div>
    );
  }

  return <PinnwandErinnerungenInner einsatzId={einsatzId} className={className} currentUserId={user.id} />;
}

/** Props fuer die innere Pinnwand-Erinnerungen Komponente */
interface PinnwandErinnerungenInnerProps extends PinnwandErinnerungenProps {
  /** Garantiert non-null User-ID (nach Guard in Wrapper) */
  currentUserId: string;
}

/** Status-Set fuer Live-Einsaetze (bedingte Statistik-Invalidierung) */
const LIVE_EINSATZ_STATUS = new Set(['IN_BEARBEITUNG', 'ANGELEGT']);

/** Konfiguration fuer eine einzelne Swimlane */
interface SwimlaneConfig {
  key: keyof UrgencyGroups;
  label: string;
  emoji: string;
  variant: ErinnerungCardVariant;
  accentColor: ErinnerungCardAccentColor;
  headerBg: string;
  headerText: string;
  headerBorderColor: string;
  badgeBg: string;
  cardSpacing: string;
  /** Optionaler Status-Text rechts im Header */
  statusText?: string;
  /** Pulsierender Punkt vor dem Status-Text */
  statusPulse?: boolean;
  /** Farbe des Status-Texts */
  statusTextColor?: string;
}

/** Swimlane-Konfigurationen fuer alle 5 Urgency-Zonen */
const SWIMLANE_CONFIGS: SwimlaneConfig[] = [
  {
    key: 'sofort',
    label: 'Sofort handeln',
    emoji: '\u{1F534}',
    variant: 'full',
    accentColor: 'red',
    headerBg: 'bg-status-danger-surface',
    headerText: 'text-status-danger-text',
    headerBorderColor: 'border-status-danger-border',
    badgeBg: 'bg-status-danger-text text-text-inverse',
    cardSpacing: 'space-y-3',
    statusText: 'Aktive Alarme',
    statusPulse: true,
    statusTextColor: 'text-status-danger-text',
  },
  {
    key: 'aufmerksamkeit',
    label: 'Aufmerksamkeit',
    emoji: '\u{1F7E1}',
    variant: 'compact',
    accentColor: 'amber',
    headerBg: 'bg-status-warning-surface',
    headerText: 'text-status-warning-text',
    headerBorderColor: 'border-status-warning-border',
    badgeBg: 'bg-status-warning-text text-text-inverse',
    cardSpacing: 'space-y-2',
    statusText: 'Bald fällig',
    statusTextColor: 'text-status-warning-text',
  },
  {
    key: 'kontrolle',
    label: 'Unter Kontrolle',
    emoji: '\u{1F7E2}',
    variant: 'compact',
    accentColor: 'green',
    headerBg: 'bg-status-success-surface',
    headerText: 'text-status-success-text',
    headerBorderColor: 'border-status-success-border',
    badgeBg: 'bg-status-success-text text-text-inverse',
    cardSpacing: 'space-y-2',
    statusText: 'Bestätigt',
    statusTextColor: 'text-status-success-text',
  },
  {
    key: 'eingeplant',
    label: 'Eingeplant',
    emoji: '\u{1F535}',
    variant: 'compact',
    accentColor: 'blue',
    headerBg: 'bg-status-info-surface',
    headerText: 'text-status-info-text',
    headerBorderColor: 'border-status-info-border',
    badgeBg: 'bg-status-info-text text-text-inverse',
    cardSpacing: 'space-y-2',
    statusText: 'Geplant',
    statusTextColor: 'text-status-info-text',
  },
  {
    key: 'abgeschlossen',
    label: 'Abgeschlossen',
    emoji: '\u{26AA}',
    variant: 'minimal',
    accentColor: 'gray',
    headerBg: 'bg-surface-raised',
    headerText: 'text-text-muted',
    headerBorderColor: 'border-border-subtle',
    badgeBg: 'bg-text-muted text-text-inverse',
    cardSpacing: 'space-y-1',
  },
];

/**
 * Innere Komponente mit allen Hooks.
 *
 * Wird nur gerendert wenn User eingeloggt ist (currentUserId garantiert non-null).
 * Ermoeglicht saubere Hook-Aufrufe ohne bedingte Logik (React Rules of Hooks).
 */
function PinnwandErinnerungenInner({ einsatzId, className, currentUserId }: PinnwandErinnerungenInnerProps) {
  const { data: erinnerungen, isLoading, error } = useErinnerungenByEinsatz({ einsatzId });

  // Einsatz-Status fuer bedingte Statistik-Invalidierung (Query wird dedupliziert via TanStack)
  const { einsatz } = useEinsatzDetail(einsatzId);
  const isLiveEinsatz = einsatz?.status != null && LIVE_EINSATZ_STATUS.has(einsatz.status);

  // Team-Filter Store Hooks
  const selectedFilter = useTeamFilter();
  const availableTeilnehmer = useAvailableTeilnehmer();

  // Sort Store Hooks
  const selectedSort = useTeamSort();

  // Kategorie-Filter Store Hook
  const selectedKategorieFilter = useKategorieFilter();

  // Status-Filter Store Hook
  const selectedStatusFilter = useStatusFilter();

  // Teilnehmer aus Einsatz laden
  const { data: einsatzTeilnehmer } = useAktiveEinsatzTeilnehmer(einsatzId);

  // Kategorien aus Einsatz laden
  const { data: kategorien = [] } = useKategorienByEinsatz(einsatzId);

  /** Cleanup bei Unmount - Resettet die Filter Stores */
  useEffect(() => {
    return () => {
      resetTeamFilterStore();
      resetKategorieFilterStore();
      resetStatusFilterStore();
    };
  }, []);

  /** Primary Effect - Einsatz-Teilnehmer (hat Prioritaet) */
  useEffect(() => {
    if (einsatzTeilnehmer && einsatzTeilnehmer.length > 0) {
      const teilnehmerList = einsatzTeilnehmer.map((t) => ({
        id: t.userId,
        name: sanitizeName(t.username || `${t.personVorname} ${t.personNachname}`),
      }));
      setAvailableTeilnehmer(teilnehmerList);
    }
  }, [einsatzTeilnehmer]);

  /** Fallback Effect - Teilnehmer aus Erinnerungen */
  useEffect(() => {
    if ((!einsatzTeilnehmer || einsatzTeilnehmer.length === 0) && erinnerungen && erinnerungen.length > 0) {
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

  // Filter-Change Handler
  const handleFilterChange = useCallback((filter: TeamFilterType) => {
    setTeamFilter(filter);
  }, []);

  const handleSortChange = useCallback((sort: TeamSortType) => {
    setTeamSort(sort);
  }, []);

  const handleKategorieFilterChange = useCallback((filter: KategorieFilterType) => {
    setKategorieFilter(filter);
  }, []);

  const handleStatusFilterChange = useCallback((filter: StatusFilterType) => {
    setStatusFilter(filter);
  }, []);

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

  // Offline-Status und Sync-Handling
  const { isOffline, pendingActionsCount, offlineSince } = useOfflineStatus();
  const { isSyncing } = useReconnectSync(einsatzId);

  // Tray-Badge synchronisieren und Tray-Click Navigation
  useTrayBadge();
  useTrayClickNavigation(einsatzId);

  // Animation-Callbacks fuer WebSocket-Events
  const handleWebSocketCreated = useCallback((event: { erinnerungId: string }) => {
    addAnimatedId(event.erinnerungId, 'insert');
  }, []);

  const handleWebSocketUpdated = useCallback((event: { erinnerungId: string }) => {
    addAnimatedId(event.erinnerungId, 'update');
  }, []);

  const handleWebSocketAcknowledged = useCallback((event: { erinnerungId: string }) => {
    addAnimatedId(event.erinnerungId, 'update');
  }, []);

  // WebSocket fuer Echtzeit-Updates und Team-Toasts
  const { isConnected } = useErinnerungWebSocket({
    einsatzId,
    enabled: true,
    showTeamToasts: true,
    invalidateStatistik: isLiveEinsatz,
    onCreated: handleWebSocketCreated,
    onUpdated: handleWebSocketUpdated,
    onAcknowledged: handleWebSocketAcknowledged,
  });

  // SavePresetDialog State
  const [isSavePresetOpen, setIsSavePresetOpen] = useState(false);

  const handleCreateClick = () => {
    openQuickCreateDialog(einsatzId);
  };

  // Sortierte Erinnerungen
  const sortedErinnerungen = useMemo(() => {
    return [...(erinnerungen ?? [])].sort((a, b) => compareErinnerungen(a, b, selectedSort));
  }, [erinnerungen, selectedSort]);

  // Filter "Meine" Erinnerungen
  const myErinnerungen = useMemo(() => {
    return sortedErinnerungen.filter((e) => isMyErinnerung(e, currentUserId));
  }, [sortedErinnerungen, currentUserId]);

  // Team-Tab: alle Erinnerungen (Swimlanes zeigen ERLEDIGT in eigener Lane)
  const teamErinnerungen = useMemo(() => {
    return sortedErinnerungen;
  }, [sortedErinnerungen]);

  // Gefilterte Team-Erinnerungen basierend auf selectedFilter
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
        return base.filter((e) => (e.assignedToId as string | null | undefined) === selectedFilter.userId);
    }
  }, [teamErinnerungen, selectedFilter, currentUserId]);

  // Gefilterte Erinnerungen basierend auf Kategorie-Filter
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

  // Gefilterte Erinnerungen basierend auf Status-Filter
  const filteredByStatus = useMemo(() => {
    switch (selectedStatusFilter.type) {
      case 'all':
        return filteredByKategorie;
      case 'status':
        return filteredByKategorie.filter((e) => e.status === selectedStatusFilter.status);
    }
  }, [filteredByKategorie, selectedStatusFilter]);

  // Swimlane-Gruppen fuer Meine-Tab
  const myGroups = useMemo(() => groupByUrgency(myErinnerungen), [myErinnerungen]);

  // Swimlane-Gruppen fuer Team-Tab (nach allen Filtern)
  const filteredGroups = useMemo(() => groupByUrgency(filteredByStatus), [filteredByStatus]);

  /** Ist einer der Filter aktiv? */
  const isAnyFilterActive = selectedFilter.type !== 'all' || selectedKategorieFilter.type !== 'all' || selectedStatusFilter.type !== 'all';

  if (isLoading) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="h-20 rounded-lg bg-surface-raised" />
        <div className="mt-2 h-20 rounded-lg bg-surface-raised" />
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
    <div className={cn('flex flex-col', className)}>
      {/* Offline-Banner */}
      <OfflineBanner isOffline={isOffline} pendingCount={pendingActionsCount} isSyncing={isSyncing} offlineSince={offlineSince} className="mb-2 rounded-lg" />

      {/* SavePresetDialog */}
      <SavePresetDialog
        isOpen={isSavePresetOpen}
        onClose={() => setIsSavePresetOpen(false)}
        teilnehmerMap={new Map(availableTeilnehmer.map((t) => [t.id, t.name]))}
        kategorienMap={new Map(kategorien.map((k) => [k.id, k.name]))}
      />

      {/* Einheitlicher Container */}
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-panel">
        <TabGroup defaultIndex={0}>
          {/* Header */}
          <div className="flex flex-col gap-3 border-b border-border-subtle px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <PiAlarm className="h-5 w-5 text-status-danger-text" />
                <span className="absolute -top-1 -right-1.5 h-2 w-2 animate-pulse rounded-full bg-status-danger-text" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-text-primary">Erinnerungen</h3>
              {sortedErinnerungen.length > 0 && (
                <span className="rounded-full bg-status-danger-surface px-2 py-0.5 font-mono text-xs font-semibold text-status-danger-text">{sortedErinnerungen.length}</span>
              )}
              <span
                className={cn('flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs', isConnected ? 'bg-status-success-surface text-status-success-text' : 'bg-surface-raised text-text-muted')}
                title={isConnected ? 'Echtzeit-Updates aktiv' : 'Verbindung unterbrochen'}
              >
                {isConnected ? <PiWifiHigh className="h-3 w-3" /> : <PiWifiSlash className="h-3 w-3" />}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <TabList className="flex items-center gap-1 rounded-lg bg-action-secondary p-0.5">
                <Tab
                  className={({ selected }) =>
                    cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', selected ? 'bg-surface-panel text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary')
                  }
                >
                  Meine <span className="ml-1 font-mono text-xs text-text-muted">({myErinnerungen.length})</span>
                </Tab>
                <Tab
                  className={({ selected }) =>
                    cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', selected ? 'bg-surface-panel text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary')
                  }
                >
                  Team <span className="ml-1 font-mono text-xs text-text-muted">({teamErinnerungen.length})</span>
                </Tab>
              </TabList>
              <Button size="sm" appearance="ghost" onClick={handleCreateClick}>
                <PiPlus className="mr-1 h-4 w-4" />
                Neu
              </Button>
            </div>
          </div>

          <TabPanels>
            <TabPanel className="focus:outline-none">
              <SwimlaneView
                groups={myGroups}
                einsatzId={einsatzId}
                currentUserId={currentUserId}
                showCreator={false}
                onCreateClick={handleCreateClick}
                emptyMessage="Du hast keine eigenen Erinnerungen"
              />
            </TabPanel>
            <TabPanel className="focus:outline-none">
              <div className="space-y-3 p-3">
                {/* PresetBar oberhalb der Filter-Dropdowns */}
                <PresetBar />
                {/* KategorieDashboard zwischen PresetBar und Filter-Dropdowns */}
                <KategorieDashboard erinnerungen={erinnerungen ?? []} kategorien={kategorien} />
                {/* Filter & Sort Dropdowns im Team-Tab Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <TeamFilterDropdown selectedFilter={selectedFilter} onFilterChange={handleFilterChange} teilnehmer={availableTeilnehmer} currentUserId={currentUserId} className="w-44" />
                    <KategorieFilterDropdown selectedFilter={selectedKategorieFilter} onFilterChange={handleKategorieFilterChange} kategorien={kategorien} className="w-44" />
                    <StatusFilterDropdown selectedFilter={selectedStatusFilter} onFilterChange={handleStatusFilterChange} />
                    <TeamSortDropdown selectedSort={selectedSort} onSortChange={handleSortChange} className="w-36" />
                    {/* "Preset speichern" Button - nur wenn mindestens ein Filter aktiv */}
                    {isAnyFilterActive && (
                      <Button size="sm" appearance="ghost" onClick={() => setIsSavePresetOpen(true)} aria-label="Filter als Preset speichern">
                        <PiBookmarkSimple className="mr-1 h-4 w-4" />
                        Speichern
                      </Button>
                    )}
                  </div>
                  {/* Anzeige der gefilterten Anzahl bei aktivem Filter */}
                  {isAnyFilterActive && (
                    <span className="text-xs text-text-muted">
                      {filteredByStatus.length} von {teamErinnerungen.length}
                    </span>
                  )}
                </div>
                {/* Aktive Filter als Chips anzeigen */}
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
                {/* Swimlane-Ansicht fuer Team-Erinnerungen */}
                <SwimlaneView
                  groups={filteredGroups}
                  einsatzId={einsatzId}
                  currentUserId={currentUserId}
                  showCreator={true}
                  onCreateClick={handleCreateClick}
                  emptyMessage={isAnyFilterActive ? 'Keine Erinnerungen fuer diesen Filter' : 'Keine Team-Erinnerungen vorhanden'}
                />
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </div>
  );
}

/** Props fuer die Swimlane-Ansicht */
interface SwimlaneViewProps {
  groups: UrgencyGroups;
  einsatzId: string;
  currentUserId: string;
  showCreator: boolean;
  onCreateClick: () => void;
  emptyMessage: string;
}

/** Swimlanes die per Klick auf den Header ein-/ausgeklappt werden koennen */
const COLLAPSIBLE_KEYS = new Set<keyof UrgencyGroups>(['eingeplant', 'abgeschlossen']);

/** Swimlanes die standardmaessig eingeklappt starten */
const DEFAULT_COLLAPSED_KEYS = new Set<keyof UrgencyGroups>(['abgeschlossen']);

/**
 * Urgency-basierte Swimlane-Ansicht (Priority Board Stil).
 *
 * Zeigt Erinnerungen gruppiert in 5 farbcodierten Swimlanes.
 * "Eingeplant" und "Abgeschlossen" sind per Klick klappbar,
 * "Abgeschlossen" ist standardmaessig eingeklappt.
 */
function SwimlaneView({ groups, einsatzId, currentUserId, showCreator, onCreateClick, emptyMessage }: SwimlaneViewProps) {
  const [collapsedKeys, setCollapsedKeys] = useState<Set<keyof UrgencyGroups>>(() => new Set(DEFAULT_COLLAPSED_KEYS));

  const toggleCollapse = useCallback((key: keyof UrgencyGroups) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const totalCount = groups.sofort.length + groups.aufmerksamkeit.length + groups.kontrolle.length + groups.eingeplant.length + groups.abgeschlossen.length;

  if (totalCount === 0) {
    return (
      <div className="p-6 text-center">
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
    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
      {SWIMLANE_CONFIGS.map((config) => {
        const items = groups[config.key];
        const isCollapsible = COLLAPSIBLE_KEYS.has(config.key);
        const isCollapsed = isCollapsible && collapsedKeys.has(config.key);
        const isAbgeschlossen = config.key === 'abgeschlossen';

        if (items.length === 0) return null;

        return (
          <div key={config.key} className="border-b border-border-subtle">
            {/* Swimlane Header - Sticky mit Separator */}
            {isCollapsible ? (
              <button
                type="button"
                className={cn(
                  'sticky top-0 z-10 flex w-full cursor-pointer items-center justify-between border-b px-5 py-2.5 transition-colors',
                  config.headerBg,
                  config.headerBorderColor,
                  isAbgeschlossen ? 'hover:bg-action-secondary' : 'hover:brightness-95',
                )}
                onClick={() => toggleCollapse(config.key)}
                aria-expanded={!isCollapsed}
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn('text-base', isAbgeschlossen && 'opacity-60')}>{config.emoji}</span>
                  <h2 className={cn('text-sm font-bold tracking-wider uppercase', config.headerText)}>{config.label}</h2>
                  <span className={cn('min-w-[20px] rounded-full px-1.5 py-0.5 text-center font-mono text-xs font-bold', config.badgeBg)}>{items.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  {!isAbgeschlossen && config.statusText && <span className={cn('text-xs font-medium', config.statusTextColor)}>{config.statusText}</span>}
                  {isCollapsed ? <PiCaretDown className="h-4 w-4 text-text-muted" /> : <PiCaretUp className="h-4 w-4 text-text-muted" />}
                </div>
              </button>
            ) : (
              <div className={cn('sticky top-0 z-10 flex items-center justify-between border-b px-5 py-2.5', config.headerBg, config.headerBorderColor)}>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{config.emoji}</span>
                  <h2 className={cn('text-sm font-bold tracking-wider uppercase', config.headerText)}>{config.label}</h2>
                  <span className={cn('min-w-[20px] rounded-full px-1.5 py-0.5 text-center font-mono text-xs font-bold', config.badgeBg)}>{items.length}</span>
                </div>
                {config.statusText && (
                  <span className={cn('flex items-center gap-1 text-xs font-medium', config.statusTextColor)}>
                    {config.statusPulse && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-danger-text" />}
                    {config.statusText}
                  </span>
                )}
              </div>
            )}

            {/* Cards */}
            {!isCollapsed && (
              <div className={cn('divide-y divide-border-subtle px-4 py-2', isAbgeschlossen && 'opacity-60')}>
                {items.map((e) => (
                  <div key={e.id} className="py-1.5">
                    <ErinnerungCard erinnerung={e} einsatzId={einsatzId} variant={config.variant} accentColor={config.accentColor} showCreator={showCreator} currentUserId={currentUserId} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
