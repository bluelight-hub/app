/**
 * ServerListItem Molecule
 *
 * Zeigt einen einzelnen Server in der Server-Liste an.
 * Kombiniert ServerVisualBadge, ServerStatusDot, Server-Informationen, Badge und Aktionen.
 *
 * **Layout:**
 * - Desktop: Flex-Row mit Visual Badge (Icon/Farbe + Status-Overlay), Name/URL, Badge und Actions
 * - Mobile: Gestapelt mit Visual Badge + Name oben, URL und Actions darunter
 *
 * **Features:**
 * - ServerVisualBadge zeigt Server-Icon und Farbe
 * - ServerStatusDot als Overlay zeigt Verbindungsstatus
 * - "Zuletzt verwendet" Badge für aktiven Server
 * - Hover-State für bessere Interaktivität
 * - Optional: Edit- und Delete-Actions
 *
 * @module features/server/ui/molecules/ServerListItem
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { forwardRef } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { PiPencilSimple, PiTrash } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import type { ConnectionStatus, ServerConfig } from '../../types/server-config';
import { ServerStatusDot } from '../atoms/ServerStatusDot';
import { ServerVisualBadge } from '../atoms/ServerVisualBadge';

/**
 * Props für die ServerListItem Komponente.
 */
export interface ServerListItemProps {
  /**
   * Die Server-Konfiguration mit allen relevanten Daten.
   */
  server: ServerConfig;
  /**
   * Gibt an, ob dieser Server der aktuell aktive Server ist.
   * Zeigt das "Zuletzt verwendet" Badge an.
   */
  isActive: boolean;
  /**
   * Der aktuelle Verbindungsstatus des Servers.
   * Undefined wenn noch nicht geprüft.
   */
  status: ConnectionStatus | undefined;
  /**
   * Callback wenn der Bearbeiten-Button geklickt wird.
   * Erhält die Server-ID als Parameter.
   */
  onEdit?: (serverId: string) => void;
  /**
   * Callback wenn der Löschen-Button geklickt wird.
   * Erhält die Server-ID als Parameter.
   */
  onDelete?: (serverId: string) => void;
  /**
   * Zeigt an, dass der Lösch-Button bereits einmal geklickt wurde
   * und eine zweite Bestätigung erwartet.
   */
  isDeleteConfirmationPending?: boolean;
  /**
   * Zeigt den Loading-State für die Löschung dieses Servers.
   */
  isDeleting?: boolean;
  /**
   * Callback wenn das gesamte Element geklickt wird.
   * Erhält die Server-ID als Parameter.
   */
  onClick?: (serverId: string) => void;
  /**
   * Zusätzliche CSS-Klassen für custom Styling.
   */
  className?: string;
}

/**
 * ServerListItem Komponente
 *
 * Stellt einen Server als interaktives Listen-Element dar.
 * Zeigt Status, Name, URL und optionale Aktionen an.
 *
 * @example
 * ```tsx
 * // Einfache Verwendung
 * <ServerListItem
 *   server={serverConfig}
 *   isActive={true}
 *   status="connected"
 *   onClick={(id) => selectServer(id)}
 * />
 *
 * // Mit allen Actions
 * <ServerListItem
 *   server={serverConfig}
 *   isActive={false}
 *   status="disconnected"
 *   onClick={(id) => selectServer(id)}
 *   onEdit={(id) => openEditModal(id)}
 *   onDelete={(id) => confirmDelete(id)}
 * />
 * ```
 */
export const ServerListItem = forwardRef<HTMLDivElement, ServerListItemProps>(
  ({ server, isActive, status, onEdit, onDelete, isDeleteConfirmationPending = false, isDeleting = false, onClick, className }, ref) => {
    /**
     * Verhindert Event-Propagation zu onClick wenn Action-Button geklickt wird.
     */
    const handleActionClick = (event: MouseEvent<HTMLButtonElement>, callback?: (id: string) => void) => {
      event.stopPropagation();
      callback?.(server.id);
    };

    /**
     * Behandelt Tastatur-Navigation für Accessibility.
     */
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick?.(server.id);
      }
    };

    return (
      // biome-ignore lint/a11y/useSemanticElements: <li> erfordert Parent <ul>/<ol>, aber diese Komponente kann auch einzeln oder in anderen Kontexten verwendet werden. role="listitem" ist die flexible Alternative.
      <div
        ref={ref}
        role="listitem"
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick ? () => onClick(server.id) : undefined}
        onKeyDown={onClick ? handleKeyDown : undefined}
        aria-label={`Server ${server.name}, ${status === 'connected' ? 'verbunden' : status === 'checking' ? 'wird geprüft' : 'nicht verbunden'}`}
        className={cn(
          // Base Layout
          'group flex w-full flex-col items-start gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4',
          // Hover & Focus states
          onClick && 'hover:bg-slate-100/80 dark:hover:bg-slate-900/50',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          // Interaktivität
          onClick && 'cursor-pointer',
          // Transitions
          'transition-colors duration-150',
          className,
        )}
      >
        {/* Visual Badge + Status + Name + URL */}
        <div className="flex w-full min-w-0 flex-1 items-center gap-3 sm:w-auto">
          {/* Server Visual Badge mit Icon/Farbe und Status-Overlay */}
          {/* M8 Fix: Standardisiere auf size="sm" für Konsistenz mit ServerSelector */}
          <div className="relative flex-shrink-0">
            <ServerVisualBadge server={server} size="sm" />
            {/* Status-Indikator als Overlay unten-rechts */}
            <div className="absolute -right-0.5 -bottom-0.5">
              <ServerStatusDot status={status ?? 'disconnected'} size="sm" className="ring-2 ring-white dark:ring-slate-950" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-slate-900 dark:text-slate-100">{server.name}</span>
              {/* Badge inline auf größeren Screens im Header-Bereich */}
              {isActive && (
                <Badge variant="secondary" className="hidden shrink-0 rounded-md sm:inline-flex">
                  Zuletzt verwendet
                </Badge>
              )}
            </div>
            <div className="truncate text-slate-500 text-sm dark:text-slate-400">{server.url}</div>
          </div>
        </div>

        {/* Badge + Actions - Mobile unterhalb, Desktop rechts */}
        <div className="mt-1 flex w-full items-center justify-between gap-2 sm:mt-0 sm:w-auto sm:justify-end sm:gap-3">
          {/* Badge nur auf Mobile sichtbar (auf Desktop im Header) */}
          {isActive && (
            <Badge variant="secondary" className="shrink-0 rounded-md sm:hidden">
              Zuletzt verwendet
            </Badge>
          )}

          {/* Spacer für Mobile wenn kein Badge */}
          {!isActive && <div className="sm:hidden" />}

          {/* Action Buttons */}
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1">
              {onEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => handleActionClick(e, onEdit)}
                  disabled={isDeleting}
                  aria-label={`Server ${server.name} bearbeiten`}
                  className="rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  <PiPencilSimple className="size-4" />
                </Button>
              )}
              {onDelete &&
                (isDeleteConfirmationPending ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={(e) => handleActionClick(e, onDelete)}
                    disabled={isDeleting}
                    aria-label={isDeleting ? `Server ${server.name} wird entfernt` : `Server ${server.name} wirklich löschen`}
                    className="rounded-md px-2.5"
                  >
                    <PiTrash className="size-4" />
                    {isDeleting ? 'Wird entfernt...' : 'Wirklich löschen?'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => handleActionClick(e, onDelete)}
                    disabled={isDeleting}
                    aria-label={`Server ${server.name} löschen`}
                    className="rounded-md text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
                  >
                    <PiTrash className="size-4" />
                  </Button>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  },
);

ServerListItem.displayName = 'ServerListItem';
