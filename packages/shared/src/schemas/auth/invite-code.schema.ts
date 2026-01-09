import { z } from 'zod';

/**
 * Konstanten für die Invite-Code-Validierung.
 *
 * Diese Konstanten sind synchronisiert mit dem Backend Value Object
 * `InviteCodeValue` aus `@domain/value-objects/invite-code-value.ts`.
 */
export const INVITE_CODE_CONSTRAINTS = {
  /** Exakte Länge des Invite-Codes */
  length: 8,
  /** Erlaubte Zeichen: Uppercase Buchstaben + Ziffern */
  alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  /** Format-Regex für Validierung */
  formatRegex: /^[A-Z0-9]{8}$/,
} as const;

/**
 * Zod-Schema für die Validierung von Invite-Codes.
 *
 * **Format:**
 * - Länge: 8 Zeichen
 * - Alphabet: A-Z (Großbuchstaben) + 0-9 (Ziffern)
 * - Beispiel: "ABC12345", "XYZ98765"
 *
 * **Normalisierung:**
 * - Input wird automatisch getrimmt und zu Uppercase konvertiert
 * - Frontend kann `.transform()` nutzen für Live-Normalisierung
 *
 * **Verwendung:**
 * - Frontend: Registrierungs-Formulare, Admin-Invite-Formulare
 * - Backend: DTOs für Invite-Code-Validierung (via @ValidateWithZod)
 *
 * WICHTIG: Dieses Schema wird sowohl im Frontend (Formulare)
 * als auch im Backend (DTOs) verwendet.
 *
 * @example
 * ```typescript
 * // Frontend Form mit Auto-Normalisierung
 * const formSchema = z.object({
 *   inviteCode: inviteCodeSchema.transform((val) => val.toUpperCase().trim()),
 * });
 *
 * // Backend DTO Validation
 * export class RegisterDto {
 *   @ValidateWithZod(inviteCodeSchema)
 *   inviteCode!: string;
 * }
 * ```
 */
export const inviteCodeSchema = z
  .string({
    required_error: 'Invite-Code wird benötigt',
    invalid_type_error: 'Invite-Code muss ein Text sein',
  })
  .trim()
  .length(INVITE_CODE_CONSTRAINTS.length, `Invite-Code muss exakt ${INVITE_CODE_CONSTRAINTS.length} Zeichen lang sein`)
  .regex(INVITE_CODE_CONSTRAINTS.formatRegex, 'Invite-Code darf nur Großbuchstaben (A-Z) und Ziffern (0-9) enthalten');

/**
 * Variante mit Auto-Normalisierung zu Uppercase.
 *
 * Nutze dieses Schema im Frontend für bessere UX
 * (User kann Kleinbuchstaben eingeben, werden automatisch konvertiert).
 *
 * @example
 * ```typescript
 * const form = useForm({
 *   defaultValues: { code: '' },
 *   validators: {
 *     onChange: z.object({ code: inviteCodeSchemaNormalized }),
 *   },
 * });
 * ```
 */
export const inviteCodeSchemaNormalized = z
  .string({
    required_error: 'Invite-Code wird benötigt',
    invalid_type_error: 'Invite-Code muss ein Text sein',
  })
  .trim()
  .transform((val) => val.toUpperCase())
  .pipe(inviteCodeSchema);

/**
 * TypeScript-Typ für Invite-Codes
 */
export type InviteCode = z.infer<typeof inviteCodeSchema>;

/**
 * Re-export Constraints für einfache Nutzung
 */
export { INVITE_CODE_CONSTRAINTS as INVITE_CODE_CRITERIA };
