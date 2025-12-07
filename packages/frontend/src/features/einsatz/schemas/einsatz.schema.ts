import { z } from 'zod';

/**
 * Schema für die Aktualisierung eines Einsatzes (für API)
 */
export const updateEinsatzDtoSchema = z.object({
  beschreibung: z.string().min(1, 'Beschreibung darf nicht leer sein').max(5000, 'Beschreibung darf maximal 5000 Zeichen lang sein').optional(),
});

/**
 * Schema für die Aktualisierung eines Einsatzes (für Form - beschreibung ist immer string, kann aber leer sein)
 */
export const updateEinsatzSchema = z.object({
  beschreibung: z.string().max(5000, 'Beschreibung darf maximal 5000 Zeichen lang sein'),
});

export type UpdateEinsatzFormData = z.infer<typeof updateEinsatzSchema>;

/**
 * Schema für die Erstellung eines neuen Einsatzes
 */
export const createEinsatzSchema = z.object({
  alarmstichwort: z.string().min(1, 'Alarmstichwort ist erforderlich').max(200, 'Alarmstichwort darf maximal 200 Zeichen lang sein'),
  einsatzort: z.string().min(1, 'Einsatzort ist erforderlich').max(500, 'Einsatzort darf maximal 500 Zeichen lang sein'),
  beschreibung: z.string().max(5000, 'Beschreibung darf maximal 5000 Zeichen lang sein').optional(),
});
