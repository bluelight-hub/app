/**
 * Server Access Token Storage und Management
 *
 * Speichert den Server Access Token persistent (localStorage).
 * Der Token wird bei jedem API-Request als X-Server-Access-Token Header mitgesendet.
 *
 * **Wichtig:** Der Token wird beim ersten Setup generiert und muss vom User
 * sicher aufbewahrt werden. Falls der Token verloren geht, muss er manuell
 * eingegeben werden.
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
 * Event-Bus fuer Token-Aenderungen
 *
 * Ermoeglicht Komponenten auf Token-Aenderungen zu reagieren (z.B. Token-Required-Modal)
 */
type TokenEventType = 'token-required' | 'token-changed' | 'token-cleared';
type TokenEventListener = (event: TokenEventType) => void;

const listeners: Set<TokenEventListener> = new Set();

/**
 * Flag ob gerade ein Token-Prompt aktiv ist
 *
 * Wird gesetzt wenn 'token-required' Event emittiert wird.
 * Verhindert dass Error-Handler und Query-Retry-Logic unnoetig reagieren.
 */
let isTokenPromptActive = false;

/**
 * Flag ob gerade ein Setup-Redirect laeuft
 *
 * Wird gesetzt wenn SERVER_NOT_SETUP (503) erkannt wird.
 * Verhindert dass mehrere parallele Requests Toasts zeigen
 * waehrend der Redirect zur Setup-Seite laeuft.
 */
let isSetupRedirectActive = false;

/**
 * Registriert einen Listener fuer Token-Events
 */
export function onTokenEvent(listener: TokenEventListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Emittiert ein Token-Event an alle Listener
 */
function emitTokenEvent(event: TokenEventType): void {
  // Setze Flag wenn Token-Prompt angefordert wird
  if (event === 'token-required') {
    isTokenPromptActive = true;
  }
  // Resette Flag wenn Token gespeichert wurde
  if (event === 'token-changed' || event === 'token-cleared') {
    isTokenPromptActive = false;
  }

  for (const listener of listeners) {
    listener(event);
  }
}

/**
 * Prueft ob gerade ein Token-Prompt aktiv ist
 *
 * Kann von Error-Handlern verwendet werden um unnoetige Toasts/Retries zu vermeiden.
 */
export function isServerAccessTokenPromptActive(): boolean {
  return isTokenPromptActive;
}

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
 * Sollte aufgerufen werden sobald SERVER_NOT_SETUP erkannt wird,
 * BEVOR der eigentliche Redirect ausgefuehrt wird.
 */
export function setSetupRedirectInProgress(value: boolean): void {
  isSetupRedirectActive = value;
}

/**
 * Setzt das Token-Prompt-Flag zurueck
 *
 * Sollte aufgerufen werden wenn das Modal geschlossen wird ohne Token zu speichern.
 */
export function resetTokenPromptState(): void {
  isTokenPromptActive = false;
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
    emitTokenEvent('token-changed');
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
 * Prueft ob ein Server Access Token gespeichert ist
 */
export function hasServerAccessToken(): boolean {
  return getServerAccessToken() !== null;
}

/**
 * Loescht den gespeicherten Server Access Token
 */
export function clearServerAccessToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    logger.info('Server access token cleared');
    emitTokenEvent('token-cleared');
  } catch (error) {
    logger.error('Failed to clear server access token', { error });
  }
}

/**
 * Signalisiert dass ein Server Access Token benoetigt wird
 *
 * Wird aufgerufen wenn das Backend "Server access token required" zurueckgibt.
 * Listener (z.B. TokenRequiredModal) koennen darauf reagieren.
 */
export function requestServerAccessToken(): void {
  logger.info('Server access token required - prompting user');
  emitTokenEvent('token-required');
}

/**
 * Validiert das Format eines Server Access Tokens
 *
 * @param token - Der zu validierende Token
 * @returns true wenn das Format gueltig ist
 */
export function isValidTokenFormat(token: string): boolean {
  // Token muss mit "blh_" beginnen und mindestens 20 Zeichen haben
  return token.startsWith('blh_') && token.length >= 20;
}
