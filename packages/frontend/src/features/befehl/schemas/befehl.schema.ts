import { z } from 'zod';

/**
 * Zod Schema für die Erstellung eines neuen Befehls
 *
 * Validiert die Formular-Eingaben bevor sie an das Backend gesendet werden.
 */
/** Schema für einen einzelnen Empfänger (Name + optionale User-ID) */
const empfaengerItemSchema = z.object({
  name: z.string().min(1, 'Empfänger-Name ist erforderlich'),
  empfaengerId: z.string().optional(),
});

export const createBefehlSchema = z.object({
  auftrag: z.string().min(3, 'Auftrag muss mindestens 3 Zeichen lang sein').max(5000, 'Auftrag darf maximal 5000 Zeichen lang sein'),
  empfaenger: z.array(empfaengerItemSchema).min(1, 'Mindestens ein Empfänger ist erforderlich'),
  befehlsgeber: z.string().min(1, 'Befehlsgeber ist erforderlich'),
  einsatzId: z.string().min(1, 'Einsatz-ID ist erforderlich'),
  erstellerId: z.string().min(1, 'Ersteller-ID ist erforderlich'),
  zeitvorgabe: z.string().max(200, 'Zeitvorgabe darf maximal 200 Zeichen lang sein').optional(),
});

export type CreateBefehlFormData = z.infer<typeof createBefehlSchema>;
