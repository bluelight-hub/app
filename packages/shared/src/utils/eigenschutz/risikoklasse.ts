/**
 * 5×5-Risikomatrix-Berechnung nach Nohl-Methode (ADR-013).
 *
 * Reine Funktion ohne Runtime-Dependencies außer den Enum-Konstanten. Nutzbar
 * in Backend-CJS und Frontend-ESM. Die Matrix-Zuordnung folgt der in
 * `docs/adr/adr-013-risikomatrix-5x5.md` festgelegten Tabelle — eine Drift
 * zwischen dieser Funktion und der ADR-Tabelle ist per parametrisiertem Test
 * zu detektieren.
 *
 * Rationale: siehe ADR-013 Abschnitt „Entscheidung".
 */

import type { Eintrittswahrscheinlichkeit, Risikoklasse, Schadensausmass } from '../../schemas/eigenschutz/gefaehrdung-item.schema.js';

/**
 * Numerische Skalen-Werte für Eintrittswahrscheinlichkeit nach Nohl-Methode
 * (1 = selten, 5 = ständig). Interne Utility-Konstante; das Domain-Vokabular
 * nutzt die SCREAMING_CASE-Enum-Werte.
 */
const EINTRITT_WERT: Record<Eintrittswahrscheinlichkeit, number> = {
  SELTEN: 1,
  GELEGENTLICH: 2,
  HAEUFIG: 3,
  OFT: 4,
  STAENDIG: 5,
};

/**
 * Numerische Skalen-Werte für Schadensausmaß (1 = vernachlässigbar, 5 =
 * katastrophal).
 */
const SCHADEN_WERT: Record<Schadensausmass, number> = {
  VERNACHLAESSIGBAR: 1,
  GERING: 2,
  MITTEL: 3,
  HOCH: 4,
  KATASTROPHAL: 5,
};

/**
 * Schwellen für die Klassen-Zuordnung (ADR-013 Abschnitt „Entscheidung"):
 * Risikozahl 1–3 = GRUEN, 4–9 = GELB, 10–15 = ORANGE, 16–25 = ROT.
 */
export function calculateRisikoklasse(eintritt: Eintrittswahrscheinlichkeit, schaden: Schadensausmass): Risikoklasse {
  const risikozahl = EINTRITT_WERT[eintritt] * SCHADEN_WERT[schaden];
  if (risikozahl <= 3) return 'GRUEN';
  if (risikozahl <= 9) return 'GELB';
  if (risikozahl <= 15) return 'ORANGE';
  return 'ROT';
}
