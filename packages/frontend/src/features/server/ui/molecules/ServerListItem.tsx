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

import { forwardRef } from 'react';
import { cn } from '@/shared/ui/cn';
import { Badge } from '@/shared/ui/atoms/badge.atom';
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
export const ServerListItem = forwardRef<HTMLDivElement, ServerListItemProps>(({ server, isActive, status, onEdit, onDelete, onClick, className }, ref) => {
  /**
   * Verhindert Event-Propagation zu onClick wenn Action-Button geklickt wird.
   */
  const handleActionClick = (event: React.MouseEvent, callback?: (id: string) => void) => {
    event.stopPropagation();
    callback?.(server.id);
  };

  /**
   * Behandelt Tastatur-Navigation für Accessibility.
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.(server.id);
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- <li> erfordert Parent <ul>/<ol>, aber diese Komponente kann auch einzeln oder in anderen Kontexten verwendet werden. role="listitem" ist die flexible Alternative.
    <div
      ref={ref}
      role="listitem"
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? () => onClick(server.id) : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      aria-label={`Server ${server.name}, ${status === 'connected' ? 'verbunden' : status === 'checking' ? 'wird geprüft' : 'nicht verbunden'}`}
      className={cn(
        // Base Layout
        'flex flex-col items-start gap-2 rounded-lg p-3 sm:flex-row sm:items-center sm:gap-4',
        // Hover & Focus States
        'hover:bg-surface-raised',
        'focus-visible:shadow-focus-ring focus-visible:outline-none',
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
            <ServerStatusDot status={status ?? 'disconnected'} size="sm" className="ring-2 ring-surface-panel" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-text-primary">{server.name}</span>
            {/* Badge inline auf größeren Screens im Header-Bereich */}
            {isActive && (
              <Badge variant="success" size="sm" className="hidden shrink-0 sm:inline-flex">
                Zuletzt verwendet
              </Badge>
            )}
          </div>
          <div className="truncate text-sm text-text-secondary">{server.url}</div>
        </div>
      </div>

      {/* Badge + Actions - Mobile unterhalb, Desktop rechts */}
      <div className="mt-1 flex w-full items-center justify-between gap-2 sm:mt-0 sm:w-auto sm:justify-end sm:gap-3">
        {/* Badge nur auf Mobile sichtbar (auf Desktop im Header) */}
        {isActive && (
          <Badge variant="success" size="sm" className="shrink-0 sm:hidden">
            Zuletzt verwendet
          </Badge>
        )}

        {/* Spacer für Mobile wenn kein Badge */}
        {!isActive && <div className="sm:hidden" />}

        {/* Action Buttons */}
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => handleActionClick(e, onEdit)}
                aria-label={`Server ${server.name} bearbeiten`}
                className={cn(
                  'rounded-md p-2 text-text-muted hover:bg-action-secondary hover:text-text-secondary',
                  'focus-visible:shadow-focus-ring focus-visible:outline-none',
                  'transition-colors duration-150',
                )}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                  />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => handleActionClick(e, onDelete)}
                aria-label={`Server ${server.name} löschen`}
                className={cn(
                  'rounded-md p-2 text-text-muted hover:bg-status-danger-surface hover:text-status-danger-text',
                  'focus-visible:shadow-focus-ring focus-visible:outline-none',
                  'transition-colors duration-150',
                )}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

ServerListItem.displayName = 'ServerListItem';
