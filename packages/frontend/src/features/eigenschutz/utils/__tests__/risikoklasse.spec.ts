import { describe, expect, it } from 'vitest';
import { calculateRisikoklasse, RISIKOMATRIX_5X5_FIXTURE } from '@bluelight-hub/shared';

/**
 * Konsistenz-Spec für die Frontend-Seite der Backend-Autorität (Story 2.2, AC3).
 *
 * Der Frontend-Client nutzt `calculateRisikoklasse` aus `@bluelight-hub/shared`
 * ausschließlich für die UI-Preview (Matrix-Zellen-Farbe während der Auswahl).
 * Das Backend-Duplikat (`packages/backend/src/domain/eigenschutz/value-objects/
 * risikoklasse-berechnung.ts`) ist wegen der Backend-CJS/ESM-Blockade
 * dokumentiert und hat eine eigene parametrisierte Spec.
 *
 * AC3-Konsistenz-Invariante: Beide Seiten müssen die exakt gleiche
 * Klassen-Zuordnung aus derselben 25-Zellen-Fixture liefern. Diese Spec
 * iteriert die Fixture aus dem Shared-Package und prüft jede Zelle — ein
 * Drift (z. B. durch versehentliches Ändern der Shared-Schwellen) fällt
 * sofort als Test-Fail hier auf.
 *
 * @see docs/adr/adr-013-risikomatrix-5x5.md
 */
describe('calculateRisikoklasse (Frontend, Shared-Utility) — AC3 Konsistenz-Invariante', () => {
  it('Fixture enthält exakt 25 Einträge', () => {
    expect(RISIKOMATRIX_5X5_FIXTURE).toHaveLength(25);
  });

  it.each(RISIKOMATRIX_5X5_FIXTURE)('Eintritt=$eintritt × Schaden=$schaden → $risikoklasse', ({ eintritt, schaden, risikoklasse }) => {
    expect(calculateRisikoklasse(eintritt, schaden)).toBe(risikoklasse);
  });

  it('Extrempunkte: SELTEN × VERNACHLAESSIGBAR → GRUEN, STAENDIG × KATASTROPHAL → ROT', () => {
    expect(calculateRisikoklasse('SELTEN', 'VERNACHLAESSIGBAR')).toBe('GRUEN');
    expect(calculateRisikoklasse('STAENDIG', 'KATASTROPHAL')).toBe('ROT');
  });
});
