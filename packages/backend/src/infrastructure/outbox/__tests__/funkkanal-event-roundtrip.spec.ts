// @ts-nocheck
/**
 * Roundtrip-Tests für Funkkanal-Events durch Serializer → JSON → Deserializer.
 *
 * Issue #407: Sicherstellen, dass die 7 neuen Funkkanal-Events ohne Daten-Verlust
 * durch die Outbox gehen.
 */

import { EventSerializer } from '../event-serializer';
import { EventDeserializer } from '../event-deserializer';

import { FunkkanalErstelltEvent } from '@domain/events/funkkanal-erstellt.event';
import { FunkkanalGeaendertEvent } from '@domain/events/funkkanal-geaendert.event';
import { FunkkanalArchiviertEvent } from '@domain/events/funkkanal-archiviert.event';
import { FunkkanalReihenfolgeGeaendertEvent } from '@domain/events/funkkanal-reihenfolge-geaendert.event';
import { FunkkanalZuordnungErstelltEvent } from '@domain/events/funkkanal-zuordnung-erstellt.event';
import { FunkkanalZuordnungEntferntEvent } from '@domain/events/funkkanal-zuordnung-entfernt.event';
import { NotfallAlertRequestedEvent } from '@domain/events/notfall-alert-requested.event';

import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { EintragId } from '@domain/value-objects/eintrag-id';
import { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import { FunkkanalZuordnungId } from '@domain/value-objects/funkkanal-zuordnung-id';

const noopLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

describe('Funkkanal Events Round-Trip', () => {
  let serializer: EventSerializer;
  let deserializer: EventDeserializer;
  let einsatzId: EinsatzId;
  let funkkanalId: FunkkanalId;
  let zuordnungId: FunkkanalZuordnungId;
  let eintragId: EintragId;

  beforeAll(() => {
    einsatzId = EinsatzId.create().value as EinsatzId;
    funkkanalId = FunkkanalId.create().value as FunkkanalId;
    zuordnungId = FunkkanalZuordnungId.create().value as FunkkanalZuordnungId;
    eintragId = EintragId.create().value as EintragId;
  });

  beforeEach(() => {
    serializer = new EventSerializer();
    deserializer = new EventDeserializer(noopLogger);
  });

  it('FunkkanalErstelltEvent (TMO) roundtrip', () => {
    const original = new FunkkanalErstelltEvent(funkkanalId, einsatzId, {
      name: 'Feuer 1',
      details: { type: 'tmo', sprechgruppe: 'SG_FEUER_1', gssi: '1234' },
      status: 'aktiv',
      sortIndex: 2,
      zweck: 'Floriane',
    });
    const s = serializer.serialize(original);
    const json = JSON.parse(JSON.stringify(s));
    const r = deserializer.deserialize(json);
    expect(r.isSuccess).toBe(true);
    const restored = r.value as FunkkanalErstelltEvent;
    expect(restored.funkkanalId.value).toBe(funkkanalId.value);
    expect(restored.einsatzId.value).toBe(einsatzId.value);
    expect(restored.data.name).toBe('Feuer 1');
    expect(restored.data.details).toEqual({ type: 'tmo', sprechgruppe: 'SG_FEUER_1', gssi: '1234' });
    expect(restored.data.sortIndex).toBe(2);
    expect(restored.data.zweck).toBe('Floriane');
  });

  it('FunkkanalErstelltEvent (DMO) roundtrip', () => {
    const original = new FunkkanalErstelltEvent(funkkanalId, einsatzId, {
      name: 'DMO 1',
      details: { type: 'dmo', dmoKanal: '310', repeater: 'R1' },
      status: 'aktiv',
      sortIndex: 0,
    });
    const s = serializer.serialize(original);
    const r = deserializer.deserialize(JSON.parse(JSON.stringify(s)));
    expect(r.isSuccess).toBe(true);
    expect((r.value as FunkkanalErstelltEvent).data.details).toEqual({ type: 'dmo', dmoKanal: '310', repeater: 'R1' });
  });

  it('FunkkanalGeaendertEvent roundtrip', () => {
    const original = new FunkkanalGeaendertEvent(funkkanalId, einsatzId, { name: 'Neu', status: 'inaktiv' });
    const s = serializer.serialize(original);
    const r = deserializer.deserialize(JSON.parse(JSON.stringify(s)));
    expect(r.isSuccess).toBe(true);
    const restored = r.value as FunkkanalGeaendertEvent;
    expect(restored.changedFields).toEqual({ name: 'Neu', status: 'inaktiv' });
  });

  it('FunkkanalArchiviertEvent roundtrip', () => {
    const original = new FunkkanalArchiviertEvent(funkkanalId, einsatzId);
    const s = serializer.serialize(original);
    const r = deserializer.deserialize(JSON.parse(JSON.stringify(s)));
    expect(r.isSuccess).toBe(true);
    const restored = r.value as FunkkanalArchiviertEvent;
    expect(restored.funkkanalId.value).toBe(funkkanalId.value);
    expect(restored.einsatzId.value).toBe(einsatzId.value);
  });

  it('FunkkanalReihenfolgeGeaendertEvent roundtrip', () => {
    const original = new FunkkanalReihenfolgeGeaendertEvent(einsatzId, [
      { kanalId: 'k1', sortIndex: 0 },
      { kanalId: 'k2', sortIndex: 1 },
    ]);
    const s = serializer.serialize(original);
    const r = deserializer.deserialize(JSON.parse(JSON.stringify(s)));
    expect(r.isSuccess).toBe(true);
    const restored = r.value as FunkkanalReihenfolgeGeaendertEvent;
    expect(restored.ordering).toEqual([
      { kanalId: 'k1', sortIndex: 0 },
      { kanalId: 'k2', sortIndex: 1 },
    ]);
    // Aggregat-ID == einsatzId
    expect(restored.aggregateId).toBe(einsatzId.value);
  });

  it('FunkkanalZuordnungErstelltEvent roundtrip (Fahrzeug)', () => {
    const original = new FunkkanalZuordnungErstelltEvent(funkkanalId, einsatzId, zuordnungId, { kind: 'fahrzeug', fahrzeugId: 'fzg-1' }, 'Florian 1', 'primaer');
    const s = serializer.serialize(original);
    const r = deserializer.deserialize(JSON.parse(JSON.stringify(s)));
    expect(r.isSuccess).toBe(true);
    const restored = r.value as FunkkanalZuordnungErstelltEvent;
    expect(restored.kraftRef).toEqual({ kind: 'fahrzeug', fahrzeugId: 'fzg-1' });
    expect(restored.rufnameSnapshot).toBe('Florian 1');
    expect(restored.rolle).toBe('primaer');
    expect(restored.zuordnungId.value).toBe(zuordnungId.value);
  });

  it('FunkkanalZuordnungEntferntEvent roundtrip', () => {
    const original = new FunkkanalZuordnungEntferntEvent(funkkanalId, einsatzId, zuordnungId);
    const s = serializer.serialize(original);
    const r = deserializer.deserialize(JSON.parse(JSON.stringify(s)));
    expect(r.isSuccess).toBe(true);
    const restored = r.value as FunkkanalZuordnungEntferntEvent;
    expect(restored.zuordnungId.value).toBe(zuordnungId.value);
  });

  it('NotfallAlertRequestedEvent roundtrip', () => {
    const original = new NotfallAlertRequestedEvent(einsatzId, funkkanalId, eintragId, 'Hilfe!', 'Florian 2');
    const s = serializer.serialize(original);
    const r = deserializer.deserialize(JSON.parse(JSON.stringify(s)));
    expect(r.isSuccess).toBe(true);
    const restored = r.value as NotfallAlertRequestedEvent;
    expect(restored.text).toBe('Hilfe!');
    expect(restored.absender).toBe('Florian 2');
    expect(restored.funkspruchEintragId.value).toBe(eintragId.value);
    expect(restored.aggregateId).toBe(einsatzId.value);
  });

  it('NotfallAlertRequestedEvent ohne absender', () => {
    const original = new NotfallAlertRequestedEvent(einsatzId, funkkanalId, eintragId, 'Notfall');
    const s = serializer.serialize(original);
    const r = deserializer.deserialize(JSON.parse(JSON.stringify(s)));
    expect(r.isSuccess).toBe(true);
    expect((r.value as NotfallAlertRequestedEvent).absender).toBeUndefined();
  });
});
