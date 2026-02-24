import { z } from 'zod';

/**
 * Zod Schema für das Hinzufügen eines Kommentars zu einem Befehl
 *
 * Validiert die Formular-Eingaben bevor sie an das Backend gesendet werden.
 */
export const addBefehlKommentarSchema = z.object({
  text: z.string().trim().min(1, 'Kommentar-Text ist erforderlich'),
  isRueckfrage: z.boolean().default(false),
  parentId: z.string().optional(),
});

export type AddBefehlKommentarFormData = z.infer<typeof addBefehlKommentarSchema>;
