/**
 * ServerList Organism
 *
 * Zeigt eine Liste aller konfigurierten Server sortiert nach letzter Verwendung.
 * Integriert Health-Checks, Loading-State während Hydration und Empty-State.
 *
 * **Features:**
 * - Automatische Sortierung nach "Zuletzt verwendet" (neueste zuerst)
 * - Visueller Verbindungsstatus für jeden Server (via Health-Checks)
 * - Loading-Spinner während Store-Hydration
 * - Empty-State mit CTA-Button wenn keine Server konfiguriert
 * - Hervorhebung des aktiven Servers via "Zuletzt verwendet" Badge
 * - Dark Mode Support
 *
 * **Acceptance Criteria:**
 * - AC1: Liste aller konfigurierten Server angezeigt (Name, URL, Status)
 * - AC2: Server nach "Zuletzt verwendet" sortiert (neueste zuerst)
 * - AC5: Empty State mit "Keine Server konfiguriert" und CTA-Button
 *
 * @module features/server/ui/organisms/ServerList
 */

import { forwardRef } from 'react';
import { useStore } from '@tanstack/react-store';
import { cn } from '@/shared/ui/cn';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { serverStore } from '../../stores/server.store';
import { useServerList } from '../../hooks/use-server-list';
import { useActiveServer } from '../../hooks/use-active-server';
import { useServerListHealth } from '../../hooks/use-server-list-health';
import { ServerListItem } from '../molecules/ServerListItem';
import { ServerListEmptyState } from '../molecules/ServerListEmptyState';

/**
 * Props für die ServerList Komponente.
 */
export interface ServerListProps {
  /**
   * Callback wenn der "Server hinzufügen" Button im Empty-State geklickt wird.
   */
  onAddServer?: () => void;
  /**
   * Callback wenn der Bearbeiten-Button eines Servers geklickt wird.
   * Erhält die Server-ID als Parameter.
   */
  onEditServer?: (serverId: string) => void;
  /**
   * Callback wenn der Löschen-Button eines Servers geklickt wird.
   * Erhält die Server-ID als Parameter.
   */
  onDeleteServer?: (serverId: string) => void;
  /**
   * Callback wenn ein Server ausgewählt wird.
   * Erhält die Server-ID als Parameter.
   */
  onSelectServer?: (serverId: string) => void;
  /**
   * Zusätzliche CSS-Klassen für custom Styling.
   */
  className?: string;
}

/**
 * ServerList Komponente
 *
 * Zeigt alle konfigurierten Server in einer Liste an, sortiert nach
 * letzter Verwendung. Integriert automatische Health-Checks und
 * zeigt den Verbindungsstatus visuell an.
 *
 * @example
 * ```tsx
 * // Einfache Verwendung
 * <ServerList
 *   onSelectServer={(id) => handleSelectServer(id)}
 * />
 *
 * // Mit allen Callbacks
 * <ServerList
 *   onAddServer={() => navigate('/setup')}
 *   onEditServer={(id) => openEditModal(id)}
 *   onDeleteServer={(id) => confirmDelete(id)}
 *   onSelectServer={(id) => handleSelectServer(id)}
 *   className="mt-4"
 * />
 * ```
 */
export const ServerList = forwardRef<HTMLDivElement, ServerListProps>(({ onAddServer, onEditServer, onDeleteServer, onSelectServer, className }, ref) => {
  // Aktiviere Health-Checks für alle Server
  useServerListHealth();

  // Store State
  const isHydrated = useStore(serverStore, (state) => state.isHydrated);
  const connectionStatus = useStore(serverStore, (state) => state.connectionStatus);

  // Hooks für Server-Daten
  const servers = useServerList(); // Bereits sortiert nach lastUsedAt DESC
  const activeServer = useActiveServer();

  // Loading State während Hydration
  if (!isHydrated) {
    return (
      <div ref={ref} data-testid="server-list-loading" className={cn('flex items-center justify-center py-12', className)}>
        <Spinner size="lg" type="ring" />
      </div>
    );
  }

  // Empty State
  if (servers.length === 0) {
    return <ServerListEmptyState ref={ref} onAddServer={onAddServer} className={className} />;
  }

  // Server Liste
  return (
    // biome-ignore lint/a11y/useSemanticElements: <ul> erfordert <li> children, aber ServerListItem nutzt role="listitem" auf <div> für flexible Verwendung
    <div ref={ref} role="list" data-testid="server-list" className={cn('divide-y divide-gray-200 dark:divide-gray-700', className)}>
      {servers.map((server) => (
        <ServerListItem
          key={server.id}
          server={server}
          isActive={activeServer?.id === server.id}
          status={connectionStatus.get(server.id)}
          onClick={onSelectServer}
          onEdit={onEditServer}
          onDelete={onDeleteServer}
        />
      ))}
    </div>
  );
});

ServerList.displayName = 'ServerList';
