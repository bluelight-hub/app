import { EventDeserializer } from '../event-deserializer';
import { EventSerializer, type SerializedEvent } from '../event-serializer';
import { QuittungAbgegebenEvent } from '@domain/eigenschutz/events/quittung-abgegeben.event';
import { LueckeGemeldetEvent } from '@domain/eigenschutz/events/luecke-gemeldet.event';

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
