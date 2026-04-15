import { FunkkanalAggregate } from '../funkkanal.aggregate';
import type { FunkkanalZuordnung } from '../funkkanal-zuordnung.entity';
import { KanalDetails, type KanalDetailsShape } from '../kanal-details.vo';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { FunkkanalArchiviertEvent } from '@domain/events/funkkanal-archiviert.event';
import { FunkkanalErstelltEvent } from '@domain/events/funkkanal-erstellt.event';
import { FunkkanalGeaendertEvent } from '@domain/events/funkkanal-geaendert.event';
import { FunkkanalZuordnungEntferntEvent } from '@domain/events/funkkanal-zuordnung-entfernt.event';
import { FunkkanalZuordnungErstelltEvent } from '@domain/events/funkkanal-zuordnung-erstellt.event';

function makeEinsatzId(): EinsatzId {
  const r = EinsatzId.create();
  if (r.isFailure) throw new Error(r.error as string);
  return r.value as EinsatzId;
}

function tmoDetails(): KanalDetailsShape {
  const r = KanalDetails.tmo({ sprechgruppe: 'SG_FEUER_1' });
  if (r.isFailure) throw new Error(r.error as string);
  return r.value as KanalDetailsShape;
}

function dmoDetails(): KanalDetailsShape {
  const r = KanalDetails.dmo({ dmoKanal: '310' });
  if (r.isFailure) throw new Error(r.error as string);
  return r.value as KanalDetailsShape;
}

function createAggregate() {
  const einsatzId = makeEinsatzId();
  const r = FunkkanalAggregate.create({ einsatzId, name: 'Feuer 1', details: tmoDetails(), sortIndex: 0, createdBy: 'user-1' });
  if (r.isFailure) throw new Error(r.error as string);
  return { einsatzId, aggregate: r.value as FunkkanalAggregate };
}

describe('FunkkanalAggregate', () => {
  describe('create', () => {
    it('erstellt aktiven Kanal mit ErstelltEvent', () => {
      const { aggregate } = createAggregate();
      expect(aggregate.status).toBe('aktiv');
      expect(aggregate.name).toBe('Feuer 1');
      expect(aggregate.sortIndex).toBe(0);
      const events = aggregate.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(FunkkanalErstelltEvent);
    });

    it('trimmt Whitespace im Namen', () => {
      const einsatzId = makeEinsatzId();
      const r = FunkkanalAggregate.create({ einsatzId, name: '  SG_Feuer ', details: tmoDetails(), sortIndex: 0 });
      expect(r.isSuccess).toBe(true);
      expect((r.value as FunkkanalAggregate).name).toBe('SG_Feuer');
    });

    it('lehnt leeren Namen ab', () => {
      const einsatzId = makeEinsatzId();
      const r = FunkkanalAggregate.create({ einsatzId, name: '   ', details: tmoDetails(), sortIndex: 0 });
      expect(r.isFailure).toBe(true);
    });

    it('lehnt negativen sortIndex ab', () => {
      const einsatzId = makeEinsatzId();
      const r = FunkkanalAggregate.create({ einsatzId, name: 'Feuer', details: tmoDetails(), sortIndex: -1 });
      expect(r.isFailure).toBe(true);
    });

    it('akzeptiert keinen archivierten Startstatus (Factory limitiert auf aktiv)', () => {
      const { aggregate } = createAggregate();
      expect(aggregate.status).not.toBe('archiviert');
    });
  });

  describe('rename', () => {
    it('ändert Namen und emittiert Geaendert-Event', () => {
      const { aggregate } = createAggregate();
      aggregate.clearDomainEvents();
      const r = aggregate.rename('Feuer 2');
      expect(r.isSuccess).toBe(true);
      expect(aggregate.name).toBe('Feuer 2');
      const events = aggregate.getDomainEvents();
      expect(events[0]).toBeInstanceOf(FunkkanalGeaendertEvent);
      expect((events[0] as FunkkanalGeaendertEvent).changedFields.name).toBe('Feuer 2');
    });

    it('ist No-Op bei gleichem Namen', () => {
      const { aggregate } = createAggregate();
      aggregate.clearDomainEvents();
      const r = aggregate.rename('Feuer 1');
      expect(r.isSuccess).toBe(true);
      expect(aggregate.getDomainEvents()).toHaveLength(0);
    });

    it('lehnt leeren Namen ab', () => {
      const { aggregate } = createAggregate();
      expect(aggregate.rename('').isFailure).toBe(true);
    });
  });

  describe('changeDetails', () => {
    it('wechselt Details und emittiert Geaendert-Event', () => {
      const { aggregate } = createAggregate();
      aggregate.clearDomainEvents();
      const r = aggregate.changeDetails(dmoDetails());
      expect(r.isSuccess).toBe(true);
      expect(aggregate.details.type).toBe('dmo');
      const events = aggregate.getDomainEvents();
      expect(events[0]).toBeInstanceOf(FunkkanalGeaendertEvent);
      expect((events[0] as FunkkanalGeaendertEvent).changedFields.details?.type).toBe('dmo');
    });
  });

  describe('setZweck / setSortIndex', () => {
    it('setzt Zweck und emittiert Geaendert-Event', () => {
      const { aggregate } = createAggregate();
      aggregate.clearDomainEvents();
      const r = aggregate.setZweck('Abschnitt Nord');
      expect(r.isSuccess).toBe(true);
      expect(aggregate.zweck).toBe('Abschnitt Nord');
      expect(aggregate.getDomainEvents()[0]).toBeInstanceOf(FunkkanalGeaendertEvent);
    });

    it('setzt sortIndex und emittiert Geaendert-Event', () => {
      const { aggregate } = createAggregate();
      aggregate.clearDomainEvents();
      const r = aggregate.setSortIndex(42);
      expect(r.isSuccess).toBe(true);
      expect(aggregate.sortIndex).toBe(42);
      const evt = aggregate.getDomainEvents()[0] as FunkkanalGeaendertEvent;
      expect(evt.changedFields.sortIndex).toBe(42);
    });

    it('lehnt negativen sortIndex ab', () => {
      const { aggregate } = createAggregate();
      expect(aggregate.setSortIndex(-1).isFailure).toBe(true);
    });
  });

  describe('archive / deactivate / activate', () => {
    it('archiviert Kanal', () => {
      const { aggregate } = createAggregate();
      aggregate.clearDomainEvents();
      const r = aggregate.archive();
      expect(r.isSuccess).toBe(true);
      expect(aggregate.status).toBe('archiviert');
      expect(aggregate.getDomainEvents()[0]).toBeInstanceOf(FunkkanalArchiviertEvent);
    });

    it('deaktiviert und reaktiviert Kanal', () => {
      const { aggregate } = createAggregate();
      aggregate.clearDomainEvents();
      expect(aggregate.deactivate().isSuccess).toBe(true);
      expect(aggregate.status).toBe('inaktiv');
      expect(aggregate.activate().isSuccess).toBe(true);
      expect(aggregate.status).toBe('aktiv');
      const events = aggregate.getDomainEvents();
      expect(events).toHaveLength(2);
      expect(events[0]).toBeInstanceOf(FunkkanalGeaendertEvent);
      expect(events[1]).toBeInstanceOf(FunkkanalGeaendertEvent);
    });

    it('lehnt Mutation auf archiviertem Kanal ab', () => {
      const { aggregate } = createAggregate();
      aggregate.archive();
      expect(aggregate.rename('X').isFailure).toBe(true);
      expect(aggregate.deactivate().isFailure).toBe(true);
      expect(aggregate.activate().isFailure).toBe(true);
      expect(aggregate.setSortIndex(5).isFailure).toBe(true);
    });
  });

  describe('zuordneKraft', () => {
    it('erzeugt Zuordnung mit ZuordnungErstelltEvent', () => {
      const { aggregate } = createAggregate();
      aggregate.clearDomainEvents();
      const r = aggregate.zuordneKraft({ kraftRef: { kind: 'fahrzeug', fahrzeugId: 'f1' }, rufnameSnapshot: 'Florian 1', rolle: 'primaer' });
      expect(r.isSuccess).toBe(true);
      const zuordnung = r.value as FunkkanalZuordnung;
      expect(zuordnung.kraftRef).toEqual({ kind: 'fahrzeug', fahrzeugId: 'f1' });
      expect(aggregate.zuordnungen).toHaveLength(1);
      expect(aggregate.getDomainEvents()[0]).toBeInstanceOf(FunkkanalZuordnungErstelltEvent);
    });

    it('verhindert doppelte Zuordnung derselben Kraft', () => {
      const { aggregate } = createAggregate();
      aggregate.zuordneKraft({ kraftRef: { kind: 'fahrzeug', fahrzeugId: 'f1' }, rufnameSnapshot: 'Florian 1', rolle: 'primaer' });
      const r = aggregate.zuordneKraft({ kraftRef: { kind: 'fahrzeug', fahrzeugId: 'f1' }, rufnameSnapshot: 'Florian 1', rolle: 'sekundaer' });
      expect(r.isFailure).toBe(true);
    });

    it('lehnt kraftRef mit fehlender ID ab', () => {
      const { aggregate } = createAggregate();
      const r = aggregate.zuordneKraft({ kraftRef: { kind: 'fahrzeug', fahrzeugId: '' }, rufnameSnapshot: 'Florian 1', rolle: 'primaer' });
      expect(r.isFailure).toBe(true);
    });

    it('lehnt leeren rufnameSnapshot ab', () => {
      const { aggregate } = createAggregate();
      const r = aggregate.zuordneKraft({ kraftRef: { kind: 'fahrzeug', fahrzeugId: 'f1' }, rufnameSnapshot: '  ', rolle: 'primaer' });
      expect(r.isFailure).toBe(true);
    });

    it('akzeptiert person- und einheit-Kraftreferenzen', () => {
      const { aggregate } = createAggregate();
      expect(aggregate.zuordneKraft({ kraftRef: { kind: 'person', personId: 'p1' }, rufnameSnapshot: 'GF', rolle: 'primaer' }).isSuccess).toBe(true);
      expect(aggregate.zuordneKraft({ kraftRef: { kind: 'einheit', einheitId: 'e1' }, rufnameSnapshot: 'Zug 1', rolle: 'zuhoeren' }).isSuccess).toBe(true);
      expect(aggregate.zuordnungen).toHaveLength(2);
    });
  });

  describe('aendereZuordnungRolle', () => {
    it('aktualisiert Rolle', () => {
      const { aggregate } = createAggregate();
      const r = aggregate.zuordneKraft({ kraftRef: { kind: 'fahrzeug', fahrzeugId: 'f1' }, rufnameSnapshot: 'Florian 1', rolle: 'primaer' });
      const zuordnung = r.value as FunkkanalZuordnung;
      aggregate.clearDomainEvents();
      const upd = aggregate.aendereZuordnungRolle(zuordnung.id, 'sekundaer');
      expect(upd.isSuccess).toBe(true);
      expect(aggregate.zuordnungen[0].rolle).toBe('sekundaer');
      expect(aggregate.getDomainEvents()[0]).toBeInstanceOf(FunkkanalGeaendertEvent);
    });

    it('gibt Fehler bei unbekannter Zuordnung zurück', () => {
      const { aggregate } = createAggregate();
      const fake = aggregate.zuordneKraft({ kraftRef: { kind: 'fahrzeug', fahrzeugId: 'f2' }, rufnameSnapshot: 'X', rolle: 'primaer' }).value as FunkkanalZuordnung;
      aggregate.entferneZuordnung(fake.id);
      const r = aggregate.aendereZuordnungRolle(fake.id, 'sekundaer');
      expect(r.isFailure).toBe(true);
    });
  });

  describe('entferneZuordnung', () => {
    it('entfernt Zuordnung und emittiert EntferntEvent', () => {
      const { aggregate } = createAggregate();
      const r = aggregate.zuordneKraft({ kraftRef: { kind: 'fahrzeug', fahrzeugId: 'f1' }, rufnameSnapshot: 'Florian 1', rolle: 'primaer' });
      const zuordnung = r.value as FunkkanalZuordnung;
      aggregate.clearDomainEvents();
      const upd = aggregate.entferneZuordnung(zuordnung.id);
      expect(upd.isSuccess).toBe(true);
      expect(aggregate.zuordnungen).toHaveLength(0);
      expect(aggregate.getDomainEvents()[0]).toBeInstanceOf(FunkkanalZuordnungEntferntEvent);
    });
  });

  describe('reconstitute', () => {
    it('rekonstituiert ohne Events', () => {
      const { aggregate } = createAggregate();
      const reconstituted = FunkkanalAggregate.reconstitute(aggregate.kanal, [...aggregate.zuordnungen]);
      expect(reconstituted.getDomainEvents()).toHaveLength(0);
      expect(reconstituted.name).toBe('Feuer 1');
    });
  });
});
