import { EventDeserializer } from '../event-deserializer';
import { EventSerializer, type SerializedEvent } from '../event-serializer';
import { QuittungAbgegebenEvent } from '@domain/eigenschutz/events/quittung-abgegeben.event';

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
