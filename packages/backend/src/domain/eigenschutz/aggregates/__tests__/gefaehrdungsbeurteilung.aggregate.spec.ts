import { GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED, Gefaehrdungsbeurteilung } from '../gefaehrdungsbeurteilung.aggregate';
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
      expect(event.changedFields).toEqual({ added: 1, removed: 0, updated: 0 });
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

    it('(9) Diff: zählt added/removed/updated anhand der Item-IDs', () => {
      const idA = 'clw3h8x9y0000qwertyuiaaaaa';
      const idB = 'clw3h8x9y0000qwertyuibbbbb';
      const idC = 'clw3h8x9y0000qwertyuiccccc';

      const aggregate = buildFreshAggregate([buildItemWithId('A-alt', idA), buildItemWithId('B-alt', idB)]);

      // A wird aktualisiert (gleiche ID), B entfernt, C neu.
      const result = aggregate.updateItems([buildItemWithId('A-neu', idA), buildItemWithId('C-neu', idC)], 1, USER_ID);
      expect(result.isSuccess).toBe(true);

      const event = aggregate.getDomainEvents()[0] as GefaehrdungsbeurteilungAktualisiertEvent;
      expect(event.changedFields).toEqual({ added: 1, removed: 1, updated: 1 });
    });

    it('(10) Items ohne ID werden immer als "added" gezählt', () => {
      const aggregate = buildFreshAggregate([]);
      const result = aggregate.updateItems([buildItem('A'), buildItem('B'), buildItem('C')], 1, USER_ID);
      expect(result.isSuccess).toBe(true);

      const event = aggregate.getDomainEvents()[0] as GefaehrdungsbeurteilungAktualisiertEvent;
      expect(event.changedFields.added).toBe(3);
    });

    it('(11) Leeres newItems-Array entfernt alle Items und inkrementiert Version (kein 422)', () => {
      const idA = 'clw3h8x9y0000qwertyuiaaaaa';
      const aggregate = buildFreshAggregate([buildItemWithId('A', idA)]);

      const result = aggregate.updateItems([], 1, USER_ID);
      expect(result.isSuccess).toBe(true);
      expect(aggregate.version).toBe(2);
      expect(aggregate.items).toHaveLength(0);

      const event = aggregate.getDomainEvents()[0] as GefaehrdungsbeurteilungAktualisiertEvent;
      expect(event.changedFields).toEqual({ added: 0, removed: 1, updated: 0 });
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
  });
});
