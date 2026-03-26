/**
 * Dashboard Erinnerungen - Kompakte Listenansicht fuer das Einsatz-Dashboard
 *
 * Zeigt Erinnerungen in einer kompakten, urgency-gruppierten Liste.
 * Optimiert fuer die Dashboard-Seitenleiste mit hoher Informationsdichte.
 *
 * Unterschied zu PinnwandErinnerungen:
 * - Kein Filter-Toolbar (TeamFilter, KategorieFilter, StatusFilter, Sort)
 * - Keine PresetBar oder KategorieDashboard
 * - Schlanker Header, optimiert fuer Seitenleisten-Kontext
 * - Eigenstaendige Komponente fuer unabhaengige Weiterentwicklung
 */

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/shared/ui/atoms/button.atom';
import { cn } from '@/shared/ui/cn';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { PiAlarm, PiCaretDown, PiCaretRight, PiPlus, PiWifiHigh, PiWifiSlash } from 'react-icons/pi';
import { useCurrentUser } from '@/features/auth';
import { useEinsatzDetail } from '@/features/einsatz/api';
import { useErinnerungenByEinsatz } from '../../api';
import { useErinnerungWebSocket, useOfflineStatus, useReconnectSync, useTrayBadge, useTrayClickNavigation } from '../../hooks';
import { addAnimatedId, openQuickCreateDialog } from '../../stores';
import { compareErinnerungen } from '../../utils/sorting-utils';
import { isMyErinnerung } from '../../utils/erinnerung-ownership';
import { groupByUrgency, type UrgencyGroups } from '../../utils/urgency-grouping';
import { ErinnerungCard, type ErinnerungCardAccentColor, type ErinnerungCardVariant } from '../molecules/ErinnerungCard';
import { OfflineBanner } from '../molecules/OfflineBanner';

interface DashboardErinnerungenProps {
  /** Einsatz-ID fuer die Erinnerungen */
  einsatzId: string;
  /** Zusaetzliche CSS-Klassen */
  className?: string;
}

/**
 * Dashboard-Erinnerungen mit kompakter Urgency-Liste.
 *
 * Wrapper-Komponente mit User-Guard.
 * Delegiert an DashboardErinnerungenInner wenn User eingeloggt ist.
 */
export function DashboardErinnerungen({ einsatzId, className }: DashboardErinnerungenProps) {
  const { user } = useCurrentUser();

  if (!user) {
    return (
      <div className={cn('rounded-panel border border-status-warning-border bg-status-warning-surface p-4', className)}>
        <p className="text-sm text-status-warning-text">Bitte einloggen um Erinnerungen zu sehen</p>
      </div>
    );
  }

  return <DashboardErinnerungenInner einsatzId={einsatzId} className={className} currentUserId={user.id} />;
}

interface DashboardErinnerungenInnerProps extends DashboardErinnerungenProps {
  currentUserId: string;
}

/** Status-Set fuer Live-Einsaetze */
const LIVE_EINSATZ_STATUS = new Set(['IN_BEARBEITUNG', 'ANGELEGT']);

/** Swimlane-Konfiguration */
interface SwimlaneConfig {
  key: keyof UrgencyGroups;
  label: string;
  emoji: string;
  variant: ErinnerungCardVariant;
  accentColor: ErinnerungCardAccentColor;
  headerBg: string;
  headerText: string;
  badgeBg: string;
}

const SWIMLANE_CONFIGS: SwimlaneConfig[] = [
  {
    key: 'sofort',
    label: 'Sofort handeln',
    emoji: '\u{1F534}',
    variant: 'minimal',
    accentColor: 'red',
    headerBg: 'bg-status-danger-surface',
    headerText: 'text-status-danger-text',
    badgeBg: 'bg-status-danger-text text-text-inverse',
  },
  {
    key: 'aufmerksamkeit',
    label: 'Aufmerksamkeit',
    emoji: '\u{1F7E1}',
    variant: 'minimal',
    accentColor: 'amber',
    headerBg: 'bg-status-warning-surface',
    headerText: 'text-status-warning-text',
    badgeBg: 'bg-status-warning-text text-text-inverse',
  },
  {
    key: 'kontrolle',
    label: 'Unter Kontrolle',
    emoji: '\u{1F7E2}',
    variant: 'minimal',
    accentColor: 'green',
    headerBg: 'bg-status-success-surface',
    headerText: 'text-status-success-text',
    badgeBg: 'bg-status-success-text text-text-inverse',
  },
  {
    key: 'eingeplant',
    label: 'Eingeplant',
    emoji: '\u{1F535}',
    variant: 'minimal',
    accentColor: 'blue',
    headerBg: 'bg-status-info-surface',
    headerText: 'text-status-info-text',
    badgeBg: 'bg-status-info-text text-text-inverse',
  },
  {
    key: 'abgeschlossen',
    label: 'Abgeschlossen',
    emoji: '\u2B1C',
    variant: 'minimal',
    accentColor: 'gray',
    headerBg: 'bg-surface-raised',
    headerText: 'text-text-secondary',
    badgeBg: 'bg-surface-raised text-text-secondary',
  },
];

function DashboardErinnerungenInner({ einsatzId, className, currentUserId }: DashboardErinnerungenInnerProps) {
  const { data: erinnerungen, isLoading, error } = useErinnerungenByEinsatz({ einsatzId });

  // Einsatz-Status fuer bedingte Statistik-Invalidierung
  const { einsatz } = useEinsatzDetail(einsatzId);
  const isLiveEinsatz = einsatz?.status != null && LIVE_EINSATZ_STATUS.has(einsatz.status);

  // Offline-Status
  const { isOffline, pendingActionsCount, offlineSince } = useOfflineStatus();
  const { isSyncing } = useReconnectSync(einsatzId);

  // Tray-Badge und Navigation
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

  // WebSocket fuer Echtzeit-Updates
  const { isConnected } = useErinnerungWebSocket({
    einsatzId,
    enabled: true,
    showTeamToasts: true,
    invalidateStatistik: isLiveEinsatz,
    onCreated: handleWebSocketCreated,
    onUpdated: handleWebSocketUpdated,
    onAcknowledged: handleWebSocketAcknowledged,
  });

  const handleCreateClick = () => {
    openQuickCreateDialog(einsatzId);
  };

  // Sortierte Erinnerungen (Standard: nach Faelligkeit)
  const sortedErinnerungen = useMemo(() => {
    return [...(erinnerungen ?? [])].sort((a, b) => compareErinnerungen(a, b, { type: 'faelligkeit' }));
  }, [erinnerungen]);

  // Meine Erinnerungen
  const myErinnerungen = useMemo(() => {
    return sortedErinnerungen.filter((e) => isMyErinnerung(e, currentUserId));
  }, [sortedErinnerungen, currentUserId]);

  // Team: alle Erinnerungen
  const teamErinnerungen = useMemo(() => {
    return sortedErinnerungen;
  }, [sortedErinnerungen]);

  // Urgency-Gruppen
  const myGroups = useMemo(() => groupByUrgency(myErinnerungen), [myErinnerungen]);
  const teamGroups = useMemo(() => groupByUrgency(teamErinnerungen), [teamErinnerungen]);

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
      <OfflineBanner isOffline={isOffline} pendingCount={pendingActionsCount} isSyncing={isSyncing} offlineSince={offlineSince} className="mb-2 rounded-lg" />

      <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-panel">
        <TabGroup defaultIndex={0}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5">
            <div className="flex items-center gap-2">
              <PiAlarm className="h-4 w-4 text-status-danger-text" />
              <h3 className="text-sm font-semibold text-text-primary">Zeitkritisch</h3>
              {sortedErinnerungen.length > 0 && (
                <span className="rounded-full bg-status-danger-surface px-1.5 py-0.5 font-mono text-xs font-medium text-status-danger-text">{sortedErinnerungen.length}</span>
              )}
              <span
                className={cn('flex items-center gap-1 text-xs', isConnected ? 'text-status-success-text' : 'text-text-muted')}
                title={isConnected ? 'Echtzeit-Updates aktiv' : 'Verbindung unterbrochen'}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', isConnected ? 'animate-pulse bg-status-success-text' : 'bg-text-muted')} />
                {isConnected ? <PiWifiHigh className="hidden h-3 w-3 sm:inline" /> : <PiWifiSlash className="h-3 w-3" />}
              </span>
            </div>
            <Button size="sm" appearance="ghost" onClick={handleCreateClick} className="h-7 gap-0.5 px-2 text-xs">
              <PiPlus className="h-3 w-3" />
              Neu
            </Button>
          </div>

          {/* Tabs */}
          <div className="border-b border-border-subtle px-3 py-1.5">
            <TabList className="flex gap-1">
              <Tab
                className={({ selected }) =>
                  cn(
                    'cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                    selected ? 'bg-action-primary text-text-inverse' : 'text-text-secondary hover:bg-action-secondary hover:text-text-primary',
                  )
                }
              >
                Meine ({myErinnerungen.length})
              </Tab>
              <Tab
                className={({ selected }) =>
                  cn(
                    'cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                    selected ? 'bg-action-primary text-text-inverse' : 'text-text-secondary hover:bg-action-secondary hover:text-text-primary',
                  )
                }
              >
                Team ({teamErinnerungen.length})
              </Tab>
            </TabList>
          </div>

          <TabPanels>
            <TabPanel className="focus:outline-none">
              <CompactSwimlaneView
                groups={myGroups}
                einsatzId={einsatzId}
                currentUserId={currentUserId}
                showCreator={false}
                onCreateClick={handleCreateClick}
                emptyMessage="Du hast keine eigenen Erinnerungen"
              />
            </TabPanel>
            <TabPanel className="focus:outline-none">
              <CompactSwimlaneView
                groups={teamGroups}
                einsatzId={einsatzId}
                currentUserId={currentUserId}
                showCreator={true}
                onCreateClick={handleCreateClick}
                emptyMessage="Keine Team-Erinnerungen vorhanden"
              />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </div>
  );
}

/** Props fuer die kompakte Swimlane-Ansicht */
interface CompactSwimlaneViewProps {
  groups: UrgencyGroups;
  einsatzId: string;
  currentUserId: string;
  showCreator: boolean;
  onCreateClick: () => void;
  emptyMessage: string;
}

/** Swimlanes die per Klick auf den Header ein-/ausgeklappt werden können */
const COLLAPSIBLE_KEYS = new Set<keyof UrgencyGroups>(['eingeplant', 'abgeschlossen']);

/** Swimlanes die standardmaessig eingeklappt starten */
const DEFAULT_COLLAPSED_KEYS = new Set<keyof UrgencyGroups>(['abgeschlossen']);

/**
 * Kompakte Urgency-Swimlane-Ansicht fuer das Dashboard.
 *
 * Zeigt Erinnerungen in flachen, farbcodierten Gruppen.
 * "Eingeplant" und "Abgeschlossen" sind per Klick klappbar,
 * "Abgeschlossen" ist standardmaessig eingeklappt.
 */
function CompactSwimlaneView({ groups, einsatzId, currentUserId, showCreator, onCreateClick, emptyMessage }: CompactSwimlaneViewProps) {
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
    <div className="max-h-[60vh] divide-y divide-border-subtle overflow-y-auto">
      {SWIMLANE_CONFIGS.map((config) => {
        const items = groups[config.key];
        const isCollapsible = COLLAPSIBLE_KEYS.has(config.key);
        const isCollapsed = isCollapsible && collapsedKeys.has(config.key);
        const isAbgeschlossen = config.key === 'abgeschlossen';

        if (items.length === 0) return null;

        return (
          <div key={config.key}>
            {/* Swimlane Header */}
            {isCollapsible ? (
              <Button
                appearance="ghost"
                size="sm"
                className={cn('flex w-full items-center gap-1.5 rounded-none px-3 py-1.5 text-xs font-semibold', config.headerBg, config.headerText)}
                onClick={() => toggleCollapse(config.key)}
                aria-expanded={!isCollapsed}
              >
                {isCollapsed ? <PiCaretRight className="h-3 w-3" /> : <PiCaretDown className="h-3 w-3" />}
                <span>{config.emoji}</span>
                <span>{config.label}</span>
                <span className={cn('rounded-full px-1.5 py-0.5 font-mono text-[10px]', config.badgeBg)}>{items.length}</span>
              </Button>
            ) : (
              <div className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold', config.headerBg, config.headerText)}>
                <span>{config.emoji}</span>
                <span>{config.label}</span>
                <span className={cn('rounded-full px-1.5 py-0.5 font-mono text-[10px]', config.badgeBg)}>{items.length}</span>
              </div>
            )}

            {/* Cards */}
            {!isCollapsed && (
              <div className={cn('divide-y divide-border-subtle', isAbgeschlossen && 'opacity-60')}>
                {items.map((e) => (
                  <ErinnerungCard
                    key={e.id}
                    erinnerung={e}
                    einsatzId={einsatzId}
                    variant={config.variant}
                    accentColor={config.accentColor}
                    showCreator={showCreator}
                    currentUserId={currentUserId}
                    disableCardClick
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
