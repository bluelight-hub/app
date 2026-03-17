import { createStore } from '@tanstack/react-store';
import type { ConnectionStatus, ServerConfig, ServerState } from '../types/server-config';
import { loadServerAccessToken, loadServers, removeServerAccessToken, saveServerAccessToken, saveServers, STORED_SERVER_ACCESS_TOKEN_MARKER } from './server-persistence';
import { isValidServerIcon, type ServerIconValue } from '../utils/server-icon.utils';
import { isValidServerColor, type ServerColorValue } from '../utils/server-color.utils';

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
export const serverStore = createStore<ServerState>(initialState);

/**
 * Sanitisiert Server-Namen um XSS-Angriffe zu verhindern (Defense in Depth).
 *
 * Verwendet iterative Tag-Entfernung (CodeQL-konformes while-Pattern) um
 * verschachtelte Tag-Angriffe zu verhindern (z.B. `<scr<script>ipt>`) und
 * begrenzt die Länge auf 100 Zeichen. Diese Sanitization ist eine zusätzliche
 * Sicherheitsebene für den Fall, dass localStorage manipuliert wird.
 *
 * @param name - Der zu sanitisierende Server-Name
 * @returns Bereinigter Name ohne HTML-Tags, max 100 Zeichen
 */
function sanitizeServerName(name: string): string {
  let sanitized = name;
  let previous = '';

  // Schritt 1: Script/Style-Tags MIT Inhalt iterativ entfernen (case-insensitive)
  // Verhindert dass JavaScript-Code als Text im Namen verbleibt
  while (previous !== sanitized) {
    previous = sanitized;
    sanitized = sanitized.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  }

  // Schritt 2: Verbleibende HTML-Tags iterativ entfernen (z.B. <img>, <br>, <b>)
  // Verhindert Umgehung durch verschachtelte Tags wie <scr<b>ipt>
  previous = '';
  while (previous !== sanitized) {
    previous = sanitized;
    sanitized = sanitized.replace(/<\/?[^>]*>/g, '');
  }

  // Max-Length enforcing (DoS Prevention) + Whitespace trimmen
  return sanitized.substring(0, 100).trim();
}

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

function toStoredAccessTokenMarker(accessToken?: string): string | undefined {
  return accessToken ? STORED_SERVER_ACCESS_TOKEN_MARKER : undefined;
}

function sanitizeServerConfigForState(server: ServerConfig): ServerConfig {
  return {
    ...server,
    accessToken: toStoredAccessTokenMarker(server.accessToken),
  };
}

/**
 * Validiert eine Server-URL.
 *
 * Erlaubt HTTPS-URLs immer, HTTP nur für localhost oder wenn VITE_INSECURE_MODE='true'.
 * Synchronisiert mit der Logik in url-params.schema.ts für konsistente Validierung.
 * Verwendet native URL-Konstruktor für sichere Validierung.
 *
 * @param url - Die zu validierende URL
 * @returns true wenn gültig, false andernfalls
 */
function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const isInsecureMode = import.meta.env.VITE_INSECURE_MODE === 'true';

    if (parsed.protocol === 'https:') return true;
    if (parsed.protocol === 'http:') {
      return parsed.hostname === 'localhost' || isInsecureMode;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Sortiert Server-Liste nach Last-Used Priorität (zuletzt verwendet zuerst).
 *
 * Sortierlogik:
 * 1. Server mit neuestem `lastUsedAt` Timestamp zuerst
 * 2. Server mit `lastUsedAt` vor Servern ohne
 * 3. Server ohne `lastUsedAt`: sortiert nach `createdAt` (älteste zuerst)
 *
 * Performance-Optimierung: Pre-parst alle Timestamps VOR der Sortierung
 * (O(N) statt O(N log N) Date-Konstruktionen im Comparator).
 *
 * Diese Funktion ist wiederverwendbar für:
 * - ServerSelector Dropdown (sortierte Server-Liste)
 * - getDefaultServer() (ermittelt ersten der sortierten Liste)
 *
 * @param servers - Array der zu sortierenden Server
 * @returns Sortierte Kopie des Arrays (immutable)
 *
 * @example
 * ```typescript
 * const sortedServers = sortServersByLastUsed(servers);
 * // sortedServers[0] ist der zuletzt verwendete Server
 * ```
 */
export function sortServersByLastUsed(servers: ServerConfig[]): ServerConfig[] {
  if (servers.length <= 1) return [...servers];

  // Pre-parse Timestamps EINMAL vor der Sortierung (O(N))
  // Vermeidet O(N log N) Date-Konstruktionen im Comparator
  const serversWithParsedDates = servers.map((server) => ({
    server,
    lastUsedTime: server.lastUsedAt ? new Date(server.lastUsedAt).getTime() : -1,
    createdTime: new Date(server.createdAt).getTime(),
  }));

  // Sortiere mit pre-parsed Timestamps (Vergleiche sind jetzt O(1))
  serversWithParsedDates.sort((a, b) => {
    // Priorität 1: Beide haben lastUsedAt -> neuester zuerst
    if (a.lastUsedTime !== -1 && b.lastUsedTime !== -1) {
      return b.lastUsedTime - a.lastUsedTime;
    }
    // Priorität 2: Nur a hat lastUsedAt -> a zuerst
    if (a.lastUsedTime !== -1) return -1;
    // Priorität 3: Nur b hat lastUsedAt -> b zuerst
    if (b.lastUsedTime !== -1) return 1;
    // Fallback: Beide ohne lastUsedAt -> ältester nach createdAt zuerst
    return a.createdTime - b.createdTime;
  });

  return serversWithParsedDates.map((item) => item.server);
}

/**
 * Ermittelt den Default-Server basierend auf Last-Used Priorität.
 *
 * Sortierlogik für automatische Server-Auswahl beim App-Start:
 * 1. Server mit neuestem `lastUsedAt` Timestamp (zuletzt verwendet)
 * 2. Bei gleichem/fehlendem `lastUsedAt`: Nach `createdAt` (ältester zuerst)
 *
 * Diese Logik stellt sicher, dass der zuletzt verwendete Server
 * automatisch ausgewählt wird, was die UX bei Multi-Server-Setups verbessert.
 *
 * @param servers - Array aller konfigurierten Server
 * @returns Der Default-Server oder null wenn keine Server existieren
 *
 * @example
 * ```typescript
 * const servers = serverStore.state.servers;
 * const defaultServer = getDefaultServer(servers);
 * if (defaultServer) {
 *   await setActiveServer(defaultServer.id);
 * }
 * ```
 */
export function getDefaultServer(servers: ServerConfig[]): ServerConfig | null {
  if (servers.length === 0) return null;
  // sortServersByLastUsed implementiert bereits die vollständige Sortierlogik
  // inkl. createdAt Fallback für Server ohne lastUsedAt
  return sortServersByLastUsed(servers)[0];
}

/**
 * Gibt alle existierenden Server-Namen zurück.
 *
 * Wird verwendet für Duplikat-Validierung im ServerSetupForm.
 * Namen werden mit toLocaleLowerCase('de-DE') verglichen für korrekte
 * Behandlung deutscher Umlaute (ä, ö, ü, ß) bei case-insensitive Prüfung.
 *
 * @returns Array aller Server-Namen (lowercase mit deutscher Locale)
 *
 * @example
 * ```typescript
 * const names = getExistingServerNames();
 * const isDuplicate = names.includes(newName.toLocaleLowerCase('de-DE'));
 * ```
 */
export function getExistingServerNames(): string[] {
  return serverStore.state.servers.map((s) => s.name.toLocaleLowerCase('de-DE'));
}

/**
 * Prüft ob ein Server-Name bereits existiert.
 *
 * Case-insensitive Prüfung mit deutscher Locale für korrekte Umlaut-Behandlung.
 * Optionaler `excludeServerId` Parameter ermöglicht Ausnahme für den
 * eigenen Server bei Bearbeitung (Story 3.3).
 *
 * @param name - Der zu prüfende Server-Name
 * @param excludeServerId - Optional: Server-ID die vom Check ausgenommen wird (für Edit)
 * @returns true wenn Name bereits existiert (außer beim excluded Server)
 */
export function isServerNameTaken(name: string, excludeServerId?: string): boolean {
  const normalizedName = name.trim().toLocaleLowerCase('de-DE');
  return serverStore.state.servers.some((s) => s.name.toLocaleLowerCase('de-DE') === normalizedName && s.id !== excludeServerId);
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
  // XSS-Sanitization: HTML-Tags entfernen, Länge begrenzen (Defense in Depth)
  const sanitizedName = sanitizeServerName(config.name ?? '');

  // Validierung: Name nicht leer (Schema trimmt bereits, hier nur Sicherheitscheck)
  if (!sanitizedName) {
    throw new Error('Server-Name darf nicht leer sein');
  }

  // Validierung: Name eindeutig (case-insensitive)
  if (isServerNameTaken(sanitizedName)) {
    throw new Error(`Ein Server mit dem Namen "${sanitizedName}" existiert bereits`);
  }

  if (!validateUrl(config.url)) {
    throw new Error('Invalid server URL: must be HTTPS or localhost for development');
  }

  // Auto-generierte Felder
  const now = new Date().toISOString();
  const serverId = generateServerId();
  const rawAccessToken = config.accessToken;
  const newServer: ServerConfig = {
    ...sanitizeServerConfigForState(config as ServerConfig),
    name: sanitizedName, // Sanitisierten Namen verwenden
    id: serverId,
    createdAt: now,
    lastUsedAt: now,
  };

  const nextServers = [...serverStore.state.servers.map((server) => sanitizeServerConfigForState(server)), newServer];

  try {
    if (rawAccessToken) {
      await saveServerAccessToken(serverId, rawAccessToken);
    }

    await saveServers(nextServers);
  } catch (error) {
    if (rawAccessToken) {
      try {
        await removeServerAccessToken(serverId);
      } catch {
        // Best effort Rollback für partiell gespeicherte Tokens.
      }
    }

    throw error;
  }

  // Immutable Store Update erst nach erfolgreicher Persistenz
  serverStore.setState((state) => ({
    ...state,
    servers: nextServers,
  }));

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
      return sanitizeServerConfigForState({
        ...s,
        isDefault: true,
        lastUsedAt: now,
      });
    }
    return sanitizeServerConfigForState({
      ...s,
      isDefault: false,
    });
  });

  await saveServers(updatedServers);

  // Store Update erst nach erfolgreicher Persistenz
  serverStore.setState((prevState) => ({
    ...prevState,
    servers: updatedServers,
    activeServerId: serverId,
  }));
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
    updatedServers = filteredServers.map((server, index) => sanitizeServerConfigForState(index === 0 ? { ...server, isDefault: true, lastUsedAt: new Date().toISOString() } : server));
  } else if (state.activeServerId === serverId) {
    // Keine Server übrig
    newActiveServerId = null;
  }

  await saveServers(updatedServers);

  // Store Update erst nach erfolgreicher Persistenz
  serverStore.setState((prevState) => ({
    ...prevState,
    servers: updatedServers,
    activeServerId: newActiveServerId,
  }));

  try {
    await removeServerAccessToken(serverId);
  } catch {
    // Orphaned Tokens sind unangenehm, blockieren aber nicht die Server-Entfernung.
  }
}

/**
 * Aktualisiert einen existierenden Server.
 *
 * Validiert Name-Eindeutigkeit (mit Ausnahme für aktuellen Server)
 * und URL-Format. Token bleibt erhalten wenn nicht explizit überschrieben.
 * Synchronisiert State automatisch mit dem Storage Adapter.
 *
 * @param serverId - ID des zu aktualisierenden Servers
 * @param updates - Partielle Server-Config (name, url, accessToken optional)
 * @throws Error wenn Server nicht existiert
 * @throws Error wenn Name bereits vergeben (außer eigener Name)
 * @throws Error wenn URL ungültig
 *
 * @example
 * ```typescript
 * // Nur Name ändern
 * await updateServer('abc-123', { name: 'Neuer Name' });
 *
 * // Name und URL ändern
 * await updateServer('abc-123', { name: 'Prod', url: 'https://new.api.com' });
 * ```
 */
export async function updateServer(serverId: string, updates: Partial<Omit<ServerConfig, 'id' | 'createdAt'>>): Promise<void> {
  // Early Return: Keine Updates = keine Aktion (verhindert unnötige Storage-Syncs)
  if (Object.keys(updates).length === 0) {
    return;
  }

  const state = serverStore.state;
  const server = state.servers.find((s) => s.id === serverId);

  // Validierung: Server existiert
  if (!server) {
    throw new Error(`Server with id "${serverId}" does not exist`);
  }

  const updatesContainAccessToken = Object.hasOwn(updates, 'accessToken');
  const previousStoredToken = updatesContainAccessToken ? await loadServerAccessToken(serverId).catch(() => null) : null;

  // Name-Validierung mit Ausnahme für aktuellen Server + XSS-Sanitization
  let sanitizedName: string | undefined;
  if (updates.name !== undefined) {
    // XSS-Sanitization: HTML-Tags entfernen, Länge begrenzen (Defense in Depth)
    sanitizedName = sanitizeServerName(updates.name);
    if (!sanitizedName) {
      throw new Error('Server-Name darf nicht leer sein');
    }
    if (isServerNameTaken(sanitizedName, serverId)) {
      throw new Error(`Ein Server mit dem Namen "${sanitizedName}" existiert bereits`);
    }
  }

  // URL-Validierung wenn geändert
  if (updates.url !== undefined && !validateUrl(updates.url)) {
    throw new Error('Invalid server URL: must be HTTPS or localhost for development');
  }

  // Immutable Update: Nur angegebene Felder ändern, Token bleibt erhalten wenn nicht überschrieben
  // Sanitisierten Namen verwenden falls vorhanden
  const sanitizedUpdates = sanitizedName !== undefined ? { ...updates, name: sanitizedName } : updates;
  const persistedUpdates = updatesContainAccessToken
    ? {
        ...sanitizedUpdates,
        accessToken: toStoredAccessTokenMarker(sanitizedUpdates.accessToken),
      }
    : sanitizedUpdates;
  const persistedServers = state.servers.map((s) => sanitizeServerConfigForState(s.id === serverId ? { ...s, ...persistedUpdates } : s));

  try {
    if (updatesContainAccessToken) {
      if (updates.accessToken) {
        await saveServerAccessToken(serverId, updates.accessToken);
      } else {
        await removeServerAccessToken(serverId);
      }
    }

    await saveServers(persistedServers);
  } catch (error) {
    if (updatesContainAccessToken) {
      try {
        if (previousStoredToken) {
          await saveServerAccessToken(serverId, previousStoredToken);
        } else {
          await removeServerAccessToken(serverId);
        }
      } catch {
        // Best effort Rollback der Token-Persistenz.
      }
    }

    throw error;
  }

  // Store Update erst nach erfolgreicher Persistenz
  serverStore.setState((prevState) => ({
    ...prevState,
    servers: persistedServers,
  }));
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

  // Default-Server mit Last-Used Priorität ermitteln
  // Priorität: 1) Neuester lastUsedAt, 2) Ältester createdAt (bei gleich/fehlendem lastUsedAt)
  const defaultServer = getDefaultServer(servers);

  console.log('[ServerStore] Default server:', defaultServer?.name ?? 'none');

  // Update store state
  serverStore.setState((state) => ({
    ...state,
    servers,
    activeServerId: defaultServer?.id ?? null,
    isHydrated: true,
  }));

  console.log('[ServerStore] Hydration complete. Store state:', {
    serverCount: serverStore.state.servers.length,
    isHydrated: serverStore.state.isHydrated,
    activeServerId: serverStore.state.activeServerId,
  });
}

/**
 * Aktualisiert die visuellen Eigenschaften eines Servers (Icon und/oder Farbe).
 *
 * Diese Funktion ermöglicht die Personalisierung von Server-Einträgen im UI,
 * um mehrere Server visuell unterscheiden zu können. Die Änderungen werden
 * automatisch im Storage persistiert.
 *
 * @param serverId - ID des zu aktualisierenden Servers
 * @param visuals - Objekt mit optionalen icon und/oder color Eigenschaften
 * @throws Error wenn Server nicht existiert
 *
 * @example
 * ```typescript
 * // Nur Icon setzen
 * await updateServerVisuals('abc-123', { icon: 'fire' });
 *
 * // Nur Farbe setzen
 * await updateServerVisuals('abc-123', { color: '#FF5733' });
 *
 * // Beides gleichzeitig setzen
 * await updateServerVisuals('abc-123', { icon: 'shield', color: '#3498DB' });
 *
 * // Icon entfernen (auf undefined setzen)
 * await updateServerVisuals('abc-123', { icon: undefined });
 * ```
 */
export async function updateServerVisuals(serverId: string, visuals: { icon?: ServerIconValue; color?: ServerColorValue }): Promise<void> {
  // M6 Fix: Early Return für leere Updates - verhindert unnötige Storage-Syncs
  if (Object.keys(visuals).length === 0) {
    return;
  }

  const state = serverStore.state;

  // Validierung: Server existiert
  const server = state.servers.find((s) => s.id === serverId);
  if (!server) {
    throw new Error(`Server with id "${serverId}" does not exist`);
  }

  // V1: Validierung von Icon und Farbe (nur wenn definiert)
  // Hinweis: ServerIconValue/ServerColorValue sind typisierte Union Types, daher kein Leerstring-Check nötig
  if (visuals.icon !== undefined && !isValidServerIcon(visuals.icon)) {
    throw new Error(`Invalid icon value: "${visuals.icon}"`);
  }
  if (visuals.color !== undefined && !isValidServerColor(visuals.color)) {
    throw new Error(`Invalid color value: "${visuals.color}"`);
  }

  // L5 Fix: Explizit nur icon und color übernehmen - verhindert unerwünschte Key-Überschreibungen
  // Nutze "in" Operator um zu prüfen ob Property angegeben wurde (auch bei undefined)
  const updatedServers = state.servers.map((s) =>
    sanitizeServerConfigForState(
      s.id === serverId
        ? {
            ...s,
            icon: 'icon' in visuals ? visuals.icon : s.icon,
            color: 'color' in visuals ? visuals.color : s.color,
          }
        : s,
    ),
  );

  await saveServers(updatedServers);

  // Store Update erst nach erfolgreicher Persistenz
  serverStore.setState((currentState) => ({
    ...currentState,
    servers: updatedServers,
  }));
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
