import { useStore } from '@tanstack/react-store';
import type { ConnectionStatus } from '../types/server-config';
import { serverStore } from '../stores/server.store';

/**
 * React Hook um den Verbindungsstatus eines Servers zu abonnieren.
 *
 * Nutzt Selector Pattern für Performance - Component re-rendert nur
 * wenn der Status des EINEN Servers sich ändert (nicht bei allen!).
 * Verwendet O(1) Map.get() Lookup für effizienten Zugriff.
 *
 * @param serverId - ID des Servers dessen Status abgerufen werden soll
 * @returns ConnectionStatus oder undefined wenn Server nicht in Map
 *
 * @example
 * ```typescript
 * function ServerStatusBadge({ serverId }: { serverId: string }) {
 *   const status = useConnectionStatus(serverId);
 *
 *   if (!status) {
 *     return <span>Unknown</span>;
 *   }
 *
 *   return (
 *     <span className={status === 'connected' ? 'text-green-500' : 'text-red-500'}>
 *       {status}
 *     </span>
 *   );
 * }
 * ```
 */
export function useConnectionStatus(serverId: string): ConnectionStatus | undefined {
  return useStore(serverStore, (state) => state.connectionStatus.get(serverId));
}
