/**
 * Server Access Token Storage und Management
 *
 * Speichert den Server Access Token persistent (localStorage).
 * Der Token wird bei jedem API-Request als X-Server-Access-Token Header mitgesendet.
 *
 * **Wichtig:** Der Token wird beim Server-Setup via Invite Code erhalten
 * und automatisch gespeichert. Bei Token-Problemen wird der User zur
 * Server-Setup-Seite weitergeleitet.
 */

import { logger } from './logger';

const STORAGE_KEY = 'bluelight-hub-server-access-token';

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

/**
 * Speichert den Server Access Token persistent
 *
 * @param token - Der Server Access Token (z.B. "blh_xxx...")
 */
export function setServerAccessToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
    logger.info('Server access token saved');
  } catch (error) {
    logger.error('Failed to save server access token', { error });
  }
}

/**
 * Liest den gespeicherten Server Access Token
 *
 * @returns Der Token oder null wenn nicht vorhanden
 */
export function getServerAccessToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    logger.error('Failed to read server access token', { error });
    return null;
  }
}

/**
 * Loescht den gespeicherten Server Access Token
 */
export function clearServerAccessToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    logger.info('Server access token cleared');
  } catch (error) {
    logger.error('Failed to clear server access token', { error });
  }
}
