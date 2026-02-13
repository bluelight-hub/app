import { z } from 'zod';

/**
 * Schema für Erinnerungsvorlage erstellen.
 *
 * **Story 6.1 AC1/AC3:**
 * - Titel erforderlich, max 100 Zeichen
 * - Minuten erforderlich, mindestens 1
 * - Beschreibung optional, max 500 Zeichen
 */
export const createVorlageSchema = z.object({
  titel: z.string().min(1, 'Titel ist erforderlich').max(100, 'Titel darf maximal 100 Zeichen lang sein'),
  minuten: z.number().int('Minuten muss eine ganze Zahl sein').min(1, 'Minuten muss mindestens 1 sein'),
  beschreibung: z.string().max(500, 'Beschreibung darf maximal 500 Zeichen lang sein').optional(),
});

export type CreateVorlageFormData = z.infer<typeof createVorlageSchema>;
