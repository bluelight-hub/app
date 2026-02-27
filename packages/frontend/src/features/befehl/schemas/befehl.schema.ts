import { z } from 'zod';

/**
 * Zod Schema für die Erstellung eines neuen Befehls
 *
 * Validiert die Formular-Eingaben bevor sie an das Backend gesendet werden.
 */
/** Schema fuer eine einzelne Einheit (Name + optionale User-ID) */
const empfaengerItemSchema = z.object({
  name: z.string().min(1, 'Einheit ist erforderlich'),
  empfaengerId: z.string().optional(),
});

export const createBefehlSchema = z.object({
  auftrag: z.string().min(3, 'Auftrag muss mindestens 3 Zeichen lang sein').max(5000, 'Auftrag darf maximal 5000 Zeichen lang sein'),
  empfaenger: z.array(empfaengerItemSchema).min(1, 'Mindestens eine Einheit ist erforderlich'),
  befehlsgeber: z.string().min(1, 'Befehlsgeber ist erforderlich'),
  einsatzId: z.string().min(1, 'Einsatz-ID ist erforderlich'),
  erstellerId: z.string().min(1, 'Ersteller-ID ist erforderlich'),
  zeitvorgabe: z.string().max(200, 'Zeitvorgabe darf maximal 200 Zeichen lang sein').optional(),
  ereignis: z.string().max(2000, 'Ereignis darf maximal 2000 Zeichen lang sein').optional(),
  mittel: z.string().max(2000, 'Mittel darf maximal 2000 Zeichen lang sein').optional(),
  ziel: z.string().max(2000, 'Ziel darf maximal 2000 Zeichen lang sein').optional(),
  weg: z.string().max(2000, 'Weg darf maximal 2000 Zeichen lang sein').optional(),
  befehlsgeberId: z.string().optional(),
});

export type CreateBefehlFormData = z.infer<typeof createBefehlSchema>;
