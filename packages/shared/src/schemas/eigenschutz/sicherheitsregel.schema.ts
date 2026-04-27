import { z } from 'zod';
import { cuidIdSchema } from './gefaehrdungsbeurteilung.schema.js';

/**
 * Diskriminierte Union für die Zuordnung einer Sicherheitsregel:
 *
 * - `einsatzweit: true` — Regel gilt für den gesamten Einsatz, keine
 *   Einheiten-Auswahl erforderlich (und explizit nicht erlaubt).
 * - `einsatzweit: false` — Regel gilt für mindestens eine konkrete
 *   `EinsatzEinheit`; `einheitIds` muss mindestens einen Eintrag enthalten.
 *
 * Die Discriminator-Variante erzwingt zur Laufzeit, dass Frontend und Backend
 * nicht versehentlich „einsatzweit plus Einheiten" oder „nicht einsatzweit
 * ohne Einheiten" senden können.
 */
const zuordnungSchema = z.discriminatedUnion('einsatzweit', [
  z.object({
    einsatzweit: z.literal(true),
  }),
  z.object({
    einsatzweit: z.literal(false),
    einheitIds: z.array(cuidIdSchema).min(1, 'Mindestens eine Einheit muss ausgewählt werden'),
  }),
]);

/**
 * Request-Body für `POST /einsatz/:einsatzId/sicherheitsregeln` (Story 2.6).
 *
 * - `titel` wird vor der Längenprüfung getrimmt, damit Whitespace-only-Strings
 *   nicht als gültig durchrutschen. Business-Limit 1–80 Zeichen (Epic 2.6).
 * - `inhalt` ebenfalls getrimmt, 1–2000 Zeichen.
 * - Zuordnung erfolgt als diskriminierte Union über `einsatzweit` (siehe
 *   `zuordnungSchema`): entweder einsatzweit oder mit konkreten Einheiten.
 */
export const SicherheitsregelCreateSchemaV1 = z
  .object({
    titel: z.string().trim().min(1, 'Titel darf nicht leer sein').max(80, 'Titel darf maximal 80 Zeichen lang sein'),
    inhalt: z.string().trim().min(1, 'Inhalt darf nicht leer sein').max(2000, 'Inhalt darf maximal 2000 Zeichen lang sein'),
  })
  .and(zuordnungSchema);

export type CreateSicherheitsregelInput = z.infer<typeof SicherheitsregelCreateSchemaV1>;

/**
 * Request-Body für `PUT /einsatz/:einsatzId/sicherheitsregeln/:id` (Story 2.6).
 *
 * Identisch zu {@link SicherheitsregelCreateSchemaV1}, zusätzlich mit
 * `expectedVersion` für Optimistic-Concurrency-Control: das Backend lehnt
 * Updates ab, falls die übergebene Version nicht der aktuellen Aggregat-
 * Version entspricht (409 Conflict).
 */
export const SicherheitsregelUpdateSchemaV1 = z
  .object({
    titel: z.string().trim().min(1, 'Titel darf nicht leer sein').max(80, 'Titel darf maximal 80 Zeichen lang sein'),
    inhalt: z.string().trim().min(1, 'Inhalt darf nicht leer sein').max(2000, 'Inhalt darf maximal 2000 Zeichen lang sein'),
    expectedVersion: z.number().int().positive('expectedVersion muss eine positive Ganzzahl sein'),
  })
  .and(zuordnungSchema);

export type UpdateSicherheitsregelInput = z.infer<typeof SicherheitsregelUpdateSchemaV1>;

/**
 * Response-Shape einer Sicherheitsregel.
 *
 * - `einheitId: null` bedeutet: Regel gilt einsatzweit. In diesem Fall ist
 *   `einsatzweit === true` (vom Backend aus `einheitId === null` abgeleitet).
 * - `propagationGroupId` ist die logische Gruppen-Identität über mehrere
 *   Einheiten hinweg (stammt aus der Event-Payload) — alle Einträge derselben
 *   ursprünglichen Sicherheitsregel teilen sich diese ID, auch wenn sie pro
 *   Einheit als eigener Datensatz materialisiert werden.
 * - `version` ist die aktuelle Aggregat-Version für Optimistic Concurrency.
 */
export const SicherheitsregelDtoSchemaV1 = z.object({
  id: cuidIdSchema,
  einsatzId: cuidIdSchema,
  einheitId: cuidIdSchema.nullable(),
  einsatzweit: z.boolean(),
  titel: z.string(),
  inhalt: z.string(),
  version: z.number().int().positive(),
  erstelltAm: z.string(),
  erstelltVonUserId: z.string(),
  aktualisiertAm: z.string(),
  aktualisiertVonUserId: z.string(),
  propagationGroupId: z.string(),
});

export type SicherheitsregelDto = z.infer<typeof SicherheitsregelDtoSchemaV1>;

/**
 * Request-Body für `POST /sicherheitsregeln/:id/quittieren` (Story 2.7 AC2).
 *
 * - `einheitId` ist Pflicht, auch wenn die Regel einsatzweit ist — die
 *   konkrete quittierende Einheit ist Bestandteil der Quittungs-Identität
 *   (`@@unique([regelId, einheitId])` im Prisma-Schema).
 * - `expectedRegelVersion` ist optional (OCC). Wenn gesetzt und nicht-passend
 *   antwortet das Backend mit 409.
 */
export const AckSicherheitsregelInputSchemaV1 = z.object({
  einheitId: cuidIdSchema,
  expectedRegelVersion: z.number().int().positive('expectedRegelVersion muss eine positive Ganzzahl sein').optional(),
});

export type AckSicherheitsregelInput = z.infer<typeof AckSicherheitsregelInputSchemaV1>;

/**
 * Response-Element für `GET /sicherheitsregeln/:id/quittungen` (Story 2.7 AC10).
 *
 * Zeile pro quittierender Einheit. `quittiertVonUserName` ist optional und
 * wird per Phase-2-Enrichment aus dem User-Repository nachgeladen, sobald
 * die Backend-Pipeline das unterstützt.
 */
export const SicherheitsregelQuittungSchemaV1 = z.object({
  einheitId: cuidIdSchema,
  einheitName: z.string(),
  quittiertAm: z.string(),
  quittiertVonUserId: z.string(),
  quittiertVonUserName: z.string().optional(),
});

export type SicherheitsregelQuittung = z.infer<typeof SicherheitsregelQuittungSchemaV1>;
