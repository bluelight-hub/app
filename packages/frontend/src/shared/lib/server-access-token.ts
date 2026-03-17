import { serverStore, updateServer } from '@/features/server/stores/server.store';
import { loadServerAccessToken, STORED_SERVER_ACCESS_TOKEN_MARKER } from '@/features/server/stores/server-persistence';
import { getStorageAdapter } from '@/shared/services/storage/storage-adapter.factory';
import { logger } from './logger';

const LEGACY_STORAGE_KEY = 'bluelight-hub-server-access-token';

/**
 * Backend Error-Messages fuer Server-Access-Token Probleme
 *
 * Diese Konstanten muessen mit den Backend-Responses uebereinstimmen:
 * - ServerAccessGuard: "Server access token required" (kein Token)
 * - ServerAccessGuard: "Invalid or revoked server access token" (falscher Token)
 */
export const TOKEN_ERROR_MESSAGES = {
  /** Token fehlt im Request */
  REQUIRED: 'Server access token required',
  /** Token ist ungueltig oder wurde widerrufen */
  INVALID: 'Invalid or revoked server access token',
} as const;

/**
 * Prueft ob eine Error-Message ein Server-Access-Token-Problem anzeigt
 *
 * @param message - Die Error-Message aus dem Backend-Response
 * @returns true wenn es ein Token-Problem ist (fehlt oder ungueltig)
 */
export function isTokenErrorMessage(message: string): boolean {
  return message === TOKEN_ERROR_MESSAGES.REQUIRED || message === TOKEN_ERROR_MESSAGES.INVALID;
}

/**
 * Flag ob gerade ein Setup-Redirect laeuft
 *
 * Wird gesetzt wenn SERVER_NOT_SETUP (503) oder Token-Fehler erkannt wird.
 * Verhindert dass mehrere parallele Requests Toasts zeigen
 * waehrend der Redirect zur Setup-Seite laeuft.
 */
let isSetupRedirectActive = false;

/**
 * Prueft ob gerade ein Setup-Redirect laeuft
 *
 * Kann von Error-Handlern verwendet werden um unnoetige Toasts zu vermeiden
 * waehrend der Redirect zur Setup-Seite ausgefuehrt wird.
 */
export function isSetupRedirectInProgress(): boolean {
  return isSetupRedirectActive;
}

/**
 * Markiert dass ein Setup-Redirect gestartet wurde
 *
 * Sollte aufgerufen werden sobald SERVER_NOT_SETUP oder Token-Fehler erkannt wird,
 * BEVOR der eigentliche Redirect ausgefuehrt wird.
 */
export function setSetupRedirectInProgress(value: boolean): void {
  isSetupRedirectActive = value;
}

function getActiveServer() {
  const { activeServerId, servers } = serverStore.state;
  return activeServerId ? servers.find((server) => server.id === activeServerId) : undefined;
}

/**
 * Liest den aktiven Server-Access-Token aus der zentralen, servergebundenen Persistenz.
 *
 * Ein Legacy-Shadow-Storage wird nur noch als Fallback vor abgeschlossener
 * Hydration berücksichtigt, damit alte lokale Spiegel schrittweise verschwinden.
 */
export async function getServerAccessToken(): Promise<string | null> {
  const activeServer = getActiveServer();
  if (activeServer?.accessToken) {
    if (activeServer.accessToken !== STORED_SERVER_ACCESS_TOKEN_MARKER) {
      return activeServer.accessToken;
    }

    try {
      return await loadServerAccessToken(activeServer.id);
    } catch (error) {
      logger.error('Failed to read stored server access token', { error, serverId: activeServer.id });
      return null;
    }
  }

  if (serverStore.state.isHydrated) {
    return null;
  }

  try {
    return await getStorageAdapter().getItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    logger.error('Failed to read legacy server access token shadow', { error });
    return null;
  }
}

export async function clearLegacyServerAccessTokenShadow(): Promise<void> {
  try {
    await getStorageAdapter().removeItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    logger.error('Failed to clear legacy server access token shadow', { error });
  }
}

/**
 * Entfernt den aktiven Token aus der autorisierten Server-Quelle und räumt
 * parallel alte Shadow-Speicherpfade auf.
 */
export async function clearServerAccessToken(): Promise<void> {
  await clearLegacyServerAccessTokenShadow();

  const activeServer = getActiveServer();
  if (!activeServer?.accessToken) {
    return;
  }

  try {
    await updateServer(activeServer.id, { accessToken: undefined });
    logger.info('Server access token cleared from active server persistence');
  } catch (error) {
    logger.error('Failed to clear server access token from active server persistence', { error });
  }
}
