import { useStore } from '@tanstack/react-store';
import { serverStore } from '../stores/server.store';
import type { ServerConfig } from '../types/server-config';

/**
 * React Hook: Gibt alle konfigurierten Server zurück.
 *
 * Server werden nach lastUsedAt sortiert (neueste zuerst) für
 * bessere UX in Dropdown-Listen und Server-Selektoren.
 *
 * @returns Sortiertes Array aller Server-Konfigurationen
 *
 * @example
 * ```typescript
 * function ServerList() {
 *   const servers = useServerList();
 *
 *   if (servers.length === 0) {
 *     return <div>Keine Server konfiguriert</div>;
 *   }
 *
 *   return (
 *     <ul>
 *       {servers.map(server => (
 *         <li key={server.id}>
 *           {server.name} - {server.url}
 *           {server.isDefault && <Badge>Default</Badge>}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useServerList(): ServerConfig[] {
  return useStore(serverStore, (state) => {
    // Sortierung nach lastUsedAt (neueste zuerst)
    return [...state.servers].sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime());
  });
}
