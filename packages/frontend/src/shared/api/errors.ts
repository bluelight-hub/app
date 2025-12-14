/**
 * API Error handling utilities.
 *
 * Bietet Hilfsfunktionen zur Verarbeitung und Formatierung von API-Fehlern
 * für benutzerfreundliche Fehlermeldungen.
 */

import { logger } from '@/shared/lib/logger';

/**
 * ResponseError Interface für TanStack Query Error Handling.
 *
 * Repräsentiert Fehler, die vom generierten API-Client zurückgegeben werden.
 */
export interface ResponseError extends Error {
  response?: Response;
  json?: unknown;
}

/**
 * Extrahiert eine benutzerfreundliche Fehlermeldung aus einem API-Error.
 *
 * Versucht, strukturierte Fehlermeldungen aus dem API-Response zu extrahieren.
 * Falls nicht verfügbar, wird eine Fallback-Nachricht verwendet.
 *
 * @param error - Der zu verarbeitende Fehler (unknown type für maximale Flexibilität)
 * @param fallbackMessage - Fallback-Nachricht, wenn keine spezifische Nachricht extrahiert werden kann
 * @param context - Optional: Kontext für Logging (z.B. 'createQualifikation')
 * @returns Benutzerfreundliche Fehlermeldung
 *
 * @example
 * ```typescript
 * try {
 *   await api.createQualifikation(data);
 * } catch (error) {
 *   const message = await getApiErrorMessage(
 *     error,
 *     'Die Qualifikation konnte nicht erstellt werden.',
 *     'createQualifikation'
 *   );
 *   toast.error(message);
 * }
 * ```
 */
export async function getApiErrorMessage(error: unknown, fallbackMessage = 'Ein unbekannter Fehler ist aufgetreten.', context?: string): Promise<string> {
  // Log error für Debugging (nur im Development Mode)
  if (context) {
    logger.error(`API Error [${context}]:`, error);
  }

  // Fall 1: ResponseError mit JSON-Body
  if (error && typeof error === 'object' && 'response' in error) {
    const responseError = error as ResponseError;

    try {
      // Versuche, JSON-Body zu parsen (falls noch nicht geparst)
      if (responseError.json) {
        const json = responseError.json as Record<string, unknown>;

        // Standardisierte API-Fehler-Struktur (NestJS)
        if (json.message) {
          if (Array.isArray(json.message)) {
            return json.message.join(', ');
          }
          if (typeof json.message === 'string') {
            return json.message;
          }
        }

        // Alternatives Fehlerformat
        if (json.error && typeof json.error === 'string') {
          return json.error;
        }
      }

      // Versuche, Response Body als JSON zu lesen
      if (responseError.response) {
        const clonedResponse = responseError.response.clone();
        const json = (await clonedResponse.json().catch(() => null)) as Record<string, unknown> | null;

        if (json?.message) {
          if (Array.isArray(json.message)) {
            return json.message.join(', ');
          }
          if (typeof json.message === 'string') {
            return json.message;
          }
        }

        if (json?.error && typeof json.error === 'string') {
          return json.error;
        }
      }
    } catch {
      // JSON-Parsing fehlgeschlagen → weiter zu Fallback
    }
  }

  // Fall 2: Standard Error Object
  if (error instanceof Error) {
    return error.message || fallbackMessage;
  }

  // Fall 3: String Error
  if (typeof error === 'string') {
    return error;
  }

  // Fall 4: Fallback
  return fallbackMessage;
}

/**
 * Prüft, ob ein Fehler ein Netzwerkfehler ist (keine Response vom Server).
 *
 * @param error - Der zu prüfende Fehler
 * @returns true, wenn es ein Netzwerkfehler ist
 *
 * @example
 * ```typescript
 * if (isNetworkError(error)) {
 *   toast.error('Keine Verbindung zum Server.');
 * }
 * ```
 */
export function isNetworkError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'response' in error) {
    return !(error as ResponseError).response;
  }
  return false;
}

/**
 * Extrahiert den HTTP-Statuscode aus einem ResponseError.
 *
 * @param error - Der zu prüfende Fehler
 * @returns HTTP-Statuscode oder null
 *
 * @example
 * ```typescript
 * const status = getErrorStatusCode(error);
 * if (status === 401) {
 *   // Redirect to login
 * }
 * ```
 */
export function getErrorStatusCode(error: unknown): number | null {
  if (error && typeof error === 'object' && 'response' in error) {
    const responseError = error as ResponseError;
    return responseError.response?.status ?? null;
  }
  return null;
}
