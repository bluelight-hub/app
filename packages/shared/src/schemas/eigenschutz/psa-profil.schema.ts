import { z } from 'zod';
import { cuidIdSchema } from './gefaehrdungsbeurteilung.schema.js';

/**
 * Enum-Schema der 5 PSA-Profile (Story 1.4 / 3.1). Die Liste ist 1:1
 * gespiegelt aus dem Prisma-Enum `PsaProfil`; Drift-Detection könnte
 * Story 7.x via Fixture-Test ergänzen.
 */
export const PsaProfilSchema = z.enum(['BASIS', 'INFEKTION', 'VU', 'CBRN_PATIENT', 'VOLLSCHUTZ']);
export type PsaProfilValue = z.infer<typeof PsaProfilSchema>;

/**
 * Maximalzahl der Profil-Toggles in einem Single- oder Bulk-Request.
 * Spiegelt die Backend-DTO-Grenze (`PSA_PROFIL_TOGGLE_LIMIT`).
 */
export const PSA_PROFIL_TOGGLE_LIMIT = 5;

/**
 * Defense-Cap für das Backend `@Max(2_147_483_647)` auf `expectedVersion` —
 * entspricht dem Postgres `INT4`-Maximum, damit gültige DB-Versionen nicht
 * vom DTO abgewiesen werden können. Hier gespiegelt, damit das Frontend
 * dieselbe Grenze schon vor dem Submit prüft.
 */
export const PSA_PROFIL_EXPECTED_VERSION_MAX = 2_147_483_647;

/**
 * Toggle-Eintrag pro Profil (Frontend-Form-State).
 *
 * `expectedVersion` ist Pflicht für Schließ-Pfade (Deaktivierung +
 * Reaktivierung mit Vor-Profil); für reine Aktivierung ohne Vor-Profil
 * wird das Feld weggelassen — das Backend ignoriert es dann (siehe
 * Story 3.1 AC4).
 */
export const PsaProfilToggleSchemaV1 = z.object({
  profil: PsaProfilSchema,
  aktivieren: z.boolean(),
  expectedVersion: z.number().int().positive().max(PSA_PROFIL_EXPECTED_VERSION_MAX).optional(),
});
export type PsaProfilToggleInput = z.infer<typeof PsaProfilToggleSchemaV1>;

/**
 * Request-Body für
 * `POST /einsaetze/:einsatzId/sicherheit/eigenschutz/psa-profile/einheiten/:einheitId/change`
 * (Story 3.1 AC1/AC2).
 *
 * `begruendung` ist Pflicht; `.trim()` schließt Whitespace-only-Strings
 * vor der Längenprüfung aus.
 */
export const ChangePsaProfilSchemaV1 = z.object({
  profilToggles: z.array(PsaProfilToggleSchemaV1).min(1, 'Mindestens ein Profil auswählen').max(PSA_PROFIL_TOGGLE_LIMIT, `Maximal ${PSA_PROFIL_TOGGLE_LIMIT} Profile`),
  begruendung: z.string().trim().min(1, 'Begründung ist verpflichtend').max(500, 'Begründung darf maximal 500 Zeichen lang sein'),
});
export type ChangePsaProfilInput = z.infer<typeof ChangePsaProfilSchemaV1>;

/**
 * Defense-Cap für `einheitIds.length` im Bulk-Endpoint
 * (`POST /einsaetze/:einsatzId/sicherheit/eigenschutz/psa-profile/bulk-aendern`,
 * Story 3.2 AC10). Spiegelt die Backend-DTO-Grenze.
 */
export const BULK_CHANGE_PSA_PROFIL_EINHEIT_IDS_MAX = 50;

/**
 * Request-Body für den Bulk-Endpoint (Story 3.2 AC10).
 *
 * Spiegelt das Backend-DTO `BulkChangePsaProfilDto`. Das Frontend nutzt
 * den generierten API-Client; dieses Schema dient als Source-of-Truth-
 * Spiegelung für Frontend-seitige Pre-Flight-Validation und für
 * künftige Drift-Detection-Fixture-Tests.
 */
export const BulkChangePsaProfilSchemaV1 = z.object({
  einheitIds: z
    .array(cuidIdSchema)
    .min(1, 'Mindestens eine Einheit erforderlich')
    .max(BULK_CHANGE_PSA_PROFIL_EINHEIT_IDS_MAX, `Maximal ${BULK_CHANGE_PSA_PROFIL_EINHEIT_IDS_MAX} Einheiten pro Bulk-Operation`),
  profilToggles: z.array(PsaProfilToggleSchemaV1).min(1, 'Mindestens ein Profil auswählen').max(PSA_PROFIL_TOGGLE_LIMIT, `Maximal ${PSA_PROFIL_TOGGLE_LIMIT} Profile`),
  begruendung: z.string().trim().min(1, 'Begründung ist verpflichtend').max(500, 'Begründung darf maximal 500 Zeichen lang sein'),
});
export type BulkChangePsaProfilInput = z.infer<typeof BulkChangePsaProfilSchemaV1>;

/**
 * Response-Shape einer einzelnen PSA-Profil-Zuweisung (Read-Pfad + Mutation-
 * Antwort, Story 3.1 AC9).
 */
export const PsaProfilZuweisungDtoSchemaV1 = z.object({
  id: cuidIdSchema,
  einsatzId: cuidIdSchema,
  einheitId: cuidIdSchema,
  profil: PsaProfilSchema,
  gueltigVon: z.string(),
  gueltigBis: z.string().nullable(),
  aktiviertVonUserId: z.string(),
  begruendung: z.string(),
  propagationGroupId: z.string(),
  version: z.number().int().positive(),
});
export type PsaProfilZuweisungDto = z.infer<typeof PsaProfilZuweisungDtoSchemaV1>;

/**
 * Mutation-Response des Toggle-Endpoints — trägt die `propagationGroupId`
 * der Operation und alle nach der Mutation aktiven Zuweisungs-Rows.
 */
export const ChangePsaProfilResponseSchemaV1 = z.object({
  propagationGroupId: z.string(),
  affected: z.array(PsaProfilZuweisungDtoSchemaV1),
});
export type ChangePsaProfilResponse = z.infer<typeof ChangePsaProfilResponseSchemaV1>;
