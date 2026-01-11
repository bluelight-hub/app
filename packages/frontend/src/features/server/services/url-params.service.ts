/**
 * URL Parameters Service
 *
 * Verwaltet URL-Parameter Parsing und Validierung für Web-basierte Server-Konfiguration.
 * Ermöglicht automatischen Invite-Code Exchange (AC1) oder Server-Prefill (AC2).
 *
 * **Use Cases:**
 * - AC1: Beide Parameter (server + invite) → Automatischer Exchange
 * - AC2: Nur server Parameter → Prefill im Formular (Fallback)
 *
 * **Pattern:** Pure Functions (keine Side-Effects, vollständig testbar)
 */

import type { UrlParamsSchemaType } from '../schemas/url-params.schema';
import { urlParamsSchema, inviteCodeSchema } from '../schemas/url-params.schema';
import type { ZodError } from 'zod';

/**
 * Validation Result Type mit Type-Safety.
 *
 * Nutzt discriminated union für Type-Guards:
 * - success: true → data ist verfügbar
 * - success: false → error ist verfügbar
 */
export type ValidationResult<T> = { success: true; data: T } | { success: false; error: ZodError };

/**
 * Parst URL-Parameter aus window.location.search.
 *
 * Nutzt URLSearchParams API für robustes Parsing ohne externe Dependencies.
 * Parameter werden nur extrahiert wenn vorhanden (undefined wenn fehlt).
 *
 * **Warum URLSearchParams statt RegEx?**
 * - Standard Browser API (keine Dependencies)
 * - Automatisches URL-Decoding (%20 → Space)
 * - Sichere Handling von Edge Cases (mehrfache ?, &, =)
 *
 * @param searchString - URL Query String (optional, default: window.location.search)
 * @returns Parsed Parameter Object (server/invite oder leer)
 *
 * @example
 * ```ts
 * // URL: https://app.de?server=https://api.de&invite=ABC12345
 * const params = parseUrlParams();
 * // => { server: 'https://api.de', invite: 'ABC12345' }
 * ```
 */
export function parseUrlParams(searchString?: string): Partial<UrlParamsSchemaType> {
  // Nutze window.location.search als Default (Web-Kontext)
  const search = searchString ?? (typeof window !== 'undefined' ? window.location.search : '');

  const urlParams = new URLSearchParams(search);

  // Extrahiere nur vorhandene Parameter (undefined wenn fehlt)
  const result: Partial<UrlParamsSchemaType> = {};

  const server = urlParams.get('server');
  if (server !== null) {
    result.server = server;
  }

  const invite = urlParams.get('invite');
  if (invite !== null) {
    result.invite = invite;
  }

  return result;
}

/**
 * Validiert URL-Parameter gegen Zod Schema.
 *
 * Wrapper um urlParamsSchema.safeParse() mit typed Result.
 * Ermöglicht Type-Safe Error Handling ohne try-catch.
 *
 * **Warum safeParse() statt parse()?**
 * - parse() wirft Exception → unpraktisch für UI-Fehlerbehandlung
 * - safeParse() gibt { success: boolean } → Type-Safe Error Handling
 * - Keine try-catch nötig → cleaner Code
 *
 * @param params - Parsed URL Parameter (von parseUrlParams())
 * @returns Validation Result mit success Flag und data/error
 *
 * @example
 * ```ts
 * const params = parseUrlParams();
 * const validation = validateParams(params);
 *
 * if (validation.success) {
 *   console.log('Valid:', validation.data.server);
 * } else {
 *   console.error('Errors:', validation.error.errors);
 * }
 * ```
 */
export function validateParams(params: Partial<UrlParamsSchemaType>): ValidationResult<UrlParamsSchemaType> {
  const result = urlParamsSchema.safeParse(params);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
}

/**
 * Normalisiert Server-URL mit HTTP/HTTPS Protokoll.
 *
 * Stellt sicher, dass URL ein gültiges Protokoll hat:
 * - URL mit Protokoll → unverändert
 * - URL ohne Protokoll → https:// Prefix (sicheres Default)
 *
 * **Warum HTTPS als Default?**
 * - Sichere Kommunikation (Passwörter, Tokens)
 * - Browser-Anforderungen (Mixed Content Blocking)
 * - Best Practice für moderne Web-Apps
 *
 * **Edge Cases:**
 * - 'api.example.de' → 'https://api.example.de'
 * - 'http://api.example.de' → 'http://api.example.de' (unverändert)
 * - 'https://api.example.de' → 'https://api.example.de' (unverändert)
 * - 'file:///path' → 'file:///path' (unverändert, wird später von Zod abgelehnt)
 *
 * @param url - Server URL (mit oder ohne Protokoll)
 * @returns Normalisierte URL mit Protokoll
 *
 * @example
 * ```ts
 * normalizeServerUrl('api.example.de'); // 'https://api.example.de'
 * normalizeServerUrl('http://api.example.de'); // 'http://api.example.de'
 * normalizeServerUrl('https://api.example.de'); // 'https://api.example.de'
 * ```
 */
export function normalizeServerUrl(url: string): string {
  const trimmed = url.trim();

  // Prüfe ob URL bereits ein Protokoll hat
  if (trimmed.includes('://')) {
    return trimmed;
  }

  // HTTPS als sicheres Default
  return `https://${trimmed}`;
}

/**
 * Prüft ob Invite-Code valides Format hat.
 *
 * M5 FIX: Nutzt das zentrale inviteCodeSchema für konsistente Validierung.
 * Das Schema prüft: exakt 8 Zeichen, Großbuchstaben A-Z und Ziffern 0-9.
 *
 * **Warum Schema statt manueller Prüfung?**
 * - Konsistente Validierung im gesamten Frontend
 * - Single Source of Truth für Invite-Code-Format
 * - Schema ist synchronisiert mit Backend-Validierung
 *
 * **Sicherheit:**
 * - Keine SQL-Injection-Gefahr (Schema validiert Format)
 * - Finale Validierung erfolgt serverseitig
 *
 * @param inviteCode - Invite Code String
 * @returns true wenn valide nach Schema (exakt 8 Zeichen, A-Z0-9)
 *
 * @example
 * ```ts
 * isValidInviteCode('ABC12345'); // true (8 Zeichen, A-Z0-9)
 * isValidInviteCode('abc12345'); // false (Kleinbuchstaben)
 * isValidInviteCode('ABC123'); // false (nur 6 Zeichen)
 * isValidInviteCode(''); // false (leer)
 * ```
 */
export function isValidInviteCode(inviteCode: string): boolean {
  return inviteCodeSchema.safeParse(inviteCode).success;
}
