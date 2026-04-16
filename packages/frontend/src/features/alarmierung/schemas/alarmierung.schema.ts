/**
 * Zod-Schemas für Alarmierungs-Formulare.
 *
 * Wird von Create-Drawer, Empfänger-Hinzufügen-Popover und
 * Zeitpunkt-Korrektur-Popover genutzt (in Kombination mit
 * `@tanstack/react-form`).
 */

import { z } from 'zod';

export const empfaengerKindSchema = z.enum(['fahrzeug', 'person', 'einheit']);
export type EmpfaengerKind = z.infer<typeof empfaengerKindSchema>;

export const empfaengerInputSchema = z.object({
  kind: empfaengerKindSchema,
  /** ID des Fahrzeugs / der Person / der Einheit je nach `kind`. */
  refId: z.string().min(1, 'Referenz ist erforderlich'),
  /** Optionaler Name-Snapshot, Backend leitet sonst aus Stammdaten ab. */
  nameSnapshot: z.string().optional(),
});
export type EmpfaengerInput = z.infer<typeof empfaengerInputSchema>;

export const createAlarmierungFormSchema = z.object({
  bezeichnung: z.string().min(1, 'Bezeichnung ist erforderlich').max(200, 'Maximal 200 Zeichen'),
  beschreibung: z.string().max(2000, 'Maximal 2000 Zeichen').optional(),
  alarmierungszeit: z.string().optional(),
  empfaenger: z.array(empfaengerInputSchema).min(1, 'Mindestens ein Empfänger ist erforderlich'),
});
export type CreateAlarmierungFormValues = z.infer<typeof createAlarmierungFormSchema>;

/**
 * Felder, die pro Empfänger nachträglich korrigierbar sind.
 * Deckungsgleich mit dem Backend-`KorrigiereZeitpunkteBody`.
 */
export const zeitpunktFeldSchema = z.enum(['ausgeruecktAm', 'vorOrtAm', 'wiederFreiAm']);
export type ZeitpunktFeld = z.infer<typeof zeitpunktFeldSchema>;

export const zeitpunktKorrekturFormSchema = z.object({
  feld: zeitpunktFeldSchema,
  /** ISO-String oder leer (→ zurücksetzen). */
  wert: z.string().optional(),
});
export type ZeitpunktKorrekturFormValues = z.infer<typeof zeitpunktKorrekturFormSchema>;

export const nachalarmierungFormSchema = z.object({
  bezeichnung: z.string().min(1, 'Bezeichnung ist erforderlich').max(200, 'Maximal 200 Zeichen'),
  beschreibung: z.string().max(2000, 'Maximal 2000 Zeichen').optional(),
  empfaenger: z.array(empfaengerInputSchema).min(1, 'Mindestens ein Empfänger ist erforderlich'),
});
export type NachalarmierungFormValues = z.infer<typeof nachalarmierungFormSchema>;
