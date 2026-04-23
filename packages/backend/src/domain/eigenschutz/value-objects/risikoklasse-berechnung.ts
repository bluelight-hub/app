/**
 * 5×5-Risikomatrix-Berechnung nach Nohl-Methode — Backend-Duplikat.
 *
 * Die Shared-Variante liegt in `packages/shared/src/utils/eigenschutz/risikoklasse.ts`.
 * Backend-CJS kann den Shared-ESM-Export zur Laufzeit nicht auflösen
 * (dokumentiert in Story 2.1; verifiziert per Probe-Spec in Story 2.2).
 * Deshalb hält das Backend eine **identische** Kopie der Funktion + Fixture.
 *
 * Drift-Mitigation:
 *  - Matrix-Zuordnung ist in `docs/adr/adr-013-risikomatrix-5x5.md` als
 *    Markdown-Tabelle festgelegt — jede Änderung MUSS in ADR, Shared-Utility
 *    und diesem Duplikat parallel erfolgen.
 *  - Die parametrisierte Unit-Spec in `__tests__/risikoklasse-berechnung.spec.ts`
 *    assertet alle 25 Einträge gegen die ADR-Tabelle.
 *
 * @see docs/adr/adr-013-risikomatrix-5x5.md
 * @see packages/shared/src/utils/eigenschutz/risikoklasse.ts
 */

import type { Eintrittswahrscheinlichkeit, Risikoklasse, Schadensausmass } from './gefaehrdung-enums';

const EINTRITT_WERT: Record<Eintrittswahrscheinlichkeit, number> = {
  SELTEN: 1,
  GELEGENTLICH: 2,
  HAEUFIG: 3,
  OFT: 4,
  STAENDIG: 5,
};

const SCHADEN_WERT: Record<Schadensausmass, number> = {
  VERNACHLAESSIGBAR: 1,
  GERING: 2,
  MITTEL: 3,
  HOCH: 4,
  KATASTROPHAL: 5,
};

export function calculateRisikoklasse(eintritt: Eintrittswahrscheinlichkeit, schaden: Schadensausmass): Risikoklasse {
  const risikozahl = EINTRITT_WERT[eintritt] * SCHADEN_WERT[schaden];
  if (risikozahl <= 3) return 'GRUEN';
  if (risikozahl <= 9) return 'GELB';
  if (risikozahl <= 15) return 'ORANGE';
  return 'ROT';
}

export interface RisikoklasseFixtureEntry {
  eintritt: Eintrittswahrscheinlichkeit;
  schaden: Schadensausmass;
  risikoklasse: Risikoklasse;
}

/**
 * 25-Zellen-Fixture identisch zu `packages/shared/src/utils/eigenschutz/risikoklasse-5x5.fixture.ts`.
 * Reihenfolge: aufsteigend nach Eintritt, dann nach Schaden.
 */
export const RISIKOMATRIX_5X5_FIXTURE: readonly RisikoklasseFixtureEntry[] = [
  { eintritt: 'SELTEN', schaden: 'VERNACHLAESSIGBAR', risikoklasse: 'GRUEN' },
  { eintritt: 'SELTEN', schaden: 'GERING', risikoklasse: 'GRUEN' },
  { eintritt: 'SELTEN', schaden: 'MITTEL', risikoklasse: 'GRUEN' },
  { eintritt: 'SELTEN', schaden: 'HOCH', risikoklasse: 'GELB' },
  { eintritt: 'SELTEN', schaden: 'KATASTROPHAL', risikoklasse: 'GELB' },

  { eintritt: 'GELEGENTLICH', schaden: 'VERNACHLAESSIGBAR', risikoklasse: 'GRUEN' },
  { eintritt: 'GELEGENTLICH', schaden: 'GERING', risikoklasse: 'GELB' },
  { eintritt: 'GELEGENTLICH', schaden: 'MITTEL', risikoklasse: 'GELB' },
  { eintritt: 'GELEGENTLICH', schaden: 'HOCH', risikoklasse: 'GELB' },
  { eintritt: 'GELEGENTLICH', schaden: 'KATASTROPHAL', risikoklasse: 'ORANGE' },

  { eintritt: 'HAEUFIG', schaden: 'VERNACHLAESSIGBAR', risikoklasse: 'GRUEN' },
  { eintritt: 'HAEUFIG', schaden: 'GERING', risikoklasse: 'GELB' },
  { eintritt: 'HAEUFIG', schaden: 'MITTEL', risikoklasse: 'GELB' },
  { eintritt: 'HAEUFIG', schaden: 'HOCH', risikoklasse: 'ORANGE' },
  { eintritt: 'HAEUFIG', schaden: 'KATASTROPHAL', risikoklasse: 'ORANGE' },

  { eintritt: 'OFT', schaden: 'VERNACHLAESSIGBAR', risikoklasse: 'GELB' },
  { eintritt: 'OFT', schaden: 'GERING', risikoklasse: 'GELB' },
  { eintritt: 'OFT', schaden: 'MITTEL', risikoklasse: 'ORANGE' },
  { eintritt: 'OFT', schaden: 'HOCH', risikoklasse: 'ROT' },
  { eintritt: 'OFT', schaden: 'KATASTROPHAL', risikoklasse: 'ROT' },

  { eintritt: 'STAENDIG', schaden: 'VERNACHLAESSIGBAR', risikoklasse: 'GELB' },
  { eintritt: 'STAENDIG', schaden: 'GERING', risikoklasse: 'ORANGE' },
  { eintritt: 'STAENDIG', schaden: 'MITTEL', risikoklasse: 'ORANGE' },
  { eintritt: 'STAENDIG', schaden: 'HOCH', risikoklasse: 'ROT' },
  { eintritt: 'STAENDIG', schaden: 'KATASTROPHAL', risikoklasse: 'ROT' },
];
