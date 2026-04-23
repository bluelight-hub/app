/**
 * Parametrisierter Unit-Test für die 5×5-Risikomatrix-Berechnung (ADR-013).
 *
 * Assertet alle 25 Zellen der Nohl-Matrix gegen die Fixture-Tabelle — eine
 * Abweichung zwischen ADR-Tabelle und Implementierung ist hier als Test-Fail
 * sichtbar.
 *
 * **Drift-Mitigation gegen Shared-Utility (ADR-013 Fallback-Pfad):** Der
 * Backend-Fixture darf nicht mit der Shared-Fixture aus
 * `packages/shared/src/utils/eigenschutz/risikoklasse-5x5.fixture.ts`
 * auseinanderlaufen. Der letzte `describe`-Block liest die Shared-Fixture
 * per relativem Source-Path und prüft strukturell auf Byte-Gleichheit mit
 * dem Backend-Duplikat.
 */

import { calculateRisikoklasse, RISIKOMATRIX_5X5_FIXTURE } from '../risikoklasse-berechnung';
import { EINTRITTSWAHRSCHEINLICHKEIT_WERTE, SCHADENSAUSMASS_WERTE, RISIKOKLASSE_WERTE } from '../gefaehrdung-item.vo';
import { RISIKOMATRIX_5X5_FIXTURE as SHARED_RISIKOMATRIX_5X5_FIXTURE } from '../../../../../../shared/src/utils/eigenschutz/risikoklasse-5x5.fixture';

describe('calculateRisikoklasse (ADR-013)', () => {
  it('soll genau 25 Einträge in der Fixture haben', () => {
    const expectedCount = EINTRITTSWAHRSCHEINLICHKEIT_WERTE.length * SCHADENSAUSMASS_WERTE.length;
    expect(RISIKOMATRIX_5X5_FIXTURE).toHaveLength(expectedCount);
    expect(expectedCount).toBe(25);
  });

  it.each(RISIKOMATRIX_5X5_FIXTURE)('soll für Eintritt=$eintritt, Schaden=$schaden → $risikoklasse liefern', ({ eintritt, schaden, risikoklasse }) => {
    expect(calculateRisikoklasse(eintritt, schaden)).toBe(risikoklasse);
  });

  it('soll für jede Kombination einen der 4 Risikoklasse-Werte liefern', () => {
    for (const eintritt of EINTRITTSWAHRSCHEINLICHKEIT_WERTE) {
      for (const schaden of SCHADENSAUSMASS_WERTE) {
        const result = calculateRisikoklasse(eintritt, schaden);
        expect(RISIKOKLASSE_WERTE).toContain(result);
      }
    }
  });

  it('soll für niedrigste Kombination (SELTEN × VERNACHLAESSIGBAR) GRUEN liefern', () => {
    expect(calculateRisikoklasse('SELTEN', 'VERNACHLAESSIGBAR')).toBe('GRUEN');
  });

  it('soll für höchste Kombination (STAENDIG × KATASTROPHAL) ROT liefern', () => {
    expect(calculateRisikoklasse('STAENDIG', 'KATASTROPHAL')).toBe('ROT');
  });

  it('soll die Klassen-Schwellen nach Nohl-Methode einhalten (1-3 GRUEN, 4-9 GELB, 10-15 ORANGE, 16-25 ROT)', () => {
    // Risikozahl 3 → GRUEN
    expect(calculateRisikoklasse('SELTEN', 'MITTEL')).toBe('GRUEN');
    // Risikozahl 4 → GELB
    expect(calculateRisikoklasse('GELEGENTLICH', 'GERING')).toBe('GELB');
    // Risikozahl 9 → GELB
    expect(calculateRisikoklasse('HAEUFIG', 'MITTEL')).toBe('GELB');
    // Risikozahl 10 → ORANGE
    expect(calculateRisikoklasse('GELEGENTLICH', 'KATASTROPHAL')).toBe('ORANGE');
    // Risikozahl 15 → ORANGE
    expect(calculateRisikoklasse('HAEUFIG', 'KATASTROPHAL')).toBe('ORANGE');
    // Risikozahl 16 → ROT
    expect(calculateRisikoklasse('OFT', 'HOCH')).toBe('ROT');
  });
});

describe('Risikomatrix-Konsistenz: Backend-Duplikat vs. Shared-Fixture (ADR-013)', () => {
  it('soll byte-identisch mit @bluelight-hub/shared sein (keine Drift erlaubt)', () => {
    // Strikte Gleichheit über alle 25 Zellen — der Backend-Fixture ist ein
    // bewusstes Duplikat, das gegen die Shared-Version driften könnte, wenn
    // nur eine Seite editiert wird. Dieser Test fängt das auf.
    expect(SHARED_RISIKOMATRIX_5X5_FIXTURE).toHaveLength(RISIKOMATRIX_5X5_FIXTURE.length);
    for (let i = 0; i < RISIKOMATRIX_5X5_FIXTURE.length; i++) {
      expect(SHARED_RISIKOMATRIX_5X5_FIXTURE[i]).toEqual(RISIKOMATRIX_5X5_FIXTURE[i]);
    }
  });

  it('soll alle 25 Einträge der Shared-Fixture mit der Backend-Berechnung auflösen', () => {
    // Doppel-Sicherung: selbst wenn die Fixtures auseinanderlaufen sollten,
    // stellt dieser Test sicher, dass Backend-calculateRisikoklasse die
    // Shared-Erwartung erfüllt.
    for (const entry of SHARED_RISIKOMATRIX_5X5_FIXTURE) {
      expect(calculateRisikoklasse(entry.eintritt, entry.schaden)).toBe(entry.risikoklasse);
    }
  });
});
