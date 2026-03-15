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
      return 'bg-green-500';
    case 'checking':
      return 'bg-yellow-500 animate-pulse';
    case 'disconnected':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

/**
 * ServerSelector Komponente
 *
 * Ermöglicht die Auswahl zwischen konfigurierten Servern
 * und bietet Verwaltungsoptionen (Hinzufügen, Server verwalten).
 */
export function ServerSelector({
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
            className={cn(
              'relative w-full cursor-pointer rounded-lg border-2 bg-white py-3 pr-10 pl-4 text-left',
              'transition-all duration-200',
              'border-gray-200 hover:border-gray-300',
              'focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20',
              'dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600',
              'dark:focus:border-primary-400 dark:focus:ring-primary-400/20',
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
                    <span
                      className={cn('absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full ring-2 ring-white dark:ring-gray-900', getStatusColor(connectionStatus?.get(activeServer.id)))}
                      aria-hidden="true"
                    />
                  </div>
                  <span className="block truncate font-medium text-gray-900 dark:text-white">{activeServer.name}</span>
                  <span className="ml-auto truncate text-gray-500 text-sm dark:text-gray-400">{getHostSafe(activeServer.url) ?? 'Unbekannt'}</span>
                </>
              ) : (
                <span className="block text-gray-500 dark:text-gray-400">Server auswählen...</span>
              )}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <PiCaretUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </ListboxButton>

          <ListboxOptions
            transition
            className={cn(
              'absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg',
              'border border-gray-200',
              'focus:outline-none',
              'data-[closed]:opacity-0 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in',
              'dark:border-gray-700 dark:bg-gray-800',
            )}
          >
            {sortedServers.map((server) => (
              <ListboxOption
                key={server.id}
                value={server}
                className={cn('relative cursor-pointer select-none py-3 pr-10 pl-4', 'text-gray-900 dark:text-gray-100', 'data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/20')}
              >
                {({ selected }) => (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Server Visual Badge mit Status-Overlay */}
                      <div className="relative flex-shrink-0">
                        <ServerVisualBadge server={server} size="sm" />
                        {/* Status-Indikator als Overlay unten-rechts */}
                        <span
                          className={cn('absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full ring-2 ring-white dark:ring-gray-800', getStatusColor(connectionStatus?.get(server.id)))}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn('block truncate', selected ? 'font-semibold' : 'font-medium')}>{server.name}</span>
                          {connectionStatus?.get(server.id) === 'disconnected' && <span className="flex-shrink-0 text-gray-500 text-sm">Offline</span>}
                        </div>
                        <span className="block truncate text-gray-500 text-sm dark:text-gray-400">{getHostSafe(server.url) ?? 'Unbekannt'}</span>
                      </div>
                    </div>

                    {/* Check Icon für ausgewählten Server */}
                    {selected && (
                      <span className="absolute inset-y-0 right-3 flex items-center text-primary-600 dark:text-primary-400">
                        <PiCheck className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </div>
                )}
              </ListboxOption>
            ))}

            {/* Separator */}
            <div className="mx-2 my-1 border-gray-200 border-t dark:border-gray-700" />

            {/* Server hinzufügen */}
            <button
              type="button"
              onClick={onAddServer}
              className={cn('flex w-full cursor-pointer items-center gap-3 px-4 py-3', 'text-primary-600 dark:text-primary-400', 'hover:bg-primary-50 dark:hover:bg-primary-900/20')}
            >
              <PiPlus className="h-5 w-5" />
              <span className="font-medium">Server hinzufügen</span>
            </button>

            {/* Server verwalten - nur anzeigen wenn Callback vorhanden */}
            {onManageServers && (
              <button
                type="button"
                onClick={onManageServers}
                className={cn('flex w-full cursor-pointer items-center gap-3 px-4 py-3', 'text-gray-700 dark:text-gray-300', 'hover:bg-gray-50 dark:hover:bg-gray-700/50')}
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
