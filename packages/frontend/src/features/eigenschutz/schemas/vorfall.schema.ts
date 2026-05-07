/**
 * Zod-Schemas für das Vorfall-Drawer-Form (Story 5.1, AC10).
 *
 * Wert-Caps spiegeln die Backend-Aggregate-Invarianten 1:1 (siehe
 * AC1/AC2/AC6 im Story-Spec):
 * - `was`: 1–80 Zeichen
 * - `wo.coordinate.addressHint`: ≤ 300 Zeichen
 * - `wo.freitext.text`: 1–480 Zeichen (JSON-Cap der `VarChar(500)`-Spalte)
 * - `beteiligte[].user.userId`: CUID2-Pattern
 * - `beteiligte[].freitext.name`: 1–200 Zeichen
 * - `beteiligte[*].rolle`: ≤ 100 Zeichen
 * - `massnahmen`: ≤ 4000 Zeichen
 */

import { z } from 'zod';

const cuid2Pattern = /^[a-z0-9]{20,32}$/;

export const woCoordinateSchema = z.object({
  kind: z.literal('coordinate'),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  addressHint: z.string().trim().max(300).optional(),
});

export const woFreitextSchema = z.object({
  kind: z.literal('freitext'),
  text: z.string().trim().min(1).max(480),
});

export const woSchema = z.discriminatedUnion('kind', [woCoordinateSchema, woFreitextSchema]);

export const beteiligterUserSchema = z.object({
  kind: z.literal('user'),
  userId: z.string().regex(cuid2Pattern, { message: 'userId muss eine CUID2 sein' }),
  rolle: z.string().trim().max(100).optional(),
});

export const beteiligterFreitextSchema = z.object({
  kind: z.literal('freitext'),
  name: z.string().trim().min(1).max(200),
  rolle: z.string().trim().max(100).optional(),
});

export const beteiligterSchema = z.discriminatedUnion('kind', [beteiligterUserSchema, beteiligterFreitextSchema]);

export const reportVorfallFormSchema = z.object({
  einheitId: z.string().regex(cuid2Pattern, { message: 'einheitId muss eine CUID2 sein' }),
  was: z.string().trim().min(1, 'Beschreibung ist erforderlich').max(80),
  wann: z.string().min(1, 'Zeitpunkt ist erforderlich'),
  vorfallZeit: z.string().min(1, 'Zeitpunkt ist erforderlich'),
  wo: woSchema.nullable(),
  beteiligte: z.array(beteiligterSchema).max(50),
  massnahmen: z.string().max(4000),
  unfallkasseRelevant: z.boolean(),
});

export type ReportVorfallFormValues = z.infer<typeof reportVorfallFormSchema>;
export type WoFormValue = z.infer<typeof woSchema>;
export type BeteiligterFormValue = z.infer<typeof beteiligterSchema>;
