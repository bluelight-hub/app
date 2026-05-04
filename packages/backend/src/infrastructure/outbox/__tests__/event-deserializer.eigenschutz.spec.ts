import { EventDeserializer } from '../event-deserializer';
import { EventSerializer, type SerializedEvent } from '../event-serializer';
import { QuittungAbgegebenEvent } from '@domain/eigenschutz/events/quittung-abgegeben.event';
import { LueckeGemeldetEvent } from '@domain/eigenschutz/events/luecke-gemeldet.event';
import { QuittungUeberfaelligEvent } from '@domain/eigenschutz/events/quittung-ueberfaellig.event';
import { KonfliktErkanntEvent } from '@domain/eigenschutz/events/konflikt-erkannt.event';
import { KonfliktAufgeloestEvent, type SyncConflictResolution } from '@domain/eigenschutz/events/konflikt-aufgeloest.event';

/**
 * Story 3.4 — Round-Trip-Test für `QuittungAbgegebenEvent`.
 *
 * Verifiziert, dass das Event über Serializer → Deserializer
 * verlustfrei rekonstruiert wird (4-Stellen-Registry-Konsistenz).
 */
describe('EventDeserializer — Eigenschutz QuittungAbgegeben (Story 3.4)', () => {
  const deserializer = new EventDeserializer();
  const serializer = new EventSerializer();

  function createSerialized(payload: Record<string, unknown>): SerializedEvent {
    return {
      eventId: 'test-evt-id',
      eventName: 'eigenschutz.quittung_abgegeben',
      eventVersion: 1,
      occurredAt: new Date('2026-04-24T10:30:45.123Z').toISOString(),
      aggregateId: 'group-cuid2-test',
      payload,
    };
  }

  it('roundtrip: serialize → deserialize liefert äquivalentes Event', () => {
    const original = new QuittungAbgegebenEvent(
      'einsatz-cuid2-1234567890123456',
      'user-cuid2-12345678901234567890',
      'einheit-cuid2-1234567890123456',
      'group-cuid2-12345678901234567',
      new Date('2026-04-24T10:30:45.123Z'),
    );

    const serialized = serializer.serialize(original);
    expect(serialized.eventName).toBe('eigenschutz.quittung_abgegeben');

    const result = deserializer.deserialize(serialized);
    expect(result.isSuccess).toBe(true);

    const event = result.value as QuittungAbgegebenEvent;
    expect(event).toBeInstanceOf(QuittungAbgegebenEvent);
    expect(event.einsatzId).toBe(original.einsatzId);
    expect(event.userId).toBe(original.userId);
    expect(event.einheitId).toBe(original.einheitId);
    expect(event.propagationGroupId).toBe(original.propagationGroupId);
    expect(event.quittiertAm.toISOString()).toBe(original.quittiertAm.toISOString());
  });

  it('schlägt fehl bei fehlender propagationGroupId', () => {
    const result = deserializer.deserialize(
      createSerialized({
        einsatzId: 'einsatz-1',
        userId: 'user-1',
        einheitId: 'einheit-1',
        quittiertAm: '2026-04-24T10:00:00.000Z',
      }),
    );
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('eigenschutz.quittung_abgegeben');
  });

  it('schlägt fehl bei ungültigem quittiertAm-Format', () => {
    const result = deserializer.deserialize(
      createSerialized({
        einsatzId: 'einsatz-1',
        userId: 'user-1',
        einheitId: 'einheit-1',
        propagationGroupId: 'group-1',
        quittiertAm: 'not-a-date',
      }),
    );
    expect(result.isFailure).toBe(true);
  });
});

/**
 * Story 3.6 — Round-Trip-Test für `LueckeGemeldetEvent`.
 *
 * Verifiziert, dass das Event über Serializer → Deserializer verlustfrei
 * rekonstruiert wird (4-Stellen-Registry-Konsistenz, AC1).
 */
describe('EventDeserializer — Eigenschutz LueckeGemeldet (Story 3.6)', () => {
  const deserializer = new EventDeserializer();
  const serializer = new EventSerializer();

  function createSerialized(payload: Record<string, unknown>): SerializedEvent {
    return {
      eventId: 'test-evt-id',
      eventName: 'eigenschutz.luecke_gemeldet',
      eventVersion: 1,
      occurredAt: new Date('2026-04-24T10:30:45.123Z').toISOString(),
      aggregateId: 'group-cuid2-test',
      payload,
    };
  }

  it('roundtrip: serialize → deserialize liefert äquivalentes Event', () => {
    const original = new LueckeGemeldetEvent(
      'einsatz-cuid2-1234567890123456',
      'user-cuid2-12345678901234567890',
      'einheit-cuid2-1234567890123456',
      'group-cuid2-12345678901234567',
      'Schutzanzug Größe L fehlt Einheit 2 — nachgeordert 14:28',
      new Date('2026-04-24T10:30:45.123Z'),
    );

    const serialized = serializer.serialize(original);
    expect(serialized.eventName).toBe('eigenschutz.luecke_gemeldet');

    const result = deserializer.deserialize(serialized);
    expect(result.isSuccess).toBe(true);

    const event = result.value as LueckeGemeldetEvent;
    expect(event).toBeInstanceOf(LueckeGemeldetEvent);
    expect(event.einsatzId).toBe(original.einsatzId);
    expect(event.userId).toBe(original.userId);
    expect(event.einheitId).toBe(original.einheitId);
    expect(event.propagationGroupId).toBe(original.propagationGroupId);
    expect(event.meldung).toBe(original.meldung);
    expect(event.gemeldetAm.toISOString()).toBe(original.gemeldetAm.toISOString());
    // Invariante (Story 3.6 AC1): `aggregateId` defaultet auf `propagationGroupId`
    // und überlebt den Round-Trip.
    expect(event.aggregateId).toBe(original.propagationGroupId);
    expect(event.aggregateId).toBe(original.aggregateId);
  });

  it('schlägt fehl bei fehlender meldung', () => {
    const result = deserializer.deserialize(
      createSerialized({
        einsatzId: 'einsatz-1',
        userId: 'user-1',
        einheitId: 'einheit-1',
        propagationGroupId: 'group-1',
        gemeldetAm: '2026-04-24T10:00:00.000Z',
      }),
    );
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('eigenschutz.luecke_gemeldet');
  });

  it('schlägt fehl bei ungültigem gemeldetAm-Format', () => {
    const result = deserializer.deserialize(
      createSerialized({
        einsatzId: 'einsatz-1',
        userId: 'user-1',
        einheitId: 'einheit-1',
        propagationGroupId: 'group-1',
        meldung: 'Test-Lücke',
        gemeldetAm: 'not-a-date',
      }),
    );
    expect(result.isFailure).toBe(true);
  });
});

/**
 * Story 3.7 — Round-Trip-Test für `QuittungUeberfaelligEvent`.
 *
 * Verifiziert, dass das Event über Serializer → Deserializer verlustfrei
 * rekonstruiert wird (4-Stellen-Registry-Konsistenz, AC1) und dass der
 * `userId === 'SYSTEM'`-Sentinel erhalten bleibt.
 */
describe('EventDeserializer — Eigenschutz QuittungUeberfaellig (Story 3.7)', () => {
  const deserializer = new EventDeserializer();
  const serializer = new EventSerializer();

  function createSerialized(payload: Record<string, unknown>): SerializedEvent {
    return {
      eventId: 'test-evt-id',
      eventName: 'eigenschutz.quittung_ueberfaellig',
      eventVersion: 1,
      occurredAt: new Date('2026-04-24T10:30:45.123Z').toISOString(),
      aggregateId: 'group-cuid2-test:einheit-cuid2-test',
      payload,
    };
  }

  it('roundtrip: serialize → deserialize liefert äquivalentes Event', () => {
    const original = new QuittungUeberfaelligEvent(
      'einsatz-cuid2-1234567890123456',
      'einheit-cuid2-1234567890123456',
      'group-cuid2-12345678901234567',
      'origevt-cuid2-1234567890123',
      6,
      'zuw-cuid2-1234567890123',
    );

    const serialized = serializer.serialize(original);
    expect(serialized.eventName).toBe('eigenschutz.quittung_ueberfaellig');

    const result = deserializer.deserialize(serialized);
    expect(result.isSuccess).toBe(true);

    const event = result.value as QuittungUeberfaelligEvent;
    expect(event).toBeInstanceOf(QuittungUeberfaelligEvent);
    expect(event.einsatzId).toBe(original.einsatzId);
    expect(event.userId).toBe('SYSTEM');
    expect(event.einheitId).toBe(original.einheitId);
    expect(event.propagationGroupId).toBe(original.propagationGroupId);
    expect(event.originalEventId).toBe(original.originalEventId);
    expect(event.ueberfaelligSeitMin).toBe(original.ueberfaelligSeitMin);
    expect(event.zuweisungId).toBe(original.zuweisungId);
    expect(event.aggregateId).toBe(`${original.propagationGroupId}:${original.einheitId}`);
  });

  it('roundtrip: zuweisungId === null bleibt null', () => {
    const original = new QuittungUeberfaelligEvent('einsatz-cuid2-1234567890123456', 'einheit-cuid2-1234567890123456', 'group-cuid2-12345678901234567', 'origevt-cuid2-1234567890123', 5, null);

    const serialized = serializer.serialize(original);
    const result = deserializer.deserialize(serialized);
    expect(result.isSuccess).toBe(true);
    const event = result.value as QuittungUeberfaelligEvent;
    expect(event.zuweisungId).toBeNull();
  });

  it('schlägt fehl bei fehlender originalEventId', () => {
    const result = deserializer.deserialize(
      createSerialized({
        einsatzId: 'einsatz-1',
        einheitId: 'einheit-1',
        propagationGroupId: 'group-1',
        ueberfaelligSeitMin: 5,
        zuweisungId: null,
      }),
    );
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('eigenschutz.quittung_ueberfaellig');
  });

  it('schlägt fehl bei negativem ueberfaelligSeitMin', () => {
    const result = deserializer.deserialize(
      createSerialized({
        einsatzId: 'einsatz-1',
        einheitId: 'einheit-1',
        propagationGroupId: 'group-1',
        originalEventId: 'orig-1',
        ueberfaelligSeitMin: -1,
        zuweisungId: null,
      }),
    );
    expect(result.isFailure).toBe(true);
  });

  it('schlägt fehl bei nicht-Integer ueberfaelligSeitMin', () => {
    const result = deserializer.deserialize(
      createSerialized({
        einsatzId: 'einsatz-1',
        einheitId: 'einheit-1',
        propagationGroupId: 'group-1',
        originalEventId: 'orig-1',
        ueberfaelligSeitMin: 5.5,
        zuweisungId: null,
      }),
    );
    expect(result.isFailure).toBe(true);
  });
});

/**
 * Story 3.9 — Round-Trip-Test für `KonfliktErkanntEvent`.
 *
 * Verifiziert: Serializer → Deserializer rekonstruiert das Event verlustfrei
 * (4-Stellen-Registry-Konsistenz, AC2). Defense-Cap auf `localPayload` (4 KiB)
 * und Pflichtfeld-Validation (alle 7 + einheitId-nullable + entityType-Enum).
 */
describe('EventDeserializer — Eigenschutz KonfliktErkannt (Story 3.9)', () => {
  const deserializer = new EventDeserializer();
  const serializer = new EventSerializer();

  function createSerialized(payload: Record<string, unknown>): SerializedEvent {
    return {
      eventId: 'test-evt-id',
      eventName: 'eigenschutz.konflikt_erkannt',
      eventVersion: 1,
      occurredAt: new Date('2026-05-04T10:30:45.123Z').toISOString(),
      aggregateId: 'zuweisung-cuid2-test1',
      payload,
    };
  }

  it('roundtrip: serialize → deserialize liefert äquivalentes Event mit allen 9 Feldern', () => {
    const original = new KonfliktErkanntEvent(
      'einsatz-cuid2-1234567890123456',
      'user-cuid2-12345678901234',
      'einheit-cuid2-1234567890123456',
      'PSA_PROFIL_ZUWEISUNG',
      'zuweisung-cuid2-1234567890',
      'profil',
      { toggles: [{ profil: 'CBRN_PATIENT', aktivieren: true }], begruendung: 'CBRN-Eskalation' },
      6,
      5,
    );

    const serialized = serializer.serialize(original);
    expect(serialized.eventName).toBe('eigenschutz.konflikt_erkannt');

    const result = deserializer.deserialize(serialized);
    expect(result.isSuccess).toBe(true);

    const event = result.value as KonfliktErkanntEvent;
    expect(event).toBeInstanceOf(KonfliktErkanntEvent);
    expect(event.einsatzId).toBe(original.einsatzId);
    expect(event.userId).toBe(original.userId);
    expect(event.einheitId).toBe(original.einheitId);
    expect(event.entityType).toBe('PSA_PROFIL_ZUWEISUNG');
    expect(event.entityId).toBe(original.entityId);
    expect(event.fieldPath).toBe('profil');
    expect(event.localPayload).toEqual(original.localPayload);
    expect(event.serverVersion).toBe(6);
    expect(event.localExpectedVersion).toBe(5);
    expect(event.aggregateId).toBe(original.entityId);
  });

  it('roundtrip: einheitId === null bleibt null (Phase-2-Forward-Compat)', () => {
    const original = new KonfliktErkanntEvent(
      'einsatz-cuid2-1234567890123456',
      'user-cuid2-12345678901234',
      null,
      'GEFAEHRDUNGSBEURTEILUNG_ITEM',
      'gb-item-cuid2-1234567890',
      'risikoFaktor',
      { value: 5, prevValue: 3 },
      4,
      3,
    );

    const serialized = serializer.serialize(original);
    const result = deserializer.deserialize(serialized);
    expect(result.isSuccess).toBe(true);
    const event = result.value as KonfliktErkanntEvent;
    expect(event.einheitId).toBeUndefined();
  });

  it('roundtrip: fieldPath.length === 200 ist gültig', () => {
    const fieldPath = 'a'.repeat(200);
    const original = new KonfliktErkanntEvent(
      'einsatz-cuid2-1234567890123456',
      'user-cuid2-12345678901234',
      'einheit-cuid2-1234567890123456',
      'PSA_PROFIL_ZUWEISUNG',
      'zuweisung-cuid2-1234567890',
      fieldPath,
      { toggles: [] },
      2,
      1,
    );
    const serialized = serializer.serialize(original);
    const result = deserializer.deserialize(serialized);
    expect(result.isSuccess).toBe(true);
    expect((result.value as KonfliktErkanntEvent).fieldPath).toBe(fieldPath);
  });

  it('Serializer: localPayload mit JSON.stringify-Länge 4097 wirft', () => {
    const huge = { blob: 'X'.repeat(5000) };
    const original = new KonfliktErkanntEvent('einsatz-1', 'user-1', 'einheit-1', 'PSA_PROFIL_ZUWEISUNG', 'zuw-1', 'profil', huge, 2, 1);
    expect(() => serializer.serialize(original)).toThrow('Invalid KonfliktErkannt event payload');
  });

  it('Serializer: serverVersion === 0 wirft', () => {
    const original = new KonfliktErkanntEvent('einsatz-1', 'user-1', 'einheit-1', 'PSA_PROFIL_ZUWEISUNG', 'zuw-1', 'profil', {}, 0, 1);
    expect(() => serializer.serialize(original)).toThrow('Invalid KonfliktErkannt event payload');
  });

  it('Serializer: localPayload mit UTF-8-Multibyte-Bytes > 4096 wirft (Code-Review P4)', () => {
    // Pro Umlaut 2 Bytes — `ä`.repeat(2100) = 4200 Bytes serialisierter String,
    // aber `length` zählt 2100 Code-Units. Nur `Buffer.byteLength` deckt
    // diesen Cap-Bypass. Der serialisierte JSON ist `{"blob":"ää…"}` plus
    // ein paar Bytes Overhead.
    const utf8Heavy = { blob: 'ä'.repeat(2100) };
    const original = new KonfliktErkanntEvent('einsatz-1', 'user-1', 'einheit-1', 'PSA_PROFIL_ZUWEISUNG', 'zuw-1', 'profil', utf8Heavy, 2, 1);
    expect(() => serializer.serialize(original)).toThrow('Invalid KonfliktErkannt event payload');
  });

  it('Deserializer: entityType === "GIBT_ES_NICHT" → Failure', () => {
    const result = deserializer.deserialize(
      createSerialized({
        einsatzId: 'einsatz-1',
        userId: 'user-1',
        einheitId: 'einheit-1',
        entityType: 'GIBT_ES_NICHT',
        entityId: 'zuw-1',
        fieldPath: 'profil',
        localPayload: {},
        serverVersion: 2,
        localExpectedVersion: 1,
      }),
    );
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('eigenschutz.konflikt_erkannt');
  });

  it('Deserializer: fehlende Pflichtfelder → Failure', () => {
    const result = deserializer.deserialize(
      createSerialized({
        einsatzId: 'einsatz-1',
        userId: 'user-1',
        // einheitId fehlt → muss explizit null sein
        entityType: 'PSA_PROFIL_ZUWEISUNG',
        entityId: 'zuw-1',
        fieldPath: 'profil',
        localPayload: {},
        serverVersion: 2,
        localExpectedVersion: 1,
      }),
    );
    expect(result.isFailure).toBe(true);
  });

  it('Deserializer: localPayload === null → Failure', () => {
    const result = deserializer.deserialize(
      createSerialized({
        einsatzId: 'einsatz-1',
        userId: 'user-1',
        einheitId: null,
        entityType: 'PSA_PROFIL_ZUWEISUNG',
        entityId: 'zuw-1',
        fieldPath: 'profil',
        localPayload: null,
        serverVersion: 2,
        localExpectedVersion: 1,
      }),
    );
    expect(result.isFailure).toBe(true);
  });
});

/**
 * Story 3.10 — Round-Trip-Tests für `KonfliktAufgeloestEvent`.
 *
 * Verifiziert serialize → deserialize → äquivalentes Event über alle 3
 * Resolution-Werte und beide EntityTypes (forward-kompatibel für Phase 2).
 */
describe('EventDeserializer — Eigenschutz KonfliktAufgeloest (Story 3.10)', () => {
  const deserializer = new EventDeserializer();
  const serializer = new EventSerializer();

  function createSerialized(payload: Record<string, unknown>): SerializedEvent {
    return {
      eventId: 'test-evt-id',
      eventName: 'eigenschutz.konflikt_aufgeloest',
      eventVersion: 1,
      occurredAt: new Date('2026-05-04T12:30:45.123Z').toISOString(),
      aggregateId: 'sync-conflict-cuid2-test1',
      payload,
    };
  }

  it.each<SyncConflictResolution>(['SERVER_WINS', 'LOCAL_WINS', 'MERGED'])('roundtrip: serialize → deserialize liefert äquivalentes Event mit resolution=%s', (resolution) => {
    const resolvedAt = new Date('2026-05-04T12:30:45.123Z');
    const original = new KonfliktAufgeloestEvent(
      'einsatz-cuid2-1234567890123456',
      'user-cuid2-12345678901234',
      'einheit-cuid2-1234567890123456',
      'sync-conflict-cuid2-12345',
      'PSA_PROFIL_ZUWEISUNG',
      'zuweisung-cuid2-1234567890',
      'profil',
      resolution,
      resolvedAt,
    );

    const serialized = serializer.serialize(original);
    expect(serialized.eventName).toBe('eigenschutz.konflikt_aufgeloest');

    const result = deserializer.deserialize(serialized);
    expect(result.isSuccess).toBe(true);

    const event = result.value as KonfliktAufgeloestEvent;
    expect(event).toBeInstanceOf(KonfliktAufgeloestEvent);
    expect(event.einsatzId).toBe(original.einsatzId);
    expect(event.userId).toBe(original.userId);
    expect(event.einheitId).toBe(original.einheitId);
    expect(event.syncConflictId).toBe(original.syncConflictId);
    expect(event.entityType).toBe('PSA_PROFIL_ZUWEISUNG');
    expect(event.entityId).toBe(original.entityId);
    expect(event.fieldPath).toBe('profil');
    expect(event.resolution).toBe(resolution);
    expect(event.resolvedAt.toISOString()).toBe(resolvedAt.toISOString());
    expect(event.aggregateId).toBe(original.syncConflictId);
  });

  it('roundtrip: einheitId === null bleibt null (Phase-2-Forward-Compat für GEFAEHRDUNGSBEURTEILUNG_ITEM)', () => {
    const resolvedAt = new Date('2026-05-04T13:00:00.000Z');
    const original = new KonfliktAufgeloestEvent(
      'einsatz-cuid2-1234567890123456',
      'user-cuid2-12345678901234',
      null,
      'sync-conflict-cuid2-1234',
      'GEFAEHRDUNGSBEURTEILUNG_ITEM',
      'gb-item-cuid2-1234567890',
      'risikoFaktor',
      'SERVER_WINS',
      resolvedAt,
    );

    const serialized = serializer.serialize(original);
    const result = deserializer.deserialize(serialized);
    expect(result.isSuccess).toBe(true);
    const event = result.value as KonfliktAufgeloestEvent;
    expect(event.einheitId).toBeUndefined();
    expect(event.entityType).toBe('GEFAEHRDUNGSBEURTEILUNG_ITEM');
  });

  it('Serializer: ungültige resolution wirft', () => {
    const original = new KonfliktAufgeloestEvent(
      'einsatz-1',
      'user-1',
      'einheit-1',
      'conflict-1',
      'PSA_PROFIL_ZUWEISUNG',
      'zuw-1',
      'profil',
      'INVALID' as SyncConflictResolution,
      new Date('2026-05-04T12:00:00.000Z'),
    );
    expect(() => serializer.serialize(original)).toThrow('Invalid KonfliktAufgeloest event payload');
  });

  it('Serializer: ungültiges entityType wirft', () => {
    const original = new KonfliktAufgeloestEvent('einsatz-1', 'user-1', 'einheit-1', 'conflict-1', 'GIBT_ES_NICHT' as never, 'zuw-1', 'profil', 'SERVER_WINS', new Date('2026-05-04T12:00:00.000Z'));
    expect(() => serializer.serialize(original)).toThrow('Invalid KonfliktAufgeloest event payload');
  });

  it('Deserializer: resolvedAt als Zahl statt String → Failure', () => {
    const result = deserializer.deserialize(
      createSerialized({
        einsatzId: 'einsatz-1',
        userId: 'user-1',
        einheitId: 'einheit-1',
        syncConflictId: 'conflict-1',
        entityType: 'PSA_PROFIL_ZUWEISUNG',
        entityId: 'zuw-1',
        fieldPath: 'profil',
        resolution: 'SERVER_WINS',
        resolvedAt: 1730000000000,
      }),
    );
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('eigenschutz.konflikt_aufgeloest');
  });

  it('Deserializer: ungültiger resolution-Wert → Failure', () => {
    const result = deserializer.deserialize(
      createSerialized({
        einsatzId: 'einsatz-1',
        userId: 'user-1',
        einheitId: null,
        syncConflictId: 'conflict-1',
        entityType: 'PSA_PROFIL_ZUWEISUNG',
        entityId: 'zuw-1',
        fieldPath: 'profil',
        resolution: 'GIBT_ES_NICHT',
        resolvedAt: '2026-05-04T12:00:00.000Z',
      }),
    );
    expect(result.isFailure).toBe(true);
  });

  it('Deserializer: fehlende Pflichtfelder (syncConflictId) → Failure', () => {
    const result = deserializer.deserialize(
      createSerialized({
        einsatzId: 'einsatz-1',
        userId: 'user-1',
        einheitId: null,
        // syncConflictId fehlt
        entityType: 'PSA_PROFIL_ZUWEISUNG',
        entityId: 'zuw-1',
        fieldPath: 'profil',
        resolution: 'SERVER_WINS',
        resolvedAt: '2026-05-04T12:00:00.000Z',
      }),
    );
    expect(result.isFailure).toBe(true);
  });
});
