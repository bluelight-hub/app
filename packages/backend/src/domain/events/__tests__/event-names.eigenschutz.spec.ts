import { EVENT_NAMES, type EventName } from '../event-names';

/**
 * Unit-Spec für den `EVENT_NAMES.EIGENSCHUTZ`-Namespace (Story 1.7 AC2 +
 * Issue #415 erweitert um VORFALL_GESCHLOSSEN auf 15 Einträge).
 *
 * Prüft die 5 Invarianten aus AC2:
 * 1. Exakt 15 Einträge mit den erwarteten UPPER_SNAKE_CASE-Keys.
 * 2. Jeder Wert matcht `^eigenschutz\.[a-z_]+$` (dot-notation Präfix +
 *    lowercase snake_case).
 * 3. Kein Duplikat innerhalb des Namespaces.
 * 4. Kein Overlap mit irgendeinem anderen `EVENT_NAMES.*`-Eintrag
 *    (Cross-Namespace-Uniqueness).
 * 5. Type-Level — alle Werte sind gültige `EventName`-Instanzen.
 */
describe('EVENT_NAMES.EIGENSCHUTZ (Story 1.7 AC2)', () => {
  const EXPECTED_KEYS = [
    'GEFAEHRDUNGSBEURTEILUNG_ERSTELLT',
    'GEFAEHRDUNGSBEURTEILUNG_AKTUALISIERT',
    'PSA_PROFIL_GEAENDERT',
    'SICHERHEITSREGEL_AUSGERUFEN',
    'SICHERHEITSREGEL_QUITTIERT',
    'SICHERUNGSPOSTEN_EINGERICHTET',
    'SICHERUNGSPOSTEN_AKTUALISIERT',
    'VORFALL_GEMELDET',
    'VORFALL_GESCHLOSSEN',
    'VORFALL_EXPORTIERT',
    'QUITTUNG_ABGEGEBEN',
    'LUECKE_GEMELDET',
    'QUITTUNG_UEBERFAELLIG',
    'KONFLIKT_ERKANNT',
    'KONFLIKT_AUFGELOEST',
  ] as const;

  it('(1) enthält genau 15 Einträge mit den erwarteten UPPER_SNAKE_CASE-Keys', () => {
    const keys = Object.keys(EVENT_NAMES.EIGENSCHUTZ).sort();
    expect(keys).toHaveLength(15);
    expect(keys).toEqual([...EXPECTED_KEYS].sort());
  });

  it('(2) jeder Wert matcht ^eigenschutz\\.[a-z][a-z0-9_]*[a-z0-9]$ (dot-notation + snake_case, keine leading/trailing underscores)', () => {
    // Strenger als `[a-z_]+`: Erstes Zeichen nach dem Punkt muss ein Buchstabe sein,
    // letztes Zeichen darf kein Unterstrich sein — sonst bräche die Slug-Heuristik
    // in `eigenschutz-event-registry.spec.ts` (z. B. `eigenschutz.foo_` → `foo-`).
    const values = Object.values(EVENT_NAMES.EIGENSCHUTZ);
    expect(values).toHaveLength(15);
    for (const value of values) {
      expect(value).toMatch(/^eigenschutz\.[a-z][a-z0-9_]*[a-z0-9]$/);
    }
  });

  it('(3) Werte sind innerhalb des EIGENSCHUTZ-Namespaces unique', () => {
    const values = Object.values(EVENT_NAMES.EIGENSCHUTZ);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('(4) kein Wert überlappt mit einem anderen EVENT_NAMES.*-Eintrag', () => {
    const allOtherValues = Object.entries(EVENT_NAMES)
      .filter(([namespace]) => namespace !== 'EIGENSCHUTZ')
      .flatMap(([, block]) => Object.values(block));
    const eigenschutzValues = Object.values(EVENT_NAMES.EIGENSCHUTZ);

    for (const value of eigenschutzValues) {
      expect(allOtherValues).not.toContain(value);
    }
  });

  it('(5) alle 15 Werte sind gültige EventName-Instanzen (Type-Level)', () => {
    const values = Object.values(EVENT_NAMES.EIGENSCHUTZ);
    const typed: EventName[] = values;
    expect(typed).toHaveLength(15);
  });
});
