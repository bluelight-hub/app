/**
 * Warnstufen für die Gefahrenbewertung.
 */
export enum Warnstufe {
  KEINE = 'KEINE',
  NIEDRIG = 'NIEDRIG',
  MITTEL = 'MITTEL',
  HOCH = 'HOCH',
  AKUT = 'AKUT',
}

/** Anzeigename für UI */
export const WARNSTUFE_LABEL: Record<Warnstufe, string> = {
  [Warnstufe.KEINE]: 'Keine',
  [Warnstufe.NIEDRIG]: 'Niedrig',
  [Warnstufe.MITTEL]: 'Mittel',
  [Warnstufe.HOCH]: 'Hoch',
  [Warnstufe.AKUT]: 'Akut',
};

/** Sortierreihenfolge (aufsteigend) */
export const WARNSTUFE_ORDER: Warnstufe[] = [Warnstufe.KEINE, Warnstufe.NIEDRIG, Warnstufe.MITTEL, Warnstufe.HOCH, Warnstufe.AKUT];
