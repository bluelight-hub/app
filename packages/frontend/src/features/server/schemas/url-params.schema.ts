import { z } from 'zod';

/**
 * Zod-Schema für die Validierung von URL-Parametern.
 *
 * **Warum zwei optionale Parameter?**
 * - AC1: Beide Parameter vorhanden → Automatischer Exchange
 * - AC2: Nur `server` Parameter → Prefill im Form (Fallback)
 * - Beide optional ermöglicht flexible Nutzung
 *
 * **Warum .refine() statt .url()?**
 * - .url() ist deprecated in neueren Zod Versionen
 * - .refine() ermöglicht custom Validierung mit besserem Error Handling
 * - Compliance mit CLAUDE.md AC1 (keine deprecated Validators)
 *
 * **Sicherheit:**
 * - URL-Validierung verhindert Injection-Angriffe
 * - Protokoll-Check (nur HTTP/HTTPS) verhindert file://, javascript:// etc.
 * - Invite-Code Format-Check verhindert SQL-Injection
 *
 * @module features/server/schemas/url-params
 */
export const urlParamsSchema = z.object({
  /**
   * Server-URL Parameter.
   *
   * Validierung:
   * - Muss gültige URL sein (new URL() wirft bei Fehler)
   * - Muss http:// oder https:// Protokoll nutzen
   * - Optional (AC2: Fallback ohne Invite)
   */
  server: z
    .string()
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          // Erlaube nur HTTP/HTTPS Protokolle
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
          return false;
        }
      },
      {
        message: 'Server-URL muss eine gültige HTTP/HTTPS URL sein',
      },
    )
    .optional(),

  /**
   * Invite-Code Parameter.
   *
   * Validierung:
   * - Mindestens 8 Zeichen (Backend: exakt 8 Zeichen)
   * - Optional (AC2: Fallback nur mit Server)
   *
   * Hinweis: Backend validiert exakte Länge und Format,
   * Frontend prüft nur Mindestlänge für bessere UX.
   */
  invite: z.string().min(8, 'Invite-Code muss mindestens 8 Zeichen lang sein').optional(),
});

/**
 * TypeScript-Typ für URL-Parameter (inferred von Zod Schema)
 */
export type UrlParamsSchemaType = z.infer<typeof urlParamsSchema>;
