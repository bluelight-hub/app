import { z } from 'zod';

/**
 * Backend-Kopie des Eigenschutz-Kontext-Snapshot-Schemas (Story 5.2 AC1).
 *
 * **Warum eine Kopie statt Re-Use von `@bluelight-hub/shared/schemas`?**
 * Backend ist (Stand Story 5.2) nicht ESM-migriert; der `package.json`-
 * `exports`-Map des shared-Pakets liefert nur ESM-Builds (`type: module`),
 * was `nest build` (CommonJS-tsc) nicht auflösen kann — und ein direkter
 * relativer Quell-Import (`../../../../../shared/src/...`) verletzt die
 * `rootDir`-Constraint des Backend-Builds. Pattern identisch zu
 * `telemetry-event.schema.ts` (Story 3.11) und `risikoklasse-berechnung.ts`.
 *
 * **Vertrag:** Diese Datei spiegelt 1:1 die Shape von
 * `packages/shared/src/schemas/eigenschutz/eigenschutz-snapshot.schema.ts`.
 * Drift-Detection läuft im Test (`eigenschutz-snapshot.schema.spec.ts`)
 * gegen die shared-Quelle. Sobald das Backend auf ESM migriert ist,
 * fällt die Duplizierung weg.
 */

export const cuidIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]{20,32}$/, 'Ungültige CUID');

const PsaProfilSchema = z.enum(['BASIS', 'INFEKTION', 'VU', 'CBRN_PATIENT', 'VOLLSCHUTZ']);

const gefaehrdungItemSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9]{20,32}$/)
    .optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  eintritt: z.enum(['SELTEN', 'GELEGENTLICH', 'HAEUFIG', 'OFT', 'STAENDIG']).optional(),
  schaden: z.enum(['VERNACHLAESSIGBAR', 'GERING', 'MITTEL', 'HOCH', 'KATASTROPHAL']).optional(),
  risikoklasse: z.enum(['GRUEN', 'GELB', 'ORANGE', 'ROT']).optional(),
  schutzmassnahmen: z.string().trim().max(2000).optional(),
});

export const GefaehrdungsbeurteilungSnapshotV1 = z
  .object({
    versionId: cuidIdSchema,
    version: z.number().int().positive(),
    gueltigVon: z.string().datetime({ offset: true }),
    items: z.array(gefaehrdungItemSchema),
  })
  .strict();
export type GefaehrdungsbeurteilungSnapshotV1Type = z.infer<typeof GefaehrdungsbeurteilungSnapshotV1>;

export const PsaProfilSnapshotV1 = z
  .object({
    id: cuidIdSchema,
    profil: PsaProfilSchema,
    gueltigVon: z.string().datetime({ offset: true }),
    gueltigBis: z.string().datetime({ offset: true }).nullable(),
    begruendung: z.string(),
    propagationGroupId: cuidIdSchema,
  })
  .strict();
export type PsaProfilSnapshotV1Type = z.infer<typeof PsaProfilSnapshotV1>;

export const SicherheitsregelSnapshotV1 = z
  .object({
    regelId: cuidIdSchema,
    versionId: cuidIdSchema,
    version: z.number().int().positive(),
    titel: z.string(),
    inhalt: z.string(),
    einsatzweit: z.boolean(),
    einheitIds: z.array(cuidIdSchema),
    gueltigVon: z.string().datetime({ offset: true }),
  })
  .strict();
export type SicherheitsregelSnapshotV1Type = z.infer<typeof SicherheitsregelSnapshotV1>;

export const EigenschutzKontextSnapshotV1 = z
  .object({
    schemaVersion: z.literal(1),
    snapshotAt: z.string().datetime({ offset: true }),
    einsatzId: cuidIdSchema,
    einheitId: cuidIdSchema,
    gefaehrdungsbeurteilung: GefaehrdungsbeurteilungSnapshotV1.nullable(),
    aktivePsaProfile: z.array(PsaProfilSnapshotV1),
    sicherheitsregeln: z.array(SicherheitsregelSnapshotV1),
  })
  .strict();
export type EigenschutzKontextSnapshotV1Type = z.infer<typeof EigenschutzKontextSnapshotV1>;
