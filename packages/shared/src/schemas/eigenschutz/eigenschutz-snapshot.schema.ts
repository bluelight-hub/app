import { z } from 'zod';
import { cuidIdSchema } from './gefaehrdungsbeurteilung.schema.js';
import { gefaehrdungItemSchema } from './gefaehrdung-item.schema.js';
import { PsaProfilSchema } from './psa-profil.schema.js';

/**
 * Story 5.2 — Vertrags-Schema für den `kontextSnapshot` eines
 * `EigenschutzVorfall` (Architektur §B2 Z. 456-478, §F Z. 1110-1145).
 *
 * Single Source of Truth zwischen Backend (Aggregate-Validation,
 * Application-Builder, Mapper-Reconstitute) und Frontend (Read-Hook +
 * `IncidentContextSnapshot`-Organism). `.strict()` lehnt jede zusätzliche
 * Property ab — der Snapshot ist juristisch belastbar nur, wenn die Shape
 * exakt kontrolliert wird.
 */

/**
 * Snapshot-Repräsentation einer Gefährdungsbeurteilungs-Version, die zum
 * Vorfallzeitpunkt aktiv war. Trägt die Versions-Identität (FK) plus eine
 * Deep-Copy der Items, damit der Snapshot auch nach Löschung der
 * Versionszeile lesbar bleibt.
 */
export const GefaehrdungsbeurteilungSnapshotV1 = z
  .object({
    versionId: cuidIdSchema,
    version: z.number().int().positive(),
    gueltigVon: z.string().datetime({ offset: true }),
    items: z.array(gefaehrdungItemSchema),
  })
  .strict();
export type GefaehrdungsbeurteilungSnapshotV1Type = z.infer<typeof GefaehrdungsbeurteilungSnapshotV1>;

/**
 * Snapshot-Repräsentation einer aktiven `psa_profil_zuweisung`-Zeile zum
 * Vorfallzeitpunkt. Subset aus {@link PsaProfilZuweisungDtoSchemaV1} ohne
 * mutierbare Felder wie `version` — der Snapshot ist nicht versioniert.
 */
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

/**
 * Snapshot-Repräsentation einer Sicherheitsregel-Version, die zum
 * Vorfallzeitpunkt für die Einheit aktiv war (entweder einsatzweit oder
 * konkret zugeordnet). Der Builder dedupliziert pro `regelId+versionId`,
 * deshalb ist `einheitIds` ein Array — eine einsatzweite Regel wird hier
 * mit allen erreichbaren Einheiten gelistet, eine konkret zugeordnete
 * Regel mit der zugehörigen Einheit.
 */
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

/**
 * Vertrags-Schema des `kontextSnapshot`-JSONB für `EigenschutzVorfall`.
 *
 * `schemaVersion: 1` ist Pflicht. Future-V2-Pfad: neues Literal-Field, alte
 * V1-Snapshots bleiben lesbar (Architektur §F Z. 1133-1135).
 *
 * `gefaehrdungsbeurteilung` ist `nullable`, weil eine Einheit zum Zeitpunkt
 * keine Beurteilung gehabt haben kann; PSA- und Regeln-Listen sind
 * `[]`-tolerant (kein Fehler, leerer Stand).
 */
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
