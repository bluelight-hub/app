/**
 * 25-Zellen-Fixture für die 5×5-Risikomatrix (ADR-013).
 *
 * Diese Fixture ist die Source of Truth für parametrisierte Tests in Backend
 * und Frontend. Sie MUSS 1:1 mit der Markdown-Tabelle in ADR-013 übereinstimmen
 * — eine Abweichung ist ein Test-Fail in der `calculateRisikoklasse`-Spec.
 *
 * Reihenfolge: aufsteigend nach Eintrittswahrscheinlichkeit, dann aufsteigend
 * nach Schadensausmaß — damit die Fixture als Flatten der ADR-Tabelle lesbar
 * bleibt.
 */

import type { Eintrittswahrscheinlichkeit, Risikoklasse, Schadensausmass } from '../../schemas/eigenschutz/gefaehrdung-item.schema.js';

export interface RisikoklasseFixtureEntry {
  eintritt: Eintrittswahrscheinlichkeit;
  schaden: Schadensausmass;
  risikoklasse: Risikoklasse;
}

export const RISIKOMATRIX_5X5_FIXTURE: readonly RisikoklasseFixtureEntry[] = [
  // SELTEN (×1)
  { eintritt: 'SELTEN', schaden: 'VERNACHLAESSIGBAR', risikoklasse: 'GRUEN' },
  { eintritt: 'SELTEN', schaden: 'GERING', risikoklasse: 'GRUEN' },
  { eintritt: 'SELTEN', schaden: 'MITTEL', risikoklasse: 'GRUEN' },
  { eintritt: 'SELTEN', schaden: 'HOCH', risikoklasse: 'GELB' },
  { eintritt: 'SELTEN', schaden: 'KATASTROPHAL', risikoklasse: 'GELB' },

  // GELEGENTLICH (×2)
  { eintritt: 'GELEGENTLICH', schaden: 'VERNACHLAESSIGBAR', risikoklasse: 'GRUEN' },
  { eintritt: 'GELEGENTLICH', schaden: 'GERING', risikoklasse: 'GELB' },
  { eintritt: 'GELEGENTLICH', schaden: 'MITTEL', risikoklasse: 'GELB' },
  { eintritt: 'GELEGENTLICH', schaden: 'HOCH', risikoklasse: 'GELB' },
  { eintritt: 'GELEGENTLICH', schaden: 'KATASTROPHAL', risikoklasse: 'ORANGE' },

  // HAEUFIG (×3)
  { eintritt: 'HAEUFIG', schaden: 'VERNACHLAESSIGBAR', risikoklasse: 'GRUEN' },
  { eintritt: 'HAEUFIG', schaden: 'GERING', risikoklasse: 'GELB' },
  { eintritt: 'HAEUFIG', schaden: 'MITTEL', risikoklasse: 'GELB' },
  { eintritt: 'HAEUFIG', schaden: 'HOCH', risikoklasse: 'ORANGE' },
  { eintritt: 'HAEUFIG', schaden: 'KATASTROPHAL', risikoklasse: 'ORANGE' },

  // OFT (×4)
  { eintritt: 'OFT', schaden: 'VERNACHLAESSIGBAR', risikoklasse: 'GELB' },
  { eintritt: 'OFT', schaden: 'GERING', risikoklasse: 'GELB' },
  { eintritt: 'OFT', schaden: 'MITTEL', risikoklasse: 'ORANGE' },
  { eintritt: 'OFT', schaden: 'HOCH', risikoklasse: 'ROT' },
  { eintritt: 'OFT', schaden: 'KATASTROPHAL', risikoklasse: 'ROT' },

  // STAENDIG (×5)
  { eintritt: 'STAENDIG', schaden: 'VERNACHLAESSIGBAR', risikoklasse: 'GELB' },
  { eintritt: 'STAENDIG', schaden: 'GERING', risikoklasse: 'ORANGE' },
  { eintritt: 'STAENDIG', schaden: 'MITTEL', risikoklasse: 'ORANGE' },
  { eintritt: 'STAENDIG', schaden: 'HOCH', risikoklasse: 'ROT' },
  { eintritt: 'STAENDIG', schaden: 'KATASTROPHAL', risikoklasse: 'ROT' },
];
