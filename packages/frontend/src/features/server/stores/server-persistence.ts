import { getStorageAdapter } from '@/shared/services/storage/storage-adapter.factory';
import type { ServerConfig } from '../types/server-config';
import { z } from 'zod';

/**
 * Storage-Key für die Server-Liste im persistenten Storage.
 */
export const STORAGE_KEY_SERVERS = 'bluelight:servers';
export const SERVER_ACCESS_TOKEN_STORAGE_KEY_PREFIX = 'bluelight:server-access-token:';
export const STORED_SERVER_ACCESS_TOKEN_MARKER = '__blh_server_access_token_stored__';

export class ServerPersistenceError extends Error {
  constructor(operation: string, options?: ErrorOptions) {
    super(`Server-Persistenz fehlgeschlagen: ${operation}`, options);
    this.name = 'ServerPersistenceError';
  }
}

/**
 * Zod-Schema zur Validierung von ServerConfig-Objekten.
 *
 * Stellt sicher, dass aus dem Storage geladene Daten der
 * erwarteten Struktur entsprechen und keine korrupten Daten
 * die Anwendung zum Absturz bringen.
 */
const ServerConfigSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, 'Invalid UUID v4'),
  name: z.string().min(1),
  url: z.string().refine((val) => {
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid URL'),
  accessToken: z.string().optional(),
  isDefault: z.boolean(),
  createdAt: z.string().refine((val) => !Number.isNaN(Date.parse(val)), 'Invalid ISO datetime'),
  lastUsedAt: z
    .string()
    .refine((val) => !Number.isNaN(Date.parse(val)), 'Invalid ISO datetime')
    .nullable(),
});

function getServerAccessTokenStorageKey(serverId: string): string {
  return `${SERVER_ACCESS_TOKEN_STORAGE_KEY_PREFIX}${serverId}`;
}

export function hasStoredServerAccessToken(server: Pick<ServerConfig, 'accessToken'>): boolean {
  return server.accessToken === STORED_SERVER_ACCESS_TOKEN_MARKER;
}

function sanitizeServerForPersistence(server: ServerConfig): ServerConfig {
  return server.accessToken
    ? {
        ...server,
        accessToken: STORED_SERVER_ACCESS_TOKEN_MARKER,
      }
    : {
        ...server,
        accessToken: undefined,
      };
}

/**
 * Speichert die Server-Liste im persistenten Storage.
 *
 * Nutzt den Storage-Adapter um plattformunabhängig zu speichern
 * (Tauri File System oder Browser localStorage).
 *
 * @param servers - Array von Server-Konfigurationen
 * @throws Wirft keine Exceptions, loggt Fehler nur in Console
 *
 * @example
 * ```typescript
 * const servers: ServerConfig[] = [
 *   { id: '1', name: 'Prod', url: 'https://api.example.com', ... }
 * ];
 * await saveServers(servers);
 * ```
 */
export async function saveServers(servers: ServerConfig[]): Promise<void> {
  try {
    const adapter = getStorageAdapter();
    await adapter.setItem(STORAGE_KEY_SERVERS, JSON.stringify(servers.map((server) => sanitizeServerForPersistence(server))));
  } catch (error) {
    console.warn('Failed to save servers to storage:', error);
    throw new ServerPersistenceError('Serverliste speichern', { cause: error });
  }
}

export async function saveServerAccessToken(serverId: string, token: string): Promise<void> {
  try {
    const adapter = getStorageAdapter();
    await adapter.setItem(getServerAccessTokenStorageKey(serverId), token);
  } catch (error) {
    throw new ServerPersistenceError(`Server-Access-Token für ${serverId} speichern`, { cause: error });
  }
}

export async function loadServerAccessToken(serverId: string): Promise<string | null> {
  try {
    const adapter = getStorageAdapter();
    return await adapter.getItem(getServerAccessTokenStorageKey(serverId));
  } catch (error) {
    throw new ServerPersistenceError(`Server-Access-Token für ${serverId} laden`, { cause: error });
  }
}

export async function removeServerAccessToken(serverId: string): Promise<void> {
  try {
    const adapter = getStorageAdapter();
    await adapter.removeItem(getServerAccessTokenStorageKey(serverId));
  } catch (error) {
    throw new ServerPersistenceError(`Server-Access-Token für ${serverId} entfernen`, { cause: error });
  }
}

/**
 * Lädt die Server-Liste aus dem persistenten Storage.
 *
 * Nutzt den Storage-Adapter um plattformunabhängig zu laden
 * (Tauri File System oder Browser localStorage).
 * Validiert jedes Server-Objekt mit Zod-Schema um Datenkonsistenz
 * zu garantieren. Ungültige Einträge werden übersprungen.
 *
 * @returns Array von Server-Konfigurationen, leeres Array bei Fehler oder wenn keine Server gespeichert sind
 * @throws Wirft keine Exceptions, gibt bei Fehler leeres Array zurück
 *
 * @example
 * ```typescript
 * const servers = await loadServers();
 * console.log(`${servers.length} servers loaded`);
 * ```
 */
export async function loadServers(): Promise<ServerConfig[]> {
  try {
    const adapter = getStorageAdapter();
    const data = await adapter.getItem(STORAGE_KEY_SERVERS);

    if (!data) {
      return [];
    }

    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Validiere jedes Server-Objekt und filtere ungültige Einträge
    const validServers: ServerConfig[] = [];
    let migrationRequired = false;

    for (const item of parsed) {
      try {
        const server = ServerConfigSchema.parse(item);
        if (server.accessToken && !hasStoredServerAccessToken(server)) {
          await saveServerAccessToken(server.id, server.accessToken);
          validServers.push({
            ...server,
            accessToken: STORED_SERVER_ACCESS_TOKEN_MARKER,
          });
          migrationRequired = true;
          continue;
        }

        validServers.push(server);
      } catch (_error) {
        console.warn('Invalid server config in storage, skipping:', item);
      }
    }

    if (migrationRequired) {
      await saveServers(validServers);
    }

    return validServers;
  } catch (error) {
    console.warn('Failed to load servers from storage:', error);
    return [];
  }
}
