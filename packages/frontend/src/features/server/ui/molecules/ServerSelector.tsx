/**
 * ServerSelector Molekül
 *
 * Dropdown-Komponente zur Auswahl und Verwaltung von Backend-Servern.
 * Zeigt den aktiven Server an und ermöglicht Wechsel zwischen Servern.
 *
 * **Features:**
 * - Server-Auswahl via Dropdown
 * - "Server hinzufügen" Option
 * - Warnung bei Server-Wechsel wenn User eingeloggt ist
 *
 * @module features/server/ui/molecules/ServerSelector
 */

import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/shared/ui/cn';
import { PiCaretUpDown, PiCheck, PiPlus, PiGear } from 'react-icons/pi';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
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
 * und bietet Verwaltungsoptionen zum Hinzufügen oder Öffnen der Übersicht.
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
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightedServerIndex, setHighlightedServerIndex] = useState(-1);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

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

  const updateHighlightedFromActiveServer = useCallback(() => {
    if (sortedServers.length === 0) {
      setHighlightedServerIndex(-1);
      return;
    }

    const activeIndex = sortedServers.findIndex((server) => server.id === activeServer?.id);
    setHighlightedServerIndex(activeIndex >= 0 ? activeIndex : 0);
  }, [activeServer?.id, sortedServers]);

  useEffect(() => {
    if (open) {
      updateHighlightedFromActiveServer();
    }
  }, [open, updateHighlightedFromActiveServer]);

  useEffect(() => {
    setPortalContainer(rootRef.current?.closest('.auth-theme'));
  }, []);

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
        setOpen(false);
        return;
      }

      // Sonst normaler Server-Wechsel
      onServerChange(server.id);
      setOpen(false);
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

  const handleTriggerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();

        if (!open) {
          setOpen(true);
          updateHighlightedFromActiveServer();
          return;
        }

        if (sortedServers.length === 0) return;

        setHighlightedServerIndex((current) => {
          if (current < 0) return 0;
          if (event.key === 'ArrowDown') {
            return current === sortedServers.length - 1 ? 0 : current + 1;
          }
          return current === 0 ? sortedServers.length - 1 : current - 1;
        });
      }

      if (event.key === 'Enter' && open && highlightedServerIndex >= 0) {
        event.preventDefault();
        const targetServer = sortedServers[highlightedServerIndex];
        if (targetServer) {
          handleChange(targetServer);
        }
      }

      if (event.key === 'Escape' && open) {
        event.preventDefault();
        setOpen(false);
      }
    },
    [disabled, handleChange, highlightedServerIndex, open, sortedServers, updateHighlightedFromActiveServer],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
        updateHighlightedFromActiveServer();
      }
    },
    [updateHighlightedFromActiveServer],
  );

  return (
    <div ref={rootRef} className={cn('w-full', className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            onKeyDown={handleTriggerKeyDown}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'relative h-10 w-full justify-between rounded-md px-3 pr-10 text-left font-normal text-sm shadow-sm',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <span className="flex min-w-0 items-center gap-3">
              {activeServer ? (
                <>
                  <div className="relative flex-shrink-0">
                    <ServerVisualBadge server={activeServer} size="sm" />
                    <span
                      className={cn('absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full ring-2 ring-white dark:ring-gray-900', getStatusColor(connectionStatus?.get(activeServer.id)))}
                      aria-hidden="true"
                    />
                  </div>
                  <span className="truncate font-medium text-foreground">{activeServer.name}</span>
                  <span className="ml-auto truncate text-muted-foreground text-xs">{getHostSafe(activeServer.url) ?? 'Unbekannt'}</span>
                </>
              ) : (
                <span className="truncate text-muted-foreground">Server auswählen...</span>
              )}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <PiCaretUpDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </span>
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-1"
          align="start"
          portalProps={portalContainer ? { container: portalContainer } : undefined}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList>
              <CommandGroup>
                {sortedServers.map((server, index) => {
                  const isSelected = server.id === activeServer?.id;
                  const isHighlighted = highlightedServerIndex === index;
                  return (
                    <CommandItem
                      key={server.id}
                      value={`${server.name} ${server.url} ${server.id}`}
                      role="option"
                      aria-selected={isSelected}
                      className={cn('group justify-between gap-2 rounded-md px-2 py-2', isHighlighted && 'bg-accent text-accent-foreground')}
                      onMouseEnter={() => setHighlightedServerIndex(index)}
                      onSelect={() => handleChange(server)}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <ServerVisualBadge server={server} size="sm" />
                          <span
                            className={cn('absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full ring-2 ring-white dark:ring-gray-800', getStatusColor(connectionStatus?.get(server.id)))}
                            aria-hidden="true"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn('block truncate', isSelected ? 'font-semibold' : 'font-medium')}>{server.name}</span>
                            {connectionStatus?.get(server.id) === 'disconnected' && <span className="flex-shrink-0 text-muted-foreground text-xs">Offline</span>}
                          </div>
                          <span className="block truncate text-muted-foreground text-xs">{getHostSafe(server.url) ?? 'Unbekannt'}</span>
                        </div>
                      </div>

                      {isSelected && <PiCheck className="h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              <CommandSeparator />

              <div className="space-y-1 p-1">
                <button type="button" onClick={onAddServer} className={cn('flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-primary text-sm', 'hover:bg-accent')}>
                  <PiPlus className="h-4 w-4" />
                  <span className="font-medium">Server hinzufügen</span>
                </button>

                {onManageServers && (
                  <button type="button" onClick={onManageServers} className={cn('flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-foreground text-sm', 'hover:bg-accent')}>
                    <PiGear className="h-4 w-4" />
                    <span className="font-medium">Server verwalten</span>
                  </button>
                )}
              </div>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

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
