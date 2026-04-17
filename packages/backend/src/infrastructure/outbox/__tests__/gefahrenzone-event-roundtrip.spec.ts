import type { DomainEvent } from '@domain/common/domain-event';

import { EventSerializer } from '../event-serializer';
import { EventDeserializer } from '../event-deserializer';

import { GefahrenzoneErstelltEvent } from '@domain/gefahr/events/gefahrenzone-erstellt.event';
import { GefahrenzoneGeometryGeaendertEvent } from '@domain/gefahr/events/gefahrenzone-geometry-geaendert.event';
import { GefahrenzoneGeloeschtEvent } from '@domain/gefahr/events/gefahrenzone-geloescht.event';
import type { GeoJsonPolygonFeature } from '@domain/gefahr/value-objects/gefahrenzone-geometry';

const noopLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

const samplePolygon: GeoJsonPolygonFeature = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [10, 50],
        [10.1, 50],
        [10.1, 50.1],
        [10, 50.1],
        [10, 50],
      ],
    ],
  },
  properties: null,
};

describe('Gefahrenzone Events Round-Trip', () => {
  let serializer: EventSerializer;
  let deserializer: EventDeserializer;

  beforeEach(() => {
    serializer = new EventSerializer();
    deserializer = new EventDeserializer(noopLogger);
  });

  function roundtrip<T extends DomainEvent>(event: T): T {
    const s = serializer.serialize(event);
    const json = JSON.parse(JSON.stringify(s));
    const r = deserializer.deserialize(json);
    expect(r.isSuccess).toBe(true);
    return r.value as T;
  }

  it('serialisiert und rekonstruiert GefahrenzoneErstelltEvent verlustfrei', () => {
    const original = new GefahrenzoneErstelltEvent('zone-1', 'einsatz-1', 'ATEMGIFTE', 'MENSCHEN', 'POLYGON', samplePolygon, 'Nord-Sektor', 'user-1', 'zone-1');
    const restored = roundtrip(original);
    expect(restored).toBeInstanceOf(GefahrenzoneErstelltEvent);
    expect(restored.zoneId).toBe(original.zoneId);
    expect(restored.einsatzId).toBe(original.einsatzId);
    expect(restored.gefahrentyp).toBe(original.gefahrentyp);
    expect(restored.schutzobjekt).toBe(original.schutzobjekt);
    expect(restored.geometryType).toBe(original.geometryType);
    expect(restored.geometry).toEqual(samplePolygon);
    expect(restored.bezeichnung).toBe(original.bezeichnung);
    expect(restored.erstelltVon).toBe(original.erstelltVon);
    expect(restored.aggregateId).toBe(original.aggregateId);
  });

  it('rekonstruiert GefahrenzoneErstelltEvent mit bezeichnung=null', () => {
    const original = new GefahrenzoneErstelltEvent('zone-2', 'einsatz-1', 'BRAND', 'SACHWERTE', 'CIRCLE', samplePolygon, null, 'user-2', 'zone-2');
    const restored = roundtrip(original);
    expect(restored.bezeichnung).toBeNull();
    expect(restored.geometryType).toBe('CIRCLE');
  });

  it('serialisiert und rekonstruiert GefahrenzoneGeometryGeaendertEvent verlustfrei', () => {
    const original = new GefahrenzoneGeometryGeaendertEvent('zone-3', 'einsatz-1', 'POLYGON', samplePolygon, 'user-3', 'zone-3');
    const restored = roundtrip(original);
    expect(restored).toBeInstanceOf(GefahrenzoneGeometryGeaendertEvent);
    expect(restored.zoneId).toBe(original.zoneId);
    expect(restored.geometry).toEqual(samplePolygon);
    expect(restored.aktualisiertVon).toBe(original.aktualisiertVon);
  });

  it('serialisiert und rekonstruiert GefahrenzoneGeloeschtEvent verlustfrei', () => {
    const original = new GefahrenzoneGeloeschtEvent('zone-4', 'einsatz-1', 'user-4', 'zone-4');
    const restored = roundtrip(original);
    expect(restored).toBeInstanceOf(GefahrenzoneGeloeschtEvent);
    expect(restored.zoneId).toBe(original.zoneId);
    expect(restored.einsatzId).toBe(original.einsatzId);
    expect(restored.geloeschtVon).toBe(original.geloeschtVon);
  });
});
