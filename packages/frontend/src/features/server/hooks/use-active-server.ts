import { useStore } from '@tanstack/react-store';
import { serverStore } from '../stores/server.store';
import type { ServerConfig } from '../types/server-config';

/**
 * React Hook: Gibt den aktuell aktiven Server zurück.
 *
 * Nutzt Selector Pattern für optimierte Performance - komponente
 * re-rendert nur wenn sich der aktive Server ändert, nicht bei
 * allen Store-Updates.
 *
 * @returns Aktiver Server oder null wenn kein Server aktiv ist
 *
 * @example
 * ```typescript
 * function ServerHeader() {
 *   const activeServer = useActiveServer();
 *
 *   if (!activeServer) {
 *     return <div>Kein Server aktiv</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <h2>{activeServer.name}</h2>
 *       <p>{activeServer.url}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useActiveServer(): ServerConfig | null {
  return useStore(serverStore, (state) => state.servers.find((s) => s.id === state.activeServerId) ?? null);
}
