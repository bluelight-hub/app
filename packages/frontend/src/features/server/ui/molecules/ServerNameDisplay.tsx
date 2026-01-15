/**
 * ServerNameDisplay Molekül
 *
 * Statische Anzeige für einen einzelnen Backend-Server.
 * Wird verwendet wenn nur ein Server konfiguriert ist und kein Dropdown benötigt wird.
 *
 * **Features:**
 * - ServerVisualBadge zeigt Server-Icon und Farbe
 * - ServerStatusDot als Overlay zeigt Verbindungsstatus
 * - Server-Name als statischer Text (kein Dropdown)
 * - Server-URL als Hostname
 * - Responsive: Gleiche Breite wie ServerSelector
 *
 * @module features/server/ui/molecules/ServerNameDisplay
 */

import { ServerStatusDot } from '@/features/server/ui/atoms/ServerStatusDot';
import { ServerVisualBadge } from '@/features/server/ui/atoms/ServerVisualBadge';
import { cn } from '@/shared/ui/cn';
import type { ServerConfig, ConnectionStatus } from '../../types/server-config';
import { getHostSafe } from '../../utils/url';

/**
 * Props für die ServerNameDisplay Komponente.
 */
export interface ServerNameDisplayProps {
  /**
   * Der anzuzeigende Server.
   */
  server: ServerConfig;
  /**
   * Optionaler Verbindungsstatus des Servers.
   * Wenn nicht angegeben, wird 'disconnected' als Standard verwendet.
   */
  status?: ConnectionStatus;
  /**
   * Zusätzliche CSS-Klassen für custom Styling.
   */
  className?: string;
}

/**
 * ServerNameDisplay Komponente
 *
 * Zeigt Server-Informationen in einer statischen Ansicht an.
 * Verwendet das gleiche visuelle Layout wie ServerSelector für Konsistenz.
 *
 * @example
 * ```tsx
 * // Basis-Verwendung
 * <ServerNameDisplay server={myServer} />
 *
 * // Mit Status
 * <ServerNameDisplay server={myServer} status="connected" />
 *
 * // Mit custom className
 * <ServerNameDisplay server={myServer} className="my-4" />
 * ```
 */
export function ServerNameDisplay({ server, status, className }: ServerNameDisplayProps) {
  return (
    <div
      className={cn('w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3', 'flex items-center gap-3', 'dark:border-gray-700 dark:bg-gray-900', className)}
      data-testid="server-name-display"
    >
      {/* Server Visual Badge mit Status-Overlay */}
      <div className="relative flex-shrink-0">
        <ServerVisualBadge server={server} size="md" data-testid="server-visual-badge" />
        {/* Status-Indikator als Overlay unten-rechts */}
        <div className="absolute -right-0.5 -bottom-0.5">
          <ServerStatusDot status={status ?? 'disconnected'} size="sm" className="ring-2 ring-white dark:ring-gray-900" />
        </div>
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-gray-900 dark:text-white" data-testid="server-name">
          {server.name}
        </span>
        <span className="truncate text-gray-500 text-sm dark:text-gray-400" data-testid="server-url">
          {getHostSafe(server.url) ?? 'Unbekannt'}
        </span>
      </div>
    </div>
  );
}
