import { useMemo } from 'react';
import { useStore } from '@tanstack/react-store';
import { serverStore } from '../stores/server.store';
import type { ServerConfig } from '../types/server-config';

/**
 * Hook für einzelnen Server anhand ID.
 *
 * Optimiert durch stabilen Selector mit useMemo - verhindert
 * unnötige Re-Renders durch referenzstabile Selector-Funktion.
 * Der find()-Durchlauf wird nur bei serverId-Änderung neu erstellt.
 *
 * @param serverId - ID des gesuchten Servers
 * @returns ServerConfig oder null wenn nicht gefunden
 *
 * @example
 * ```tsx
 * const server = useServerById(editingServerId);
 * if (server) {
 *   return <ServerEditForm server={server} />;
 * }
 * ```
 */
export function useServerById(serverId: string | null): ServerConfig | null {
  // H5 Fix: Stabile Selector-Funktion mit useMemo
  // Verhindert neuen Array-Durchlauf bei jedem Render
  const selector = useMemo(
    () => (state: { servers: ServerConfig[] }) => {
      if (!serverId) return null;
      return state.servers.find((s) => s.id === serverId) ?? null;
    },
    [serverId],
  );

  return useStore(serverStore, selector);
}
