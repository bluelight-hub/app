import { z } from 'zod';
import { SERVER_ICON_PRESETS } from '../constants/server-icons';
import { SERVER_COLOR_PRESETS } from '../utils/server-color.utils';

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
 * Prüft ob der INSECURE_MODE aktiviert ist.
 *
 * Im INSECURE_MODE sind http:// Verbindungen erlaubt.
 * Ohne INSECURE_MODE sind nur https:// Verbindungen erlaubt.
 *
 * Die Umgebungsvariable wird zur Build-Zeit durch Vite ersetzt.
 */
export function isInsecureModeEnabled(): boolean {
  return import.meta.env.VITE_INSECURE_MODE === 'true';
}

/**
 * Server-URL Schema (konsistent mit @bluelight-hub/shared/schemas/auth/server-url.schema.ts)
 *
 * Validiert URLs für Backend-Server-Verbindungen:
 * - Muss eine gültige URL sein
 * - HTTPS immer erlaubt
 * - HTTP nur erlaubt wenn VITE_INSECURE_MODE='true'
 *
 * **AC6: URL-Validierung**
 * - URL wird auf gültiges Format validiert
 * - https:// immer erlaubt
 * - http:// nur für INSECURE_MODE
 */
/**
 * Generiert die Fehlermeldung für ungültige URL-Protokolle.
 * Dynamisch, damit die Meldung zur Validierungszeit korrekt ist.
 */
function getProtocolErrorMessage(): string {
  return isInsecureModeEnabled() ? 'Server-URL muss mit http:// oder https:// beginnen' : 'Server-URL muss mit https:// beginnen. HTTP ist nur im Entwicklungsmodus erlaubt.';
}

const serverUrlSchema = z
  .string()
  .url({ message: 'Ungültige Server-URL' })
  .superRefine((url, ctx) => {
    try {
      const parsed = new URL(url);
      // HTTPS ist immer erlaubt
      if (parsed.protocol === 'https:') {
        return; // Valid
      }
      // HTTP nur erlaubt wenn INSECURE_MODE aktiviert ist
      if (parsed.protocol === 'http:') {
        if (isInsecureModeEnabled()) {
          return; // Valid im INSECURE_MODE
        }
        // HTTP nicht erlaubt ohne INSECURE_MODE
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: getProtocolErrorMessage(),
        });
        return;
      }
      // Andere Protokolle (file://, javascript://, etc.) sind nie erlaubt
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: getProtocolErrorMessage(),
      });
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ungültige Server-URL',
      });
    }
  });

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

/**
 * Server-Name Schema
 *
 * Pflichtfeld für den Display-Namen des Servers.
 * Wird automatisch aus der URL (Hostname) befüllt, kann aber manuell geändert werden.
 * Muss eindeutig sein (Duplikat-Check erfolgt im Form/Store).
 *
 * Format:
 * - Mindestens 1 Zeichen (Pflichtfeld)
 * - Maximal 100 Zeichen
 * - Wird getrimmt vor Validierung
 */
const serverNameSchema = z.string('Server-Name muss ein Text sein').trim().min(1, 'Server-Name ist ein Pflichtfeld').max(100, 'Server-Name darf maximal 100 Zeichen haben');

/**
 * Admin-Username Schema
 *
 * Validiert den Nutzernamen für den Admin-Account beim initialen Setup.
 * Konsistent mit Backend-Validierung in CompleteSetupDto.
 *
 * Regeln:
 * - Mindestens 3 Zeichen
 * - Maximal 20 Zeichen
 * - Nur alphanumerische Zeichen, Bindestriche und Unterstriche
 */
const adminUsernameSchema = z
  .string('Nutzername muss ein Text sein')
  .min(3, 'Nutzername muss mindestens 3 Zeichen haben')
  .max(20, 'Nutzername darf maximal 20 Zeichen haben')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Nutzername darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten');

/**
 * Admin-Password Schema
 *
 * Validiert das Passwort für den Admin-Account beim initialen Setup.
 * Konsistent mit Backend-Validierung in CompleteSetupDto.
 *
 * Regeln:
 * - Mindestens 8 Zeichen
 * - Mindestens ein Großbuchstabe
 * - Mindestens ein Kleinbuchstabe
 * - Mindestens eine Ziffer
 * - Mindestens ein Sonderzeichen
 */
const adminPasswordSchema = z
  .string('Passwort muss ein Text sein')
  .min(8, 'Passwort muss mindestens 8 Zeichen haben')
  .refine((val) => /[A-Z]/.test(val), 'Passwort muss mindestens einen Großbuchstaben enthalten')
  .refine((val) => /[a-z]/.test(val), 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
  .refine((val) => /[0-9]/.test(val), 'Passwort muss mindestens eine Ziffer enthalten')
  .refine((val) => /[^a-zA-Z0-9]/.test(val), 'Passwort muss mindestens ein Sonderzeichen enthalten');

/**
 * Generierte Icon-Werte aus den Presets für Zod-Enum.
 * Typisiert als Tuple für Zod's enum-Anforderung (mindestens 1 Element).
 */
const iconValues = SERVER_ICON_PRESETS.map((p) => p.value) as [string, ...string[]];

/**
 * Server-Icon Schema
 *
 * Optionales Feld für das Server-Icon.
 * Die erlaubten Werte werden aus SERVER_ICON_PRESETS generiert.
 */
const serverIconSchema = z.enum(iconValues).optional();

/**
 * Generierte Farb-Werte aus den Presets für Zod-Enum.
 * Typisiert als Tuple für Zod's enum-Anforderung (mindestens 1 Element).
 */
const colorValues = SERVER_COLOR_PRESETS.map((p) => p.value) as [string, ...string[]];

/**
 * Server-Color Schema
 *
 * Optionales Feld für die Server-Farbe.
 * Die erlaubten Werte werden aus SERVER_COLOR_PRESETS generiert.
 */
const serverColorSchema = z.enum(colorValues).optional();

// Re-export für Verwendung in anderen Teilen des Features
export { serverUrlSchema, inviteCodeSchema, serverNameSchema, adminUsernameSchema, adminPasswordSchema, serverIconSchema, serverColorSchema };

/**
 * TypeScript-Typ für URL-Parameter (inferred von Zod Schema)
 */
export type UrlParamsSchemaType = z.infer<typeof urlParamsSchema>;
