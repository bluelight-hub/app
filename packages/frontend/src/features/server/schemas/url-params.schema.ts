import { z } from 'zod';

/**
 * Konstanten für die Invite-Code-Validierung.
 * Synchronisiert mit @bluelight-hub/shared/schemas (Zod v3).
 *
 * Da Frontend Zod v4 nutzt und shared Zod v3, können wir die Schemas
 * nicht direkt importieren. Stattdessen duplizieren wir die Konstanten
 * und halten sie konsistent mit den shared Schemas.
 */
const INVITE_CODE_CONSTRAINTS = {
  /** Exakte Länge des Invite-Codes */
  length: 8,
  /** Format-Regex für Validierung: Uppercase Buchstaben + Ziffern */
  formatRegex: /^[A-Z0-9]{8}$/,
} as const;

/**
 * Server-URL Schema (konsistent mit @bluelight-hub/shared/schemas/auth/server-url.schema.ts)
 *
 * Validiert URLs für Backend-Server-Verbindungen:
 * - Muss eine gültige URL sein
 * - Erlaubt http:// und https://
 * - Für Entwicklung: localhost und 127.0.0.1 erlaubt
 */
const serverUrlSchema = z
  .string()
  .url('Ungültige Server-URL')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        // Erlaube nur http/https
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    {
      message: 'Server-URL muss mit http:// oder https:// beginnen',
    },
  );

/**
 * Invite-Code Schema (konsistent mit @bluelight-hub/shared/schemas/auth/invite-code.schema.ts)
 *
 * Format:
 * - Länge: exakt 8 Zeichen
 * - Alphabet: A-Z (Großbuchstaben) + 0-9 (Ziffern)
 * - Beispiel: "ABC12345", "XYZ98765"
 */
const inviteCodeSchema = z
  .string('Invite-Code muss ein Text sein')
  .trim()
  .length(INVITE_CODE_CONSTRAINTS.length, `Invite-Code muss exakt ${INVITE_CODE_CONSTRAINTS.length} Zeichen lang sein`)
  .regex(INVITE_CODE_CONSTRAINTS.formatRegex, 'Invite-Code darf nur Großbuchstaben (A-Z) und Ziffern (0-9) enthalten');

/**
 * Zod-Schema für die Validierung von URL-Parametern.
 *
 * **Schema-Konsistenz:**
 * Die lokalen Schemas (serverUrlSchema, inviteCodeSchema) sind konsistent
 * mit den Schemas in @bluelight-hub/shared/schemas. Da das Frontend Zod v4
 * nutzt und das shared Package Zod v3, können wir die Schemas nicht direkt
 * importieren. Stattdessen verwenden wir die gleiche Validierungslogik.
 *
 * **Warum zwei optionale Parameter?**
 * - AC1: Beide Parameter vorhanden → Automatischer Exchange
 * - AC2: Nur `server` Parameter → Prefill im Form (Fallback)
 * - Beide optional ermöglicht flexible Nutzung
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
   * Nutzt die gleiche Validierungslogik wie @bluelight-hub/shared/schemas.
   * Optional (AC2: Fallback ohne Invite)
   */
  server: serverUrlSchema.optional(),

  /**
   * Invite-Code Parameter.
   *
   * Nutzt die gleiche Validierungslogik wie @bluelight-hub/shared/schemas.
   * Optional (AC2: Fallback nur mit Server)
   */
  invite: inviteCodeSchema.optional(),
});

// Re-export für Verwendung in anderen Teilen des Features
export { serverUrlSchema, inviteCodeSchema };

/**
 * TypeScript-Typ für URL-Parameter (inferred von Zod Schema)
 */
export type UrlParamsSchemaType = z.infer<typeof urlParamsSchema>;
