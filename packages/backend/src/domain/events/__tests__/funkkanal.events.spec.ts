import { KanalDetails, type KanalDetailsShape } from '@domain/aggregates/funkkanal/kanal-details.vo';
import { EintragId } from '@domain/value-objects/eintrag-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import { FunkkanalZuordnungId } from '@domain/value-objects/funkkanal-zuordnung-id';
import { FunkkanalArchiviertEvent } from '../funkkanal-archiviert.event';
import { FunkkanalErstelltEvent } from '../funkkanal-erstellt.event';
import { FunkkanalGeaendertEvent } from '../funkkanal-geaendert.event';
import { FunkkanalReihenfolgeGeaendertEvent } from '../funkkanal-reihenfolge-geaendert.event';
import { FunkkanalZuordnungEntferntEvent } from '../funkkanal-zuordnung-entfernt.event';
import { FunkkanalZuordnungErstelltEvent } from '../funkkanal-zuordnung-erstellt.event';
import { NotfallAlertRequestedEvent } from '../notfall-alert-requested.event';

function einsatzId(): EinsatzId {
  return EinsatzId.create().value as EinsatzId;
}

function kanalId(): FunkkanalId {
  return FunkkanalId.create().value as FunkkanalId;
}

function zuordnungId(): FunkkanalZuordnungId {
  return FunkkanalZuordnungId.create().value as FunkkanalZuordnungId;
}

function tmo(): KanalDetailsShape {
  return KanalDetails.tmo({ sprechgruppe: 'SG_FEUER_1' }).value as KanalDetailsShape;
}

describe('Funkkanal Domain Events', () => {
  it('FunkkanalErstelltEvent trägt Payload und hat eindeutigen eventName', () => {
    const kid = kanalId();
    const eid = einsatzId();
    const event = new FunkkanalErstelltEvent(kid, eid, { name: 'Feuer 1', details: tmo(), status: 'aktiv', sortIndex: 0 });
    expect(FunkkanalErstelltEvent.eventName()).toBe('funkkanal.erstellt');
    expect(event.aggregateId).toBe(kid.value);
    expect(event.einsatzId).toBe(eid);
    expect(event.data.name).toBe('Feuer 1');
    expect(event.occurredAt).toBeInstanceOf(Date);
  });

  it('FunkkanalGeaendertEvent enthält changedFields', () => {
    const event = new FunkkanalGeaendertEvent(kanalId(), einsatzId(), { name: 'Feuer 2', status: 'inaktiv' });
    expect(FunkkanalGeaendertEvent.eventName()).toBe('funkkanal.geaendert');
    expect(event.changedFields).toEqual({ name: 'Feuer 2', status: 'inaktiv' });
  });

  it('FunkkanalArchiviertEvent hat korrekten eventName', () => {
    const event = new FunkkanalArchiviertEvent(kanalId(), einsatzId());
    expect(FunkkanalArchiviertEvent.eventName()).toBe('funkkanal.archiviert');
    expect(event.funkkanalId).toBeInstanceOf(FunkkanalId);
  });

  it('FunkkanalReihenfolgeGeaendertEvent trägt ordering-Liste; aggregateId = einsatzId', () => {
    const eid = einsatzId();
    const event = new FunkkanalReihenfolgeGeaendertEvent(eid, [
      { kanalId: 'k1', sortIndex: 0 },
      { kanalId: 'k2', sortIndex: 1 },
    ]);
    expect(FunkkanalReihenfolgeGeaendertEvent.eventName()).toBe('funkkanal.reihenfolge_geaendert');
    expect(event.aggregateId).toBe(eid.value);
    expect(event.ordering).toHaveLength(2);
  });

  it('FunkkanalZuordnungErstelltEvent trägt kraftRef und Rolle', () => {
    const event = new FunkkanalZuordnungErstelltEvent(kanalId(), einsatzId(), zuordnungId(), { kind: 'fahrzeug', fahrzeugId: 'f1' }, 'Florian 1', 'primaer');
    expect(FunkkanalZuordnungErstelltEvent.eventName()).toBe('funkkanal.zuordnung_erstellt');
    expect(event.kraftRef).toEqual({ kind: 'fahrzeug', fahrzeugId: 'f1' });
    expect(event.rolle).toBe('primaer');
  });

  it('FunkkanalZuordnungEntferntEvent trägt zuordnungId', () => {
    const zid = zuordnungId();
    const event = new FunkkanalZuordnungEntferntEvent(kanalId(), einsatzId(), zid);
    expect(FunkkanalZuordnungEntferntEvent.eventName()).toBe('funkkanal.zuordnung_entfernt');
    expect(event.zuordnungId).toBe(zid);
  });

  it('NotfallAlertRequestedEvent trägt text und absender', () => {
    const eid = einsatzId();
    const event = new NotfallAlertRequestedEvent(eid, kanalId(), EintragId.create().value as EintragId, 'Brand breitet sich aus', 'Florian 1');
    expect(NotfallAlertRequestedEvent.eventName()).toBe('funk.notfall_alert_requested');
    expect(event.aggregateId).toBe(eid.value);
    expect(event.text).toBe('Brand breitet sich aus');
    expect(event.absender).toBe('Florian 1');
  });

  it('alle Event-Namen sind eindeutig und kebab-/snake-case', () => {
    const names = [
      FunkkanalErstelltEvent.eventName(),
      FunkkanalGeaendertEvent.eventName(),
      FunkkanalArchiviertEvent.eventName(),
      FunkkanalReihenfolgeGeaendertEvent.eventName(),
      FunkkanalZuordnungErstelltEvent.eventName(),
      FunkkanalZuordnungEntferntEvent.eventName(),
      NotfallAlertRequestedEvent.eventName(),
    ];
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) {
      expect(n).toMatch(/^[a-z]+(\.[a-z_]+)+$/);
    }
  });
});
