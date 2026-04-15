/**
 * Zod-Schema für Funkkanal-Formulare.
 *
 * Wird vom `KanalEditDrawer` in Kombination mit `@tanstack/react-form`
 * genutzt und spiegelt die Backend-Discriminated-Union (`TmoDetailsDto`,
 * `DmoDetailsDto`, `AnalogDetailsDto`) eins-zu-eins wider.
 */

import { z } from 'zod';

export const tmoDetailsSchema = z.object({
  type: z.literal('tmo'),
  sprechgruppe: z.string().min(1, 'Sprechgruppe ist erforderlich'),
  gssi: z.string().optional(),
});

export const dmoDetailsSchema = z.object({
  type: z.literal('dmo'),
  dmoKanal: z.string().min(1, 'DMO-Kanal ist erforderlich'),
  repeater: z.string().optional(),
});

export const analogDetailsSchema = z.object({
  type: z.literal('analog'),
  band: z.enum(['4m', '2m']),
  frequenz: z.string().min(1, 'Frequenz ist erforderlich'),
  kanalnummer: z.string().optional(),
});

export const kanalDetailsSchema = z.discriminatedUnion('type', [tmoDetailsSchema, dmoDetailsSchema, analogDetailsSchema]);

export const kanalFormSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(100, 'Maximal 100 Zeichen'),
  details: kanalDetailsSchema,
  zweck: z.string().max(500, 'Maximal 500 Zeichen').optional(),
});

export type KanalFormValues = z.infer<typeof kanalFormSchema>;
export type KanalDetailsSchemaShape = z.infer<typeof kanalDetailsSchema>;
