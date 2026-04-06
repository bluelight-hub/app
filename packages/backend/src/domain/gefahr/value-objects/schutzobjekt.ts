/**
 * Die 5 Schutzobjekte der Gefahrenmatrix.
 * Aufgeteilt in zwei Sektionen:
 * 1. "Welche Gefahren sind erkannt?" (MENSCHEN, TIERE, UMWELT, SACHWERTE)
 * 2. "Vor welchen Gefahren müssen sich Einsatzkräfte schützen?" (EINSATZKRAEFTE)
 */
export enum Schutzobjekt {
  MENSCHEN = 'MENSCHEN',
  TIERE = 'TIERE',
  UMWELT = 'UMWELT',
  SACHWERTE = 'SACHWERTE',
  EINSATZKRAEFTE = 'EINSATZKRAEFTE',
}

/** Anzeigename für UI */
export const SCHUTZOBJEKT_LABEL: Record<Schutzobjekt, string> = {
  [Schutzobjekt.MENSCHEN]: 'Menschen',
  [Schutzobjekt.TIERE]: 'Tiere',
  [Schutzobjekt.UMWELT]: 'Umwelt',
  [Schutzobjekt.SACHWERTE]: 'Sachwerte',
  [Schutzobjekt.EINSATZKRAEFTE]: 'Einsatzkräfte',
};

/** Schutzobjekte Sektion 1: "Welche Gefahren sind erkannt?" */
export const SCHUTZOBJEKTE_ERKANNT: Schutzobjekt[] = [Schutzobjekt.MENSCHEN, Schutzobjekt.TIERE, Schutzobjekt.UMWELT, Schutzobjekt.SACHWERTE];

/** Schutzobjekte Sektion 2: "Vor welchen Gefahren müssen sich Einsatzkräfte schützen?" */
export const SCHUTZOBJEKTE_EINSATZKRAEFTE: Schutzobjekt[] = [Schutzobjekt.EINSATZKRAEFTE];
