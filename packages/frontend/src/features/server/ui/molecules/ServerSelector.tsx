/**
 * ServerSelector Molekül
 *
 * Dropdown-Komponente zur Auswahl und Verwaltung von Backend-Servern.
 * Zeigt den aktiven Server an und ermöglicht Wechsel zwischen Servern.
 *
 * **Features:**
 * - Server-Auswahl via Dropdown
 * - "Server hinzufügen" Option
 * - Aktionen pro Server (Neu einrichten, Löschen)
 * - Warnung bei Server-Wechsel wenn User eingeloggt ist
 *
 * @module features/server/ui/molecules/ServerSelector
 */

import { cn } from '@/shared/ui/cn';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { PiCaretUpDown, PiCheck, PiDotsThreeVertical, PiPlus, PiTrash, PiArrowsClockwise, PiGear } from 'react-icons/pi';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  /** Callback für "Server neu einrichten" (Re-Auth) */
  onReconfigureServer: (serverId: string) => void;
  /** Callback für "Server löschen" */
  onDeleteServer: (serverId: string) => void;
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
 * und bietet Verwaltungsoptionen (Hinzufügen, Neu einrichten, Löschen).
 */
export function ServerSelector({
  servers,
  activeServer,
  connectionStatus,
  onServerChange,
  onAddServer,
  onReconfigureServer,
  onDeleteServer,
  onManageServers,
  disabled = false,
  className,
  isAuthenticated = false,
  onLogoutAndSwitch,
}: ServerSelectorProps) {
  // State für das Aktionen-Menu (welcher Server's Menu ist offen)
  const [openMenuServerId, setOpenMenuServerId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Schließe Menu bei Klick außerhalb
  // Issue 1 Fix: Memory Leak Prevention mit mounted Flag
  useEffect(() => {
    if (!openMenuServerId) return;

    let mounted = true;

    const handleClickOutside = (e: MouseEvent) => {
      if (!mounted) return;
      const target = e.target as Node;
      const menuButton = menuButtonRefs.current.get(openMenuServerId);

      if (menuRef.current && !menuRef.current.contains(target) && menuButton && !menuButton.contains(target)) {
        if (mounted) {
          setOpenMenuServerId(null);
        }
      }
    };

    // Delay um den initialen Klick nicht zu fangen
    const timeoutId = setTimeout(() => {
      if (mounted) {
        document.addEventListener('mousedown', handleClickOutside);
      }
    }, 0);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuServerId]);

  // Schließe Menu bei Escape
  useEffect(() => {
    if (!openMenuServerId) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuServerId(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [openMenuServerId]);

  const handleMenuButtonClick = useCallback((e: React.MouseEvent | React.KeyboardEvent, serverId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const button = menuButtonRefs.current.get(serverId);
    if (button) {
      const rect = button.getBoundingClientRect();
      // Issue 6 Fix: Viewport Boundary Check für Menu-Positionierung
      const menuWidth = 192; // w-48
      const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
      setMenuPosition({
        top: rect.bottom + 4,
        left,
      });
    }

    setOpenMenuServerId((prev) => (prev === serverId ? null : serverId));
  }, []);

  const handleReconfigure = useCallback(
    (serverId: string) => {
      setOpenMenuServerId(null);
      onReconfigureServer(serverId);
    },
    [onReconfigureServer],
  );

  const handleDelete = useCallback(
    (serverId: string) => {
      setOpenMenuServerId(null);
      onDeleteServer(serverId);
    },
    [onDeleteServer],
  );

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
                className={cn('group relative cursor-pointer select-none py-3 pr-12 pl-4', 'text-gray-900 dark:text-gray-100', 'data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/20')}
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
                      <span className="absolute inset-y-0 right-10 flex items-center text-primary-600 dark:text-primary-400">
                        <PiCheck className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}

                    {/* Aktionen-Button - öffnet externes Menu */}
                    {/* Issue 3 + 9 Fix: Keyboard Navigation + ARIA Labels */}
                    <button
                      type="button"
                      ref={(el) => {
                        if (el) {
                          menuButtonRefs.current.set(server.id, el);
                        } else {
                          menuButtonRefs.current.delete(server.id);
                        }
                      }}
                      onClick={(e) => handleMenuButtonClick(e, server.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMenuButtonClick(e, server.id);
                        }
                      }}
                      onPointerDown={(e) => {
                        // Verhindert dass Listbox das Event als Selection interpretiert
                        e.stopPropagation();
                      }}
                      aria-label={`Aktionen für ${server.name}`}
                      aria-haspopup="menu"
                      aria-expanded={openMenuServerId === server.id}
                      className={cn(
                        'absolute inset-y-0 right-2 flex items-center',
                        'rounded-md p-1.5 text-gray-400 opacity-0 transition-opacity',
                        'hover:bg-gray-100 hover:text-gray-600',
                        'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary-500',
                        'group-hover:opacity-100 group-data-[focus]:opacity-100',
                        'dark:hover:bg-gray-700 dark:hover:text-gray-300',
                      )}
                    >
                      <PiDotsThreeVertical className="h-5 w-5" aria-hidden="true" />
                    </button>
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

      {/* Externes Aktionen-Menu - gerendert außerhalb der Listbox via Portal */}
      {openMenuServerId && menuPosition && (
        <div
          ref={menuRef}
          className={cn('fixed z-50 w-48 rounded-lg bg-white p-1 shadow-lg', 'border border-gray-200', 'dark:border-gray-700 dark:bg-gray-800')}
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
          }}
        >
          <button
            type="button"
            onClick={() => handleReconfigure(openMenuServerId)}
            className={cn('flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm', 'text-gray-700 dark:text-gray-200', 'hover:bg-gray-100 dark:hover:bg-gray-700')}
          >
            <PiArrowsClockwise className="h-4 w-4" />
            Neu einrichten
          </button>
          <button
            type="button"
            onClick={() => handleDelete(openMenuServerId)}
            className={cn('flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm', 'text-red-600 dark:text-red-400', 'hover:bg-red-50 dark:hover:bg-red-900/20')}
          >
            <PiTrash className="h-4 w-4" />
            Löschen
          </button>
        </div>
      )}

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
