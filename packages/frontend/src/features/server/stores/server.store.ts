import { Store } from '@tanstack/react-store';
import type { ServerState } from '../types/server-config';

/**
 * Initial State des Server-Stores.
 *
 * Wird beim App-Start verwendet, bevor die Hydratation
 * aus dem Storage erfolgt.
 */
const initialState: ServerState = {
  servers: [],
  activeServerId: null,
  connectionStatus: new Map(),
  isHydrated: false,
};

/**
 * Globaler Store für Server-Verwaltung.
 *
 * Verwaltet alle konfigurierten Backend-Server, deren Verbindungsstatus
 * und den aktuell aktiven Server. State-Änderungen erfolgen über
 * externe Action-Funktionen (server-persistence.ts, server-actions.ts).
 *
 * @example
 * ```typescript
 * // Store abonnieren in React Component
 * const servers = useStore(serverStore, (state) => state.servers);
 *
 * // State direkt lesen
 * const currentState = serverStore.state;
 * ```
 */
export const serverStore = new Store<ServerState>(initialState);
