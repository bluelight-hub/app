import { z } from 'zod';
import { gefaehrdungItemSchema } from './gefaehrdung-item.schema.js';
import { cuidIdSchema } from './gefaehrdungsbeurteilung.schema.js';

/**
 * Response-Shape einer Vorlage (Seed-Szenario) — vom `GET …/gefaehrdungs-
 * beurteilungs-vorlagen`-Endpoint geliefert. `items` ist das komplette Array
 * der Gefährdungs-Items, das beim Create deep-kopiert wird.
 */
export const gefaehrdungsbeurteilungVorlageSchema = z.object({
  id: cuidIdSchema,
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  szenario: z.string().min(1).max(80),
  items: z.array(gefaehrdungItemSchema),
  version: z.number().int().positive(),
  aktiv: z.boolean(),
  erstelltAm: z.string(),
});

export type GefaehrdungsbeurteilungVorlage = z.infer<typeof gefaehrdungsbeurteilungVorlageSchema>;
