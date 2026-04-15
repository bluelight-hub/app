// @ts-nocheck
/**
 * Roundtrip-Tests für Alarmierung-Events durch Serializer → JSON → Deserializer.
 *
 * Issue #408: Sicherstellen, dass die 7 neuen Alarmierung-Events ohne
 * Daten-Verlust durch die Outbox gehen (inkl. Null-Zeitpunkte bei
 * `ZeitpunktKorrigiert` und Top-Level `abgeschlossenVon` bei `Abgeschlossen`).
 */

import { EventSerializer } from '../event-serializer';
import { EventDeserializer } from '../event-deserializer';

import { AlarmierungAbgeschlossenEvent } from '@domain/events/alarmierung-abgeschlossen.event';
import { AlarmierungEmpfaengerEntferntEvent } from '@domain/events/alarmierung-empfaenger-entfernt.event';
import { AlarmierungEmpfaengerHinzugefuegtEvent } from '@domain/events/alarmierung-empfaenger-hinzugefuegt.event';
import { AlarmierungErstelltEvent } from '@domain/events/alarmierung-erstellt.event';
import { AlarmierungZeitpunktFmsGesetztEvent } from '@domain/events/alarmierung-zeitpunkt-fms-gesetzt.event';
import { AlarmierungZeitpunktKorrigiertEvent } from '@domain/events/alarmierung-zeitpunkt-korrigiert.event';
import { NachalarmierungErstelltEvent } from '@domain/events/nachalarmierung-erstellt.event';

import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { AlarmierungEmpfaengerId } from '@domain/value-objects/alarmierung-empfaenger-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';

const noopLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

describe('Alarmierung Events Round-Trip', () => {
  let serializer: EventSerializer;
  let deserializer: EventDeserializer;
  let einsatzId: EinsatzId;
  let alarmierungId: AlarmierungId;
  let empfaengerId: AlarmierungEmpfaengerId;

  beforeAll(() => {
    einsatzId = EinsatzId.create().value as EinsatzId;
    alarmierungId = AlarmierungId.create().value as AlarmierungId;
    empfaengerId = AlarmierungEmpfaengerId.create().value as AlarmierungEmpfaengerId;
  });

  beforeEach(() => {
    serializer = new EventSerializer();
    deserializer = new EventDeserializer(noopLogger);
  });

  function roundtrip<T>(event: T): T {
    const s = serializer.serialize(event as never);
    const json = JSON.parse(JSON.stringify(s));
    const r = deserializer.deserialize(json);
    expect(r.isSuccess).toBe(true);
    return r.value as T;
  }

  it('AlarmierungErstelltEvent roundtrip (mit Beschreibung)', () => {
    const original = new AlarmierungErstelltEvent(alarmierungId, einsatzId, {
      bezeichnung: 'Wohnungsbrand',
      beschreibung: 'Küche brennt',
      alarmierungszeit: new Date('2026-04-15T10:00:00Z'),
      empfaengerCount: 0,
    });
    const restored = roundtrip(original);
    expect(restored.alarmierungId.value).toBe(alarmierungId.value);
    expect(restored.einsatzId.value).toBe(einsatzId.value);
    expect(restored.data.bezeichnung).toBe('Wohnungsbrand');
    expect(restored.data.beschreibung).toBe('Küche brennt');
    expect(restored.data.alarmierungszeit.toISOString()).toBe('2026-04-15T10:00:00.000Z');
    expect(restored.data.empfaengerCount).toBe(0);
    expect(restored.data.ursprungAlarmierungId).toBeUndefined();
  });

  it('AlarmierungErstelltEvent roundtrip (ohne Beschreibung, mit ursprungAlarmierungId)', () => {
    const ursprungId = AlarmierungId.create().value as AlarmierungId;
    const original = new AlarmierungErstelltEvent(alarmierungId, einsatzId, {
      bezeichnung: 'Nach-Alarm',
      alarmierungszeit: new Date('2026-04-15T11:00:00Z'),
      ursprungAlarmierungId: ursprungId.value,
      empfaengerCount: 2,
    });
    const restored = roundtrip(original);
    expect(restored.data.beschreibung).toBeUndefined();
    expect(restored.data.ursprungAlarmierungId).toBe(ursprungId.value);
    expect(restored.data.empfaengerCount).toBe(2);
  });

  it('AlarmierungEmpfaengerHinzugefuegtEvent roundtrip (Fahrzeug)', () => {
    const original = new AlarmierungEmpfaengerHinzugefuegtEvent(alarmierungId, einsatzId, {
      empfaengerId,
      ref: { kind: 'fahrzeug', fahrzeugId: 'fzg-1' },
      nameSnapshot: 'Florian 1',
      alarmiertAm: new Date('2026-04-15T10:01:00Z'),
    });
    const restored = roundtrip(original);
    expect(restored.data.empfaengerId.value).toBe(empfaengerId.value);
    expect(restored.data.ref).toEqual({ kind: 'fahrzeug', fahrzeugId: 'fzg-1' });
    expect(restored.data.nameSnapshot).toBe('Florian 1');
    expect(restored.data.alarmiertAm.toISOString()).toBe('2026-04-15T10:01:00.000Z');
  });

  it('AlarmierungEmpfaengerHinzugefuegtEvent roundtrip (Person)', () => {
    const original = new AlarmierungEmpfaengerHinzugefuegtEvent(alarmierungId, einsatzId, {
      empfaengerId,
      ref: { kind: 'person', personId: 'p-1' },
      nameSnapshot: 'Müller',
      alarmiertAm: new Date('2026-04-15T10:01:00Z'),
    });
    const restored = roundtrip(original);
    expect(restored.data.ref).toEqual({ kind: 'person', personId: 'p-1' });
    expect(restored.data.nameSnapshot).toBe('Müller');
  });

  it('AlarmierungEmpfaengerHinzugefuegtEvent roundtrip (Einheit)', () => {
    const original = new AlarmierungEmpfaengerHinzugefuegtEvent(alarmierungId, einsatzId, {
      empfaengerId,
      ref: { kind: 'einheit', einheitId: 'e-1' },
      nameSnapshot: 'Gruppe Süd',
      alarmiertAm: new Date('2026-04-15T10:01:00Z'),
    });
    const restored = roundtrip(original);
    expect(restored.data.ref).toEqual({ kind: 'einheit', einheitId: 'e-1' });
  });

  it('AlarmierungEmpfaengerEntferntEvent roundtrip', () => {
    const original = new AlarmierungEmpfaengerEntferntEvent(alarmierungId, einsatzId, {
      empfaengerId,
      nameSnapshot: 'Florian 1',
    });
    const restored = roundtrip(original);
    expect(restored.data.empfaengerId.value).toBe(empfaengerId.value);
    expect(restored.data.nameSnapshot).toBe('Florian 1');
  });

  it('AlarmierungZeitpunktKorrigiertEvent roundtrip (beide Werte gesetzt)', () => {
    const original = new AlarmierungZeitpunktKorrigiertEvent(alarmierungId, einsatzId, {
      empfaengerId,
      nameSnapshot: 'Florian 1',
      feld: 'vorOrtAm',
      alterWert: new Date('2026-04-15T10:15:00Z'),
      neuerWert: new Date('2026-04-15T10:20:00Z'),
      korrigiertVon: 'user-1',
    });
    const restored = roundtrip(original);
    expect(restored.data.feld).toBe('vorOrtAm');
    expect(restored.data.alterWert?.toISOString()).toBe('2026-04-15T10:15:00.000Z');
    expect(restored.data.neuerWert?.toISOString()).toBe('2026-04-15T10:20:00.000Z');
    expect(restored.data.korrigiertVon).toBe('user-1');
  });

  it('AlarmierungZeitpunktKorrigiertEvent roundtrip (alterWert null, neuerWert gesetzt)', () => {
    const original = new AlarmierungZeitpunktKorrigiertEvent(alarmierungId, einsatzId, {
      empfaengerId,
      nameSnapshot: 'Florian 1',
      feld: 'ausgeruecktAm',
      alterWert: null,
      neuerWert: new Date('2026-04-15T10:05:00Z'),
      korrigiertVon: 'user-1',
    });
    const restored = roundtrip(original);
    expect(restored.data.alterWert).toBeNull();
    expect(restored.data.neuerWert?.toISOString()).toBe('2026-04-15T10:05:00.000Z');
  });

  it('AlarmierungZeitpunktKorrigiertEvent roundtrip (beide Werte null — Löschung)', () => {
    const original = new AlarmierungZeitpunktKorrigiertEvent(alarmierungId, einsatzId, {
      empfaengerId,
      nameSnapshot: 'Florian 1',
      feld: 'wiederFreiAm',
      alterWert: null,
      neuerWert: null,
      korrigiertVon: 'user-1',
    });
    const restored = roundtrip(original);
    expect(restored.data.alterWert).toBeNull();
    expect(restored.data.neuerWert).toBeNull();
  });

  it('AlarmierungZeitpunktFmsGesetztEvent roundtrip', () => {
    const original = new AlarmierungZeitpunktFmsGesetztEvent(alarmierungId, einsatzId, {
      empfaengerId,
      nameSnapshot: 'Florian 1',
      feld: 'ausgeruecktAm',
      wert: new Date('2026-04-15T10:05:00Z'),
      fmsStatus: 3,
    });
    const restored = roundtrip(original);
    expect(restored.data.feld).toBe('ausgeruecktAm');
    expect(restored.data.wert.toISOString()).toBe('2026-04-15T10:05:00.000Z');
    expect(restored.data.fmsStatus).toBe(3);
  });

  it('AlarmierungAbgeschlossenEvent roundtrip (M1: abgeschlossenVon als Top-Level)', () => {
    const original = new AlarmierungAbgeschlossenEvent(alarmierungId, einsatzId, 'user-1');
    const restored = roundtrip(original);
    expect(restored.alarmierungId.value).toBe(alarmierungId.value);
    expect(restored.einsatzId.value).toBe(einsatzId.value);
    expect(restored.abgeschlossenVon).toBe('user-1');
  });

  it('NachalarmierungErstelltEvent roundtrip', () => {
    const ursprungId = AlarmierungId.create().value as AlarmierungId;
    const original = new NachalarmierungErstelltEvent(alarmierungId, einsatzId, {
      bezeichnung: 'Nach-Alarm',
      ursprungAlarmierungId: ursprungId,
    });
    const restored = roundtrip(original);
    expect(restored.data.bezeichnung).toBe('Nach-Alarm');
    expect(restored.data.ursprungAlarmierungId.value).toBe(ursprungId.value);
  });
});
