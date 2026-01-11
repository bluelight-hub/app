import { Store } from '@tanstack/react-store';
import type { ConnectionStatus, ServerConfig, ServerState } from '../types/server-config';
import { loadServers, saveServers } from './server-persistence';
import { setServerAccessToken, clearServerAccessToken } from '@/shared/lib/server-access-token';

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

/**
 * Generiert eine eindeutige Server-ID.
 *
 * Verwendet native crypto.randomUUID() wenn verfügbar (moderne Browser),
 * fällt zurück auf Timestamp + Random-String für Kompatibilität.
 *
 * @returns Eine eindeutige ID im UUID-Format oder Fallback-Format
 */
function generateServerId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Validiert eine Server-URL.
 *
 * Erlaubt nur HTTPS-URLs oder localhost für Entwicklung.
 * Verwendet native URL-Konstruktor für sichere Validierung.
 *
 * @param url - Die zu validierende URL
 * @returns true wenn gültig, false andernfalls
 */
function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.hostname === 'localhost';
  } catch {
    return false;
  }
}

/**
 * Gibt alle existierenden Server-Namen zurück.
 *
 * Wird verwendet für Duplikat-Validierung im ServerSetupForm.
 * Namen werden lowercase verglichen für case-insensitive Prüfung.
 *
 * @returns Array aller Server-Namen (lowercase)
 *
 * @example
 * ```typescript
 * const names = getExistingServerNames();
 * const isDuplicate = names.includes(newName.toLowerCase());
 * ```
 */
export function getExistingServerNames(): string[] {
  return serverStore.state.servers.map((s) => s.name.toLowerCase());
}

/**
 * Prüft ob ein Server-Name bereits existiert.
 *
 * Case-insensitive Prüfung zur Vermeidung von Duplikaten.
 *
 * @param name - Der zu prüfende Server-Name
 * @returns true wenn Name bereits existiert
 */
export function isServerNameTaken(name: string): boolean {
  const normalizedName = name.trim().toLowerCase();
  return serverStore.state.servers.some((s) => s.name.toLowerCase() === normalizedName);
}

/**
 * Fügt einen neuen Server zur Konfiguration hinzu.
 *
 * Auto-generiert ID, createdAt und lastUsedAt Timestamps.
 * Validiert URL-Format (HTTPS oder localhost) und Name (min 1 char).
 * Synchronisiert State automatisch mit dem Storage Adapter.
 *
 * @param config - Server-Konfiguration ohne ID und Timestamps
 * @throws Error wenn Validierung fehlschlägt
 * @returns Die generierte Server-ID
 *
 * @example
 * ```typescript
 * const serverId = await addServer({
 *   name: 'Produktiv-Server',
 *   url: 'https://api.example.com',
 *   isDefault: true
 * });
 * ```
 */
export async function addServer(config: Omit<ServerConfig, 'id' | 'createdAt'>): Promise<string> {
  // Validierung: Name nicht leer (Schema trimmt bereits, hier nur Sicherheitscheck)
  const trimmedName = config.name?.trim();
  if (!trimmedName) {
    throw new Error('Server name must be at least 1 character long');
  }

  // Validierung: Name eindeutig (case-insensitive)
  if (isServerNameTaken(trimmedName)) {
    throw new Error(`Ein Server mit dem Namen "${trimmedName}" existiert bereits`);
  }

  if (!validateUrl(config.url)) {
    throw new Error('Invalid server URL: must be HTTPS or localhost for development');
  }

  // Auto-generierte Felder
  const now = new Date().toISOString();
  const serverId = generateServerId();
  const newServer: ServerConfig = {
    ...config,
    id: serverId,
    createdAt: now,
    lastUsedAt: now,
  };

  // Immutable Store Update
  serverStore.setState((state) => ({
    ...state,
    servers: [...state.servers, newServer],
  }));

  // Storage Sync
  await saveServers(serverStore.state.servers);

  return serverId;
}

/**
 * Setzt einen Server als aktiven Server.
 *
 * Aktualisiert isDefault Flag (nur aktiver Server hat true).
 * Aktualisiert lastUsedAt Timestamp des aktiven Servers.
 * Synchronisiert State automatisch mit dem Storage Adapter.
 *
 * @param serverId - ID des Servers der aktiv gesetzt werden soll
 * @throws Error wenn Server-ID nicht existiert
 *
 * @example
 * ```typescript
 * await setActiveServer('abc-123-def-456');
 * ```
 */
export async function setActiveServer(serverId: string): Promise<void> {
  const state = serverStore.state;

  // Validierung: Server existiert
  const server = state.servers.find((s) => s.id === serverId);
  if (!server) {
    throw new Error(`Server with id "${serverId}" does not exist`);
  }

  const now = new Date().toISOString();

  // Immutable Update: isDefault und lastUsedAt für alle Server
  const updatedServers = state.servers.map((s) => {
    if (s.id === serverId) {
      return {
        ...s,
        isDefault: true,
        lastUsedAt: now,
      };
    }
    return {
      ...s,
      isDefault: false,
    };
  });

  // Store Update
  serverStore.setState((state) => ({
    ...state,
    servers: updatedServers,
    activeServerId: serverId,
  }));

  // Token-Synchronisation: Server-Access-Token aus Server-Config in globalen Storage kopieren
  // Damit fetchWithRefresh den korrekten Token für API-Requests verwendet
  if (server.accessToken) {
    console.log('[ServerStore] Syncing access token for server:', server.name);
    setServerAccessToken(server.accessToken);
  } else {
    console.log('[ServerStore] No access token for server:', server.name, '- clearing global token');
    clearServerAccessToken();
  }

  // Storage Sync
  await saveServers(serverStore.state.servers);
}

/**
 * Entfernt einen Server aus der Konfiguration.
 *
 * Auto-Fallback: Wenn aktiver Server gelöscht wird, wird der erste
 * verfügbare Server aktiv gesetzt (oder null bei 0 Servern).
 * Synchronisiert State automatisch mit dem Storage Adapter.
 *
 * @param serverId - ID des zu löschenden Servers
 *
 * @example
 * ```typescript
 * await removeServer('abc-123-def-456');
 * ```
 */
export async function removeServer(serverId: string): Promise<void> {
  const state = serverStore.state;

  // Filter Server
  const filteredServers = state.servers.filter((s) => s.id !== serverId);

  // Auto-Fallback: Wenn aktiver Server gelöscht
  let newActiveServerId = state.activeServerId;
  let updatedServers = filteredServers;

  if (state.activeServerId === serverId && filteredServers.length > 0) {
    // Ersten Server aktiv setzen
    newActiveServerId = filteredServers[0].id;

    // Immutable update
    updatedServers = filteredServers.map((server, index) => (index === 0 ? { ...server, isDefault: true, lastUsedAt: new Date().toISOString() } : server));
  } else if (state.activeServerId === serverId) {
    // Keine Server übrig
    newActiveServerId = null;
  }

  // Store Update
  serverStore.setState((state) => ({
    ...state,
    servers: updatedServers,
    activeServerId: newActiveServerId,
  }));

  // Storage Sync
  await saveServers(serverStore.state.servers);
}

/**
 * Hydratiert den Server-Store aus dem persistenten Storage.
 *
 * Lädt alle gespeicherten Server aus dem Storage Adapter und aktualisiert
 * den Store-State. Setzt automatisch den Default-Server als aktiv.
 * Race Condition Protection: Überspringt Hydration wenn bereits erfolgt.
 *
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * // Bei App-Start aufrufen
 * await hydrateServerStore();
 * ```
 */
export async function hydrateServerStore(): Promise<void> {
  // Race Condition Protection: Check if already hydrated
  if (serverStore.state.isHydrated) {
    console.warn('[ServerStore] Already hydrated, skipping...');
    return;
  }

  console.log('[ServerStore] Starting hydration...');

  // Load servers from storage (errors propagate to caller)
  const servers = await loadServers();

  console.log(
    '[ServerStore] Loaded servers:',
    servers.length,
    servers.map((s) => s.name),
  );

  // Find default server, fallback to first server if none is default
  // Ensures that if servers exist, at least one is active
  const defaultServer = servers.find((s) => s.isDefault) ?? servers[0];

  console.log('[ServerStore] Default server:', defaultServer?.name ?? 'none');

  // Update store state
  serverStore.setState((state) => ({
    ...state,
    servers,
    activeServerId: defaultServer?.id ?? null,
    isHydrated: true,
  }));

  // Token-Synchronisation: Server-Access-Token aus aktiver Server-Config in globalen Storage kopieren
  // WICHTIG: Muss NACH dem Store-Update passieren, damit API-Requests den Token haben
  if (defaultServer?.accessToken) {
    console.log('[ServerStore] Syncing access token for default server:', defaultServer.name);
    setServerAccessToken(defaultServer.accessToken);
  } else if (defaultServer) {
    console.log('[ServerStore] No access token for default server:', defaultServer.name, '- clearing global token');
    clearServerAccessToken();
  }

  console.log('[ServerStore] Hydration complete. Store state:', {
    serverCount: serverStore.state.servers.length,
    isHydrated: serverStore.state.isHydrated,
    activeServerId: serverStore.state.activeServerId,
    hasAccessToken: !!defaultServer?.accessToken,
  });
}

/**
 * Aktualisiert den Verbindungsstatus eines Servers.
 *
 * Nutzt Map.set() für O(1) Lookup Performance.
 * Keine Validierung nötig - Map akzeptiert beliebige Keys.
 * Kein Persistierung - nur In-Memory State für UI-Updates.
 *
 * @param serverId - ID des Servers dessen Status aktualisiert wird
 * @param status - Neuer Verbindungsstatus
 *
 * @example
 * ```typescript
 * // Status auf "checking" setzen
 * updateConnectionStatus('abc-123-def-456', 'checking');
 *
 * // Status auf "connected" setzen
 * updateConnectionStatus('abc-123-def-456', 'connected');
 * ```
 */
export function updateConnectionStatus(serverId: string, status: ConnectionStatus): void {
  const currentMap = serverStore.state.connectionStatus;

  // Neue Map für Immutability
  const newMap = new Map(currentMap);
  newMap.set(serverId, status);

  // Store Update
  serverStore.setState((state) => ({
    ...state,
    connectionStatus: newMap,
  }));
}
