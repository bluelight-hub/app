import { useStore } from '@tanstack/react-store';
import { addServer, hydrateServerStore, removeServer, serverStore, setActiveServer, updateConnectionStatus } from '../stores/server.store';

/**
 * Wrapper Hook für den kompletten Server Store.
 *
 * Bietet direkten Zugriff auf alle Actions und State-Selectors.
 * Convenience Hook ähnlich wie useEinsatzStore Pattern.
 *
 * @returns Object mit State-Selectors und Actions
 *
 * @example
 * ```typescript
 * function ServerSettings() {
 *   const {
 *     servers,
 *     activeServer,
 *     addServer,
 *     setActiveServer,
 *     removeServer
 *   } = useServerStore();
 *
 *   const handleAddServer = async () => {
 *     await addServer({
 *       name: 'Neuer Server',
 *       url: 'https://api.example.com',
 *       isDefault: false
 *     });
 *   };
 *
 *   const handleSelectServer = async (serverId: string) => {
 *     await setActiveServer(serverId);
 *   };
 *
 *   return (
 *     <div>
 *       <h2>Aktiver Server: {activeServer?.name ?? 'Keiner'}</h2>
 *       <ul>
 *         {servers.map(server => (
 *           <li key={server.id}>
 *             {server.name}
 *             <button onClick={() => handleSelectServer(server.id)}>
 *               Aktivieren
 *             </button>
 *             <button onClick={() => removeServer(server.id)}>
 *               Löschen
 *             </button>
 *           </li>
 *         ))}
 *       </ul>
 *       <button onClick={handleAddServer}>Server hinzufügen</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useServerStore() {
  const state = useStore(serverStore);

  return {
    // State Selectors
    servers: state.servers,
    activeServerId: state.activeServerId,
    activeServer: state.servers.find((s) => s.id === state.activeServerId) ?? null,
    connectionStatus: state.connectionStatus,
    isHydrated: state.isHydrated,

    // Actions
    addServer,
    setActiveServer,
    removeServer,
    hydrateServerStore,
    updateConnectionStatus,
  };
}
