import { GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED, GEFAEHRDUNGSBEURTEILUNG_DUPLICATE_ITEM_ID, Gefaehrdungsbeurteilung } from '../gefaehrdungsbeurteilung.aggregate';
import { GefaehrdungsbeurteilungAktualisiertEvent } from '../../events/gefaehrdungsbeurteilung-aktualisiert.event';
import { GefaehrdungsbeurteilungErstelltEvent } from '../../events/gefaehrdungsbeurteilung-erstellt.event';
import { GefaehrdungItem } from '../../value-objects/gefaehrdung-item.vo';

describe('Gefaehrdungsbeurteilung Aggregate (Story 2.1)', () => {
  const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
  const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
  const USER_ID = 'clw3h8x9y0000qwertyui00099';
  const VORLAGE_ID = 'clw3h8x9y0000qwertyui00111';

  function buildItem(title: string): GefaehrdungItem {
    return GefaehrdungItem.create({ title }).value!;
  }

  it('(1) create() liefert Success und Initialwerte für Leer-Formular', () => {
    const result = Gefaehrdungsbeurteilung.create({
      einsatzId: EINSATZ_ID,
      einheitId: EINHEIT_ID,
      createdBy: USER_ID,
      items: [],
    });

    expect(result.isSuccess).toBe(true);
    const aggregate = result.value!;
    expect(aggregate.einsatzId).toBe(EINSATZ_ID);
    expect(aggregate.einheitId).toBe(EINHEIT_ID);
    expect(aggregate.createdBy).toBe(USER_ID);
    expect(aggregate.vorlageId).toBeNull();
    expect(aggregate.items).toHaveLength(0);
    expect(aggregate.version).toBe(1);
  });

  it('(2) create() emittiert genau ein GefaehrdungsbeurteilungErstelltEvent', () => {
    const aggregate = Gefaehrdungsbeurteilung.create({
      einsatzId: EINSATZ_ID,
      einheitId: EINHEIT_ID,
      createdBy: USER_ID,
      vorlageId: VORLAGE_ID,
      items: [buildItem('Chemikalien'), buildItem('Stolperfalle')],
    }).value!;

    const events = aggregate.getDomainEvents();
    expect(events).toHaveLength(1);
    const event = events[0] as GefaehrdungsbeurteilungErstelltEvent;
    expect(event).toBeInstanceOf(GefaehrdungsbeurteilungErstelltEvent);
    expect(event.einsatzId).toBe(EINSATZ_ID);
    expect(event.einheitId).toBe(EINHEIT_ID);
    expect(event.userId).toBe(USER_ID);
    expect(event.vorlageId).toBe(VORLAGE_ID);
    expect(event.itemCount).toBe(2);
    expect(event.gefaehrdungsbeurteilungId).toBe(aggregate.id.value);
  });

  it('(3) create() lehnt fehlende einsatzId ab', () => {
    const result = Gefaehrdungsbeurteilung.create({
      einsatzId: '',
      einheitId: EINHEIT_ID,
      createdBy: USER_ID,
      items: [],
    });
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('einsatzId');
  });

  it('(4) create() lehnt fehlende einheitId ab', () => {
    const result = Gefaehrdungsbeurteilung.create({
      einsatzId: EINSATZ_ID,
      einheitId: '',
      createdBy: USER_ID,
      items: [],
    });
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('einheitId');
  });

  it('(5) create() lehnt fehlende createdBy ab', () => {
    const result = Gefaehrdungsbeurteilung.create({
      einsatzId: EINSATZ_ID,
      einheitId: EINHEIT_ID,
      createdBy: '',
      items: [],
    });
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('createdBy');
  });

  it('(6) Event für leere Vorlage trägt vorlageId = null und itemCount = 0', () => {
    const aggregate = Gefaehrdungsbeurteilung.create({
      einsatzId: EINSATZ_ID,
      einheitId: EINHEIT_ID,
      createdBy: USER_ID,
      items: [],
    }).value!;

    const event = aggregate.getDomainEvents()[0] as GefaehrdungsbeurteilungErstelltEvent;
    expect(event.vorlageId).toBeNull();
    expect(event.itemCount).toBe(0);
  });

  describe('updateItems (Story 2.2)', () => {
    function buildItemWithId(title: string, id: string): GefaehrdungItem {
      return GefaehrdungItem.create({ id, title }).value!;
    }

    function buildFreshAggregate(items: GefaehrdungItem[]): Gefaehrdungsbeurteilung {
      const aggregate = Gefaehrdungsbeurteilung.create({
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        createdBy: USER_ID,
        items,
      }).value!;
      aggregate.clearDomainEvents();
      return aggregate;
    }

    it('(7) Happy-Path: erhöht Version von 1 auf 2 und emittiert AktualisiertEvent', () => {
      const aggregate = buildFreshAggregate([]);
      const result = aggregate.updateItems([buildItem('Neue-Gefährdung')], 1, USER_ID);

      expect(result.isSuccess).toBe(true);
      expect(aggregate.version).toBe(2);
      expect(aggregate.items).toHaveLength(1);

      const events = aggregate.getDomainEvents();
      expect(events).toHaveLength(1);
      const event = events[0] as GefaehrdungsbeurteilungAktualisiertEvent;
      expect(event).toBeInstanceOf(GefaehrdungsbeurteilungAktualisiertEvent);
      expect(event.fromVersion).toBe(1);
      expect(event.toVersion).toBe(2);
      expect(event.changedFields).toEqual({ added: ['generated:0'], removed: [], updated: [], unchanged: 0 });
      expect(event.userId).toBe(USER_ID);
      expect(event.gefaehrdungsbeurteilungId).toBe(aggregate.id.value);
    });

    it('(8) Version-Mismatch liefert ConflictDetected-Sentinel und hält Aggregate unverändert', () => {
      const aggregate = buildFreshAggregate([buildItem('Original')]);
      const result = aggregate.updateItems([buildItem('Neu')], 42, USER_ID);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED);
      expect(aggregate.version).toBe(1);
      expect(aggregate.items[0]?.title).toBe('Original');
      expect(aggregate.getDomainEvents()).toHaveLength(0);
    });

    it('(9) Diff: liefert Per-Item-IDs für added/removed/updated (Story 2.3 AC3)', () => {
      const idA = 'clw3h8x9y0000qwertyuiaaaaa';
      const idB = 'clw3h8x9y0000qwertyuibbbbb';
      const idC = 'clw3h8x9y0000qwertyuiccccc';

      const aggregate = buildFreshAggregate([buildItemWithId('A-alt', idA), buildItemWithId('B-alt', idB)]);

      // A wird aktualisiert (gleiche ID, neuer Titel), B entfernt, C neu.
      const result = aggregate.updateItems([buildItemWithId('A-neu', idA), buildItemWithId('C-neu', idC)], 1, USER_ID);
      expect(result.isSuccess).toBe(true);

      const event = aggregate.getDomainEvents()[0] as GefaehrdungsbeurteilungAktualisiertEvent;
      expect(event.changedFields).toEqual({
        added: [idC],
        removed: [idB],
        updated: [{ id: idA, fields: ['title'] }],
        unchanged: 0,
      });
    });

    it('(10) Items ohne ID werden mit synthetischem generated:<idx> geführt (Story 2.3 AC4)', () => {
      const aggregate = buildFreshAggregate([]);
      const result = aggregate.updateItems([buildItem('A'), buildItem('B'), buildItem('C')], 1, USER_ID);
      expect(result.isSuccess).toBe(true);

      const event = aggregate.getDomainEvents()[0] as GefaehrdungsbeurteilungAktualisiertEvent;
      expect(event.changedFields.added).toEqual(['generated:0', 'generated:1', 'generated:2']);
      expect(event.changedFields.removed).toEqual([]);
      expect(event.changedFields.updated).toEqual([]);
      expect(event.changedFields.unchanged).toBe(0);
    });

    it('(11) Leeres newItems-Array entfernt alle Items und inkrementiert Version (kein 422)', () => {
      const idA = 'clw3h8x9y0000qwertyuiaaaaa';
      const aggregate = buildFreshAggregate([buildItemWithId('A', idA)]);

      const result = aggregate.updateItems([], 1, USER_ID);
      expect(result.isSuccess).toBe(true);
      expect(aggregate.version).toBe(2);
      expect(aggregate.items).toHaveLength(0);

      const event = aggregate.getDomainEvents()[0] as GefaehrdungsbeurteilungAktualisiertEvent;
      expect(event.changedFields).toEqual({ added: [], removed: [idA], updated: [], unchanged: 0 });
    });

    it('(12) Mehrfaches updateItems inkrementiert Version schrittweise', () => {
      const aggregate = buildFreshAggregate([]);
      aggregate.updateItems([buildItem('V2')], 1, USER_ID);
      aggregate.updateItems([buildItem('V3')], 2, USER_ID);
      aggregate.updateItems([buildItem('V4')], 3, USER_ID);

      expect(aggregate.version).toBe(4);
      expect(aggregate.getDomainEvents()).toHaveLength(3);
    });

    it('(13) lehnt nicht-Array newItems ab (defensive Signatur-Validierung)', () => {
      const aggregate = buildFreshAggregate([]);
      const result = aggregate.updateItems('nicht-array' as unknown as GefaehrdungItem[], 1, USER_ID);
      expect(result.isFailure).toBe(true);
      expect(aggregate.version).toBe(1);
    });

    // Story 2.3 Tests — Per-Item-Granularität + Encapsulation
    it('(14) Duplikat-ID in newItems → BusinessRule:DuplicateItemId (AC4)', () => {
      const dupId = 'clw3h8x9y0000qwertyuiddddd';
      const aggregate = buildFreshAggregate([]);

      const result = aggregate.updateItems([buildItemWithId('Erstes', dupId), buildItemWithId('Zweites', dupId)], 1, USER_ID);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(GEFAEHRDUNGSBEURTEILUNG_DUPLICATE_ITEM_ID);
      // Aggregate bleibt unverändert.
      expect(aggregate.version).toBe(1);
      expect(aggregate.items).toHaveLength(0);
      expect(aggregate.getDomainEvents()).toHaveLength(0);
    });

    it('(15) Content-Diff: geändertes (eintritt, schaden) listet nur diese Felder, NICHT risikoklasse (AC5)', () => {
      const id = 'clw3h8x9y0000qwertyuieeeee';
      const alt = GefaehrdungItem.create({
        id,
        title: 'Hochvolt',
        eintritt: 'SELTEN',
        schaden: 'MITTEL',
      }).value!;
      const neu = GefaehrdungItem.create({
        id,
        title: 'Hochvolt',
        eintritt: 'HAEUFIG',
        schaden: 'KATASTROPHAL',
      }).value!;

      const aggregate = buildFreshAggregate([alt]);
      const result = aggregate.updateItems([neu], 1, USER_ID);
      expect(result.isSuccess).toBe(true);

      const event = aggregate.getDomainEvents()[0] as GefaehrdungsbeurteilungAktualisiertEvent;
      expect(event.changedFields.updated).toEqual([{ id, fields: ['eintritt', 'schaden'] }]);
      expect(event.changedFields.updated[0]?.fields).not.toContain('risikoklasse');
      expect(event.changedFields.added).toEqual([]);
      expect(event.changedFields.removed).toEqual([]);
      expect(event.changedFields.unchanged).toBe(0);
    });

    it('(16) Items ohne IDs im Mix mit IDs: generated:<idx>-Zähler korrekt (AC4)', () => {
      const newId = 'clw3h8x9y0000qwertyuifffff';
      const aggregate = buildFreshAggregate([]);

      // Zwei ID-lose Items zuerst, dann ein Item mit ID → Reihenfolge erhält added-Array.
      const result = aggregate.updateItems([buildItem('Ohne-ID-1'), buildItem('Ohne-ID-2'), buildItemWithId('Mit-ID', newId)], 1, USER_ID);
      expect(result.isSuccess).toBe(true);

      const event = aggregate.getDomainEvents()[0] as GefaehrdungsbeurteilungAktualisiertEvent;
      expect(event.changedFields.added).toEqual(['generated:0', 'generated:1', newId]);
      expect(event.changedFields.removed).toEqual([]);
      expect(event.changedFields.updated).toEqual([]);
      expect(event.changedFields.unchanged).toBe(0);
    });

    it('(17) Remove-All mit 3 IDs: removed listet alle drei IDs (AC3)', () => {
      const id1 = 'clw3h8x9y0000qwertyuiggggg';
      const id2 = 'clw3h8x9y0000qwertyuihhhhh';
      const id3 = 'clw3h8x9y0000qwertyuiiiiii';
      const aggregate = buildFreshAggregate([buildItemWithId('A', id1), buildItemWithId('B', id2), buildItemWithId('C', id3)]);

      const result = aggregate.updateItems([], 1, USER_ID);
      expect(result.isSuccess).toBe(true);

      const event = aggregate.getDomainEvents()[0] as GefaehrdungsbeurteilungAktualisiertEvent;
      expect(event.changedFields.removed).toEqual([id1, id2, id3]);
      expect(event.changedFields.added).toEqual([]);
      expect(event.changedFields.updated).toEqual([]);
      expect(event.changedFields.unchanged).toBe(0);
    });

    it('(18) unchanged-Counter: 2 identisch + 1 mit neuem title (AC3, AC5)', () => {
      const id1 = 'clw3h8x9y0000qwertyuijjjjj';
      const id2 = 'clw3h8x9y0000qwertyuikkkkk';
      const id3 = 'clw3h8x9y0000qwertyuilllll';

      const aggregate = buildFreshAggregate([buildItemWithId('A', id1), buildItemWithId('B', id2), buildItemWithId('C-alt', id3)]);

      // A und B bleiben bit-identisch, C bekommt neuen title.
      const result = aggregate.updateItems([buildItemWithId('A', id1), buildItemWithId('B', id2), buildItemWithId('C-neu', id3)], 1, USER_ID);
      expect(result.isSuccess).toBe(true);

      const event = aggregate.getDomainEvents()[0] as GefaehrdungsbeurteilungAktualisiertEvent;
      expect(event.changedFields.unchanged).toBe(2);
      expect(event.changedFields.updated).toEqual([{ id: id3, fields: ['title'] }]);
      expect(event.changedFields.added).toEqual([]);
      expect(event.changedFields.removed).toEqual([]);
    });

    it('(19) get items() liefert ein eingefrorenes Array (AC6)', () => {
      const aggregate = buildFreshAggregate([buildItem('A')]);
      const snapshot = aggregate.items;
      expect(Object.isFrozen(snapshot)).toBe(true);
    });

    it('(20) Defensive-Copy: Mutation des Input-Arrays nach updateItems ändert aggregate.items NICHT (AC6)', () => {
      const aggregate = buildFreshAggregate([]);
      const input: GefaehrdungItem[] = [buildItem('A'), buildItem('B'), buildItem('C')];

      const result = aggregate.updateItems(input, 1, USER_ID);
      expect(result.isSuccess).toBe(true);

      const lengthAfterUpdate = aggregate.items.length;
      expect(lengthAfterUpdate).toBe(3);

      // Externe Mutation der Input-Referenz darf den Aggregate-State nicht berühren.
      input.pop();
      input.pop();
      expect(aggregate.items.length).toBe(lengthAfterUpdate);
    });

    it('(21) reconstitute: liefert Result.ok mit gegebener version und emittiert KEIN Event (AC1)', () => {
      const id = 'clw3h8x9y0000qwertyuimmmmm';
      const result = Gefaehrdungsbeurteilung.reconstitute({
        id,
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        createdBy: USER_ID,
        vorlageId: null,
        gefahrenzoneId: null,
        items: [],
        version: 7,
      });
      expect(result.isSuccess).toBe(true);

      const aggregate = result.value!;

      expect(aggregate.version).toBe(7);
      expect(aggregate.id.value).toBe(id);
      expect(aggregate.einsatzId).toBe(EINSATZ_ID);
      expect(aggregate.einheitId).toBe(EINHEIT_ID);
      expect(aggregate.createdBy).toBe(USER_ID);
      expect(aggregate.vorlageId).toBeNull();
      expect(aggregate.gefahrenzoneId).toBeNull();
      expect(aggregate.items).toHaveLength(0);
      expect(aggregate.getDomainEvents()).toHaveLength(0);
    });

    it('(22) reconstitute: liefert Result.fail bei ungültiger ID (AC1)', () => {
      const result = Gefaehrdungsbeurteilung.reconstitute({
        id: 'not-a-cuid',
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        createdBy: USER_ID,
        vorlageId: null,
        gefahrenzoneId: null,
        items: [],
        version: 1,
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toMatch(/ungültige ID/i);
    });

    it('(23) reconstitute: liefert Result.fail bei leerem Pflichtfeld und ungültiger Version (AC1)', () => {
      const missingEinsatz = Gefaehrdungsbeurteilung.reconstitute({
        id: 'clw3h8x9y0000qwertyuimmmmm',
        einsatzId: '',
        einheitId: EINHEIT_ID,
        createdBy: USER_ID,
        vorlageId: null,
        gefahrenzoneId: null,
        items: [],
        version: 1,
      });

      const invalidVersion = Gefaehrdungsbeurteilung.reconstitute({
        id: 'clw3h8x9y0000qwertyuimmmmm',
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        createdBy: USER_ID,
        vorlageId: null,
        gefahrenzoneId: null,
        items: [],
        version: 0,
      });

      expect(missingEinsatz.isFailure).toBe(true);
      expect(missingEinsatz.error).toMatch(/einsatzId/);
      expect(invalidVersion.isFailure).toBe(true);
      expect(invalidVersion.error).toMatch(/version/);
    });

    it('(24) reconstitute: items-Array wird defensiv kopiert (AC6)', () => {
      const id = 'clw3h8x9y0000qwertyuinnnnn';
      const inputItems: GefaehrdungItem[] = [buildItem('A'), buildItem('B')];

      const result = Gefaehrdungsbeurteilung.reconstitute({
        id,
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        createdBy: USER_ID,
        vorlageId: null,
        gefahrenzoneId: null,
        items: inputItems,
        version: 3,
      });
      expect(result.isSuccess).toBe(true);
      const aggregate = result.value!;

      const lengthAfter = aggregate.items.length;
      expect(lengthAfter).toBe(2);

      // Mutation der Input-Referenz darf den Aggregate-State nicht berühren.
      inputItems.pop();
      inputItems.pop();
      expect(aggregate.items.length).toBe(lengthAfter);
    });
  });

  describe('computeItemsDiff Invariant-Guard (Story 2.3, AC14 Case 9)', () => {
    // Die Audit-Quersumme `added.length + updated.length + unchanged === newItems.length`
    // kann durch externen Client-Input nicht gebrochen werden (jedes `newItems`-
    // Element landet in exakt einer Kategorie). Die defensive `Result.fail('Invariant:DiffSumMismatch')`
    // ist ein Guard gegen zukünftige Programmierfehler im Aggregate selbst.
    // Dieser Test triggert den Pfad via synthetisches Iterable, dessen `length`
    // über die tatsächlich iterierten Elemente hinweg lügt — entspricht dem in
    // AC14 dokumentierten „synthetisch via Internals-Zugriff"-Szenario.
    it('(25) liefert Invariant:DiffSumMismatch wenn Audit-Quersumme nicht aufgeht (AC14 Case 9)', () => {
      const aggregate = Gefaehrdungsbeurteilung.create({
        einsatzId: EINSATZ_ID,
        einheitId: EINHEIT_ID,
        createdBy: USER_ID,
        items: [],
      }).value!;

      const item = buildItem('A');
      // Synthetisches Array-ähnliches Objekt: Iterator yields genau 1 Element,
      // `.length` lügt mit 5. Der For-of-Loop kategorisiert 1 Item (added,
      // da ID-los), die finale Quersumme-Prüfung vergleicht gegen length=5 →
      // Invariant:DiffSumMismatch.
      const malformedNewItems = {
        0: item,
        length: 5,
        [Symbol.iterator]: function* () {
          yield item;
        },
      } as unknown as GefaehrdungItem[];

      type WithPrivate = {
        computeItemsDiff: (oldItems: readonly GefaehrdungItem[], newItems: readonly GefaehrdungItem[]) => ReturnType<typeof aggregate.updateItems>;
      };
      const internal = aggregate as unknown as WithPrivate;
      const result = internal.computeItemsDiff([], malformedNewItems);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Invariant:DiffSumMismatch');
    });
  });
});
