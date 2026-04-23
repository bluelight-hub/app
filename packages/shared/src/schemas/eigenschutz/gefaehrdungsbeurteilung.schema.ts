import { z } from 'zod';
import { gefaehrdungItemSchema } from './gefaehrdung-item.schema.js';

/**
 * CUID-Schema (Prisma-Default-ID). Zod v4 unterstützt `cuid2` nativ, Prisma
 * generiert aber klassische CUIDs (Collision-Resistant Unique IDs, 25 Zeichen,
 * start `c`). Darum prüft das Schema beide Varianten über eine einfache
 * Regex — strikter als `z.string().min(1)`, aber kompatibel mit CUID v1 + v2.
 */
export const cuidIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]{20,32}$/, 'Ungültige CUID');

/**
 * Request-Body für `POST /gefaehrdungsbeurteilungen`.
 *
 * - `einheitId` Pflichtfeld — eine Beurteilung gehört immer zu genau einer
 *   `EinsatzEinheit`.
 * - `vorlageId` optional — falls gesetzt, wird das `items`-JSONB deep-kopiert.
 * - `gefahrenzoneId` optional (FR54, Q6-MVP-Referenz; keine Auto-Übernahme von
 *   Items — Phase 2 in FR8).
 */
export const createGefaehrdungsbeurteilungSchema = z.object({
  einheitId: cuidIdSchema,
  vorlageId: cuidIdSchema.optional(),
  gefahrenzoneId: cuidIdSchema.optional(),
});

export type CreateGefaehrdungsbeurteilungInput = z.infer<typeof createGefaehrdungsbeurteilungSchema>;

/**
 * Response-Shape der Haupt-Entität. Wird vom Backend-Controller gerendert und
 * vom Frontend-Hook konsumiert. `items` ist das Live-JSONB-Array (Deep-Copy
 * bereits im Backend-Handler ausgeführt).
 */
export const gefaehrdungsbeurteilungSchema = z.object({
  id: cuidIdSchema,
  einsatzId: cuidIdSchema,
  einheitId: cuidIdSchema,
  vorlageId: cuidIdSchema.nullable().optional(),
  gefahrenzoneId: cuidIdSchema.nullable().optional(),
  items: z.array(gefaehrdungItemSchema),
  version: z.number().int().positive(),
  erstelltAm: z.string(),
  erstelltVonUserId: z.string(),
  aktualisiertAm: z.string(),
  aktualisiertVonUserId: z.string(),
});

export type Gefaehrdungsbeurteilung = z.infer<typeof gefaehrdungsbeurteilungSchema>;
