import { z } from 'zod';

/**
 * Zod Schema fuer die Korrektur eines Befehls
 *
 * Validiert die Formular-Eingaben bevor sie an das Backend gesendet werden.
 * Analog zum createBefehlSchema, aber mit optionalen EAMZW-Feldern.
 */

/** Schema fuer einen einzelnen Empfaenger (Name + optionale User-ID) */
const empfaengerItemSchema = z.object({
  name: z.string().min(1, 'Empfaenger-Name ist erforderlich'),
  empfaengerId: z.string().optional(),
});

export const korrigiereBefehlSchema = z.object({
  auftrag: z.string().min(3, 'Auftrag muss mindestens 3 Zeichen lang sein').max(5000, 'Auftrag darf maximal 5000 Zeichen lang sein'),
  empfaenger: z.array(empfaengerItemSchema).min(1, 'Mindestens ein Empfaenger ist erforderlich'),
  befehlsgeber: z.string().min(1, 'Befehlsgeber ist erforderlich'),
  befehlsgeberId: z.string().optional(),
  erstellerId: z.string().min(1, 'Ersteller-ID ist erforderlich'),
  zeitvorgabe: z.string().max(200, 'Zeitvorgabe darf maximal 200 Zeichen lang sein').optional(),
  ereignis: z.string().max(2000, 'Ereignis darf maximal 2000 Zeichen lang sein').optional(),
  mittel: z.string().max(2000, 'Mittel darf maximal 2000 Zeichen lang sein').optional(),
  ziel: z.string().max(2000, 'Ziel darf maximal 2000 Zeichen lang sein').optional(),
  weg: z.string().max(2000, 'Weg darf maximal 2000 Zeichen lang sein').optional(),
});

export type KorrigiereBefehlFormData = z.infer<typeof korrigiereBefehlSchema>;
