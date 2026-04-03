/**
 * Zod-Schemas für Taktische Einheiten Formulare.
 *
 * **Issue #411 - Taktische Einheiten:**
 * Validierungs-Schemas für Erstellen und Bearbeiten von Einheiten.
 * Die Werte korrespondieren mit den Backend-Enums (EinsatzEinheitTyp, EinsatzEinheitStatus).
 */

import { z } from 'zod';

/** Verfügbare Typen taktischer Einheiten (Enum-Werte) */
export const EINHEIT_TYP_VALUES = ['TRUPP', 'STAFFEL', 'GRUPPE', 'ZUG', 'ABSCHNITT'] as const;

/** Typ-Optionen mit deutschem Label für Select-Felder */
export const EINHEIT_TYP_OPTIONS = [
  { value: 'TRUPP', label: 'Trupp (3–4 Pers.)' },
  { value: 'STAFFEL', label: 'Staffel (6 Pers.)' },
  { value: 'GRUPPE', label: 'Gruppe (9 Pers.)' },
  { value: 'ZUG', label: 'Zug (18–22 Pers.)' },
  { value: 'ABSCHNITT', label: 'Abschnitt' },
] as const;

/** Verfügbare Status taktischer Einheiten (Enum-Werte) */
export const EINHEIT_STATUS_VALUES = ['AUFGESTELLT', 'EINSATZBEREIT', 'IM_EINSATZ', 'IN_RESERVE', 'AUFGELOEST'] as const;

/** Status-Optionen mit deutschem Label für Select-Felder */
export const EINHEIT_STATUS_OPTIONS = [
  { value: 'AUFGESTELLT', label: 'Aufgestellt' },
  { value: 'EINSATZBEREIT', label: 'Einsatzbereit' },
  { value: 'IM_EINSATZ', label: 'Im Einsatz' },
  { value: 'IN_RESERVE', label: 'In Reserve' },
  { value: 'AUFGELOEST', label: 'Aufgelöst' },
] as const;

/** Schema für das Erstellen einer taktischen Einheit */
export const createEinheitSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(100, 'Name darf maximal 100 Zeichen lang sein'),
  typ: z.enum(EINHEIT_TYP_VALUES),
  funktion: z.string().max(100, 'Funktion darf maximal 100 Zeichen lang sein').optional().or(z.literal('')),
  parentId: z.string().optional().or(z.literal('')),
  sollStaerke: z.number().int().min(0).max(9999).default(0),
  auftrag: z.string().max(500, 'Auftrag darf maximal 500 Zeichen lang sein').optional().or(z.literal('')),
  einsatzort: z.string().max(200, 'Einsatzort darf maximal 200 Zeichen lang sein').optional().or(z.literal('')),
});

/** Type Inference für Formular-Werte beim Erstellen */
export type CreateEinheitFormValues = z.infer<typeof createEinheitSchema>;

/** Schema für das Ändern des Einheit-Status */
export const changeEinheitStatusSchema = z.object({
  status: z.enum(EINHEIT_STATUS_VALUES),
});

/** Type Inference für Formular-Werte beim Status ändern */
export type ChangeEinheitStatusFormValues = z.infer<typeof changeEinheitStatusSchema>;
