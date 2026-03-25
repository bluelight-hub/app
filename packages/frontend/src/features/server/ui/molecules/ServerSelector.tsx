/**
 * ServerSelector Molekül
 *
 * Dropdown-Komponente zur Auswahl und Verwaltung von Backend-Servern.
 * Zeigt den aktiven Server an und ermöglicht Wechsel zwischen Servern.
 *
 * **Features:**
 * - Server-Auswahl via Dropdown
 * - "Server hinzufügen" Option
 * - Direkter Wechsel zur Server-Verwaltung
 * - Warnung bei Server-Wechsel wenn User eingeloggt ist
 *
 * @module features/server/ui/molecules/ServerSelector
 */

import { cn } from '@/shared/ui/cn';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { PiCaretUpDown, PiCheck, PiPlus, PiGear } from 'react-icons/pi';
import { useState, useCallback, useMemo } from 'react';
import type { ServerConfig, ConnectionStatus } from '../../types/server-config';
import { sortServersByLastUsed } from '../../stores/server.store';
import { getHostSafe } from '../../utils/url';
import { ServerSwitchWarningDialog } from './ServerSwitchWarningDialog';
import { ServerVisualBadge } from '../atoms/ServerVisualBadge';

export interface ServerSelectorProps {
  /** Optionale ID für den Trigger-Button */
  buttonId?: string;
  /** Liste aller konfigurierten Server */
  servers: ServerConfig[];
  /** Aktuell ausgewählter Server */
  activeServer: ServerConfig | null;
  /** Connection Status Map für Status-Indikatoren */
  connectionStatus?: Map<string, ConnectionStatus>;
  /** Callback bei Server-Wechsel */
  onServerChange: (serverId: string) => void;
  /** Callback für "Server hinzufügen" */
  onAddServer: () => void;
  /** Callback für "Server verwalten" (öffnet Verwaltungs-Seite) */
  onManageServers?: () => void;
  /** Deaktiviert die Komponente */
  disabled?: boolean;
  /** Zusätzliche CSS-Klassen */
  className?: string;
  /**
   * Ob der User aktuell eingeloggt ist.
   * Wenn true, wird bei Server-Wechsel ein Warndialog angezeigt.
   */
  isAuthenticated?: boolean;
  /**
   * Callback für Logout und Server-Wechsel.
   * Wird aufgerufen wenn User im Warndialog bestätigt.
   * Muss Logout durchführen, dann Server wechseln.
   */
  onLogoutAndSwitch?: (targetServerId: string) => Promise<void>;
}

/**
 * Gibt die Farbe des Status-Indikators zurück.
 */
function getStatusColor(status: ConnectionStatus | undefined): string {
  switch (status) {
    case 'connected':
      return 'bg-status-success-text';
    case 'checking':
      return 'bg-status-warning-text animate-pulse';
    case 'disconnected':
      return 'bg-status-danger-text';
    default:
      return 'bg-text-muted';
  }
}

/**
 * ServerSelector Komponente
 *
 * Ermöglicht die Auswahl zwischen konfigurierten Servern
 * und bietet Verwaltungsoptionen (Hinzufügen, Server verwalten).
 */
export function ServerSelector({
  buttonId,
  servers,
  activeServer,
  connectionStatus,
  onServerChange,
  onAddServer,
  onManageServers,
  disabled = false,
  className,
  isAuthenticated = false,
  onLogoutAndSwitch,
}: ServerSelectorProps) {
  // State für Server-Wechsel-Warndialog
  const [switchTargetId, setSwitchTargetId] = useState<string | null>(null);
  const [isSwitchLoading, setIsSwitchLoading] = useState(false);

  /**
   * Sortiert Server nach lastUsedAt (zuletzt verwendet zuerst).
   * Server ohne lastUsedAt erscheinen am Ende der Liste.
   * Memoized um unnötige Re-Sortierung bei jedem Render zu vermeiden.
   * Nutzt zentrale sortServersByLastUsed() Funktion aus dem Store für konsistente Sortierung.
   */
  const sortedServers = useMemo(() => sortServersByLastUsed(servers), [servers]);

  /**
   * Handler für Server-Auswahl.
   * Zeigt Warndialog wenn User eingeloggt ist und Server wechselt.
   */
  const handleChange = useCallback(
    (server: ServerConfig | null) => {
      if (!server) return;

      // Wenn gleicher Server ausgewählt, nichts tun
      if (server.id === activeServer?.id) return;

      // Wenn User eingeloggt ist und onLogoutAndSwitch vorhanden,
      // zeige Warndialog statt direktem Wechsel
      if (isAuthenticated && onLogoutAndSwitch) {
        setSwitchTargetId(server.id);
        return;
      }

      // Sonst normaler Server-Wechsel
      onServerChange(server.id);
    },
    [activeServer?.id, isAuthenticated, onLogoutAndSwitch, onServerChange],
  );

  /**
   * Handler für Bestätigung im Warndialog.
   * Führt Logout durch und wechselt dann den Server.
   */
  const handleSwitchConfirm = useCallback(async () => {
    if (!switchTargetId || !onLogoutAndSwitch) return;

    setIsSwitchLoading(true);
    try {
      await onLogoutAndSwitch(switchTargetId);
    } finally {
      setIsSwitchLoading(false);
      setSwitchTargetId(null);
    }
  }, [switchTargetId, onLogoutAndSwitch]);

  /**
   * Handler für Abbruch im Warndialog.
   */
  const handleSwitchCancel = useCallback(() => {
    setSwitchTargetId(null);
  }, []);

  // Target-Server für den Dialog (memoized)
  const switchTargetServer = useMemo(() => {
    if (!switchTargetId) return null;
    return servers.find((s) => s.id === switchTargetId) ?? null;
  }, [switchTargetId, servers]);

  return (
    <div className={cn('w-full', className)}>
      <Listbox as="div" value={activeServer} onChange={handleChange} disabled={disabled}>
        <div className="relative">
          <ListboxButton
            id={buttonId}
            className={cn(
              'relative w-full cursor-pointer rounded-control border bg-surface-panel py-3 pr-10 pl-4 text-left',
              'transition-all duration-200',
              'border-border-subtle hover:border-border-subtle',
              'focus:border-action-primary focus:outline-none focus-visible:shadow-focus-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <span className="flex items-center gap-3">
              {activeServer ? (
                <>
                  {/* Server Visual Badge mit Status-Overlay */}
                  <div className="relative flex-shrink-0">
                    <ServerVisualBadge server={activeServer} size="sm" />
                    {/* Status-Indikator als Overlay unten-rechts */}
                    <span className={cn('absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full ring-2 ring-surface-panel', getStatusColor(connectionStatus?.get(activeServer.id)))} aria-hidden="true" />
                  </div>
                  <span className="block truncate font-medium text-text-primary">{activeServer.name}</span>
                  <span className="ml-auto truncate text-sm text-text-muted">{getHostSafe(activeServer.url) ?? 'Unbekannt'}</span>
                </>
              ) : (
                <span className="block text-text-muted">Server auswählen...</span>
              )}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <PiCaretUpDown className="h-5 w-5 text-text-muted" aria-hidden="true" />
            </span>
          </ListboxButton>

          <ListboxOptions
            transition
            className={cn(
              'absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-panel bg-surface-panel py-1 shadow-panel',
              'border border-border-subtle',
              'focus:outline-none',
              'data-[closed]:opacity-0 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in',
            )}
          >
            {sortedServers.map((server) => (
              <ListboxOption key={server.id} value={server} className={cn('relative cursor-pointer py-3 pr-10 pl-4 select-none', 'text-text-primary', 'data-[focus]:bg-primary-50')}>
                {({ selected }) => (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Server Visual Badge mit Status-Overlay */}
                      <div className="relative flex-shrink-0">
                        <ServerVisualBadge server={server} size="sm" />
                        {/* Status-Indikator als Overlay unten-rechts */}
                        <span className={cn('absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full ring-2 ring-surface-panel', getStatusColor(connectionStatus?.get(server.id)))} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn('block truncate', selected ? 'font-semibold' : 'font-medium')}>{server.name}</span>
                          {connectionStatus?.get(server.id) === 'disconnected' && <span className="flex-shrink-0 text-sm text-text-muted">Offline</span>}
                        </div>
                        <span className="block truncate text-sm text-text-muted">{getHostSafe(server.url) ?? 'Unbekannt'}</span>
                      </div>
                    </div>

                    {/* Check Icon für ausgewählten Server */}
                    {selected && (
                      <span className="absolute inset-y-0 right-3 flex items-center text-action-primary">
                        <PiCheck className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </div>
                )}
              </ListboxOption>
            ))}

            {/* Separator */}
            <div className="mx-2 my-1 border-t border-border-subtle" />

            {/* Server hinzufügen */}
            <button type="button" onClick={onAddServer} className={cn('flex w-full cursor-pointer items-center gap-3 px-4 py-3', 'text-action-primary', 'hover:bg-primary-50')}>
              <PiPlus className="h-5 w-5" />
              <span className="font-medium">Server hinzufügen</span>
            </button>

            {/* Server verwalten - nur anzeigen wenn Callback vorhanden */}
            {onManageServers && (
              <button
                type="button"
                onClick={onManageServers}
                className={cn('flex w-full cursor-pointer items-center gap-3 px-4 py-3', 'text-text-secondary', 'hover:bg-action-secondary hover:text-text-primary')}
              >
                <PiGear className="h-5 w-5" />
                <span className="font-medium">Server verwalten</span>
              </button>
            )}
          </ListboxOptions>
        </div>
      </Listbox>

      {/* Server-Wechsel Warndialog - nur wenn User eingeloggt ist */}
      {activeServer && switchTargetServer && (
        <ServerSwitchWarningDialog
          currentServer={activeServer}
          targetServer={switchTargetServer}
          open={!!switchTargetId}
          onConfirm={handleSwitchConfirm}
          onCancel={handleSwitchCancel}
          isLoading={isSwitchLoading}
        />
      )}
    </div>
  );
}
