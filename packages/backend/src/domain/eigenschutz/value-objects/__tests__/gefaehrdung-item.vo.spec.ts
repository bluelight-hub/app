import { GefaehrdungItem, GEFAEHRDUNG_ITEM_LIMITS } from '../gefaehrdung-item.vo';

describe('GefaehrdungItem (Story 2.1 — Value Object)', () => {
  it('(1) create() akzeptiert Pflichtfeld title und trimmt Whitespace', () => {
    const result = GefaehrdungItem.create({ title: '  Stolperfalle  ' });
    expect(result.isSuccess).toBe(true);
    expect(result.value?.title).toBe('Stolperfalle');
  });

  it('(2) create() lehnt leeren Titel (auch nach Trim) ab', () => {
    const result = GefaehrdungItem.create({ title: '   ' });
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Titel');
  });

  it('(3) create() lehnt Titel > 120 Zeichen ab', () => {
    const result = GefaehrdungItem.create({ title: 'x'.repeat(GEFAEHRDUNG_ITEM_LIMITS.titleMax + 1) });
    expect(result.isFailure).toBe(true);
  });

  it('(4) akzeptiert alle Risiko-Enum-Werte SCREAMING_CASE', () => {
    const result = GefaehrdungItem.create({
      title: 'Chemikalien-Exposition',
      eintritt: 'HAEUFIG',
      schaden: 'HOCH',
      risikoklasse: 'ORANGE',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.value?.eintritt).toBe('HAEUFIG');
    expect(result.value?.risikoklasse).toBe('ORANGE');
  });

  it('(5) lehnt ungültige Eintrittswahrscheinlichkeit ab', () => {
    // @ts-expect-error — absichtlich falscher Enum-Wert
    const result = GefaehrdungItem.create({ title: 'Test', eintritt: 'irgendwas' });
    expect(result.isFailure).toBe(true);
  });

  it('(6) toJSON() serialisiert nur gesetzte Felder (keine undefined-Einträge)', () => {
    const item = GefaehrdungItem.create({ title: 'A' }).value!;
    expect(item.toJSON()).toEqual({ title: 'A' });
  });

  it('(7) clone() liefert strukturell identische, aber unabhängige Kopie', () => {
    // Story 2.2: Backend berechnet risikoklasse authoritatively aus
    // (eintritt, schaden). `SELTEN × KATASTROPHAL = 5 Punkte → GELB`.
    const original = GefaehrdungItem.create({
      title: 'Stromschlag',
      schutzmassnahmen: 'Isolation',
      eintritt: 'SELTEN',
      schaden: 'KATASTROPHAL',
    }).value!;
    const copy = original.clone();
    expect(copy).not.toBe(original);
    expect(copy.toJSON()).toEqual(original.toJSON());
    expect(copy.risikoklasse).toBe('GELB');
  });

  it('(8) create() berechnet Risikoklasse aus (eintritt, schaden) wenn beide gesetzt', () => {
    const item = GefaehrdungItem.create({
      title: 'Hochvolt-Risiko',
      eintritt: 'GELEGENTLICH',
      schaden: 'KATASTROPHAL',
    }).value!;
    // 2 × 5 = 10 → ORANGE
    expect(item.risikoklasse).toBe('ORANGE');
  });

  it('(9) create() überschreibt eine vom Client mitgelieferte Risikoklasse (Backend-Autorität, AC3)', () => {
    const item = GefaehrdungItem.create({
      title: 'Fremd-Risiko',
      eintritt: 'HAEUFIG',
      schaden: 'MITTEL',
      risikoklasse: 'ROT', // absichtlich manipuliert — muss überschrieben werden
    }).value!;
    // 3 × 3 = 9 → GELB (nicht ROT)
    expect(item.risikoklasse).toBe('GELB');
  });

  it('(10) create() verwirft Client-Risikoklasse wenn eintritt ODER schaden fehlt (Backend-Autorität, AC3)', () => {
    // Vorher (Story 2.2 initial): Client-Wert durchreichen bei unvollständiger
    // Bewertung. Review-Fix P6/EC6: Backend-Autorität gilt unbedingt — wenn
    // eine Dimension fehlt, ist die Risikoklasse `undefined` statt eines
    // potenziell veralteten Client-Werts.
    const nurEintritt = GefaehrdungItem.create({
      title: 'Unvollständige Bewertung',
      eintritt: 'HAEUFIG',
      risikoklasse: 'GELB',
    }).value!;
    expect(nurEintritt.risikoklasse).toBeUndefined();

    const garNichts = GefaehrdungItem.create({
      title: 'Nur Titel',
      risikoklasse: 'GRUEN',
    }).value!;
    expect(garNichts.risikoklasse).toBeUndefined();
  });

  it('(11) create() ohne risikoklasse + ohne eintritt/schaden lässt Feld undefined', () => {
    const item = GefaehrdungItem.create({ title: 'Leer-Item' }).value!;
    expect(item.risikoklasse).toBeUndefined();
  });

  it('(12) AC5: leerer Schutzmaßnahmen-String (auch nach Trim) wird als undefined persistiert', () => {
    const empty = GefaehrdungItem.create({ title: 'T', schutzmassnahmen: '' }).value!;
    expect(empty.schutzmassnahmen).toBeUndefined();
    expect(empty.toJSON().schutzmassnahmen).toBeUndefined();

    const whitespace = GefaehrdungItem.create({ title: 'T', schutzmassnahmen: '   ' }).value!;
    expect(whitespace.schutzmassnahmen).toBeUndefined();
    expect(whitespace.toJSON().schutzmassnahmen).toBeUndefined();
  });

  it('(13) AC5-Konsistenz: leere Beschreibung wird ebenfalls als undefined persistiert', () => {
    const item = GefaehrdungItem.create({ title: 'T', description: '   ' }).value!;
    expect(item.description).toBeUndefined();
    expect(item.toJSON().description).toBeUndefined();
  });

  it('(14) nicht-leere Schutzmaßnahmen bleiben erhalten und werden getrimmt', () => {
    const item = GefaehrdungItem.create({ title: 'T', schutzmassnahmen: '  PSA tragen  ' }).value!;
    expect(item.schutzmassnahmen).toBe('PSA tragen');
  });
});
