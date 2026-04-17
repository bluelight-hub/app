// @ts-nocheck
/**
 * Integration-Test für `GefahrenzoneEventAdapter` (Issue #627).
 *
 * Deckt den vollen Event-Flow ab: EventEmitter2 dispatched ein Domain-Event
 * → `@OnEvent`-Handler im Adapter wird ausgeführt → `publisher.broadcast`
 * wird mit korrektem Channel + Payload aufgerufen.
 *
 * Unterschied zum Unit-Spec: hier wird der Adapter per NestJS-Testmodul
 * mit echtem `EventEmitter2` und `EventEmitterModule.forRoot()` verdrahtet —
 * der Unit-Test ruft die Handler-Methoden direkt, was die Event-Emitter-
 * Verkabelung nicht verifiziert.
 */

import { Test } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { EINSATZ_EVENT_PUBLISHER, LOGGER } from '@infrastructure/di-tokens';
import { GefahrenzoneEventAdapter } from '../gefahrenzone-event.adapter';
import { GefahrenzoneErstelltEvent } from '@domain/gefahr/events/gefahrenzone-erstellt.event';
import { GefahrenzoneGeometryGeaendertEvent } from '@domain/gefahr/events/gefahrenzone-geometry-geaendert.event';
import { GefahrenzoneGeloeschtEvent } from '@domain/gefahr/events/gefahrenzone-geloescht.event';
import type { GeoJsonPolygonFeature } from '@domain/gefahr/value-objects/gefahrenzone-geometry';

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

async function flushMicrotasks(): Promise<void> {
  // @OnEvent-Handler laufen async — kurz die Microtask-Queue drehen lassen.
  await new Promise((resolve) => setImmediate(resolve));
}

describe('GefahrenzoneEventAdapter (Integration)', () => {
  let emitter: EventEmitter2;
  let publisher: { broadcast: jest.Mock };

  beforeEach(async () => {
    publisher = { broadcast: jest.fn().mockResolvedValue(undefined) };
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        GefahrenzoneEventAdapter,
        { provide: LOGGER, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } },
        { provide: EINSATZ_EVENT_PUBLISHER, useValue: publisher },
      ],
    }).compile();

    await module.init();
    emitter = module.get(EventEmitter2);
  });

  it('dispatched gefahrenzone.erstellt → publisher.broadcast("gefahrenzone:erstellt", ...)', async () => {
    const event = new GefahrenzoneErstelltEvent('zone-1', 'einsatz-1', 'ATEMGIFTE', 'MENSCHEN', 'POLYGON', samplePolygon, 'Nord', 'user-1', 'zone-1');

    emitter.emit('gefahrenzone.erstellt', event);
    await flushMicrotasks();

    expect(publisher.broadcast).toHaveBeenCalledWith('einsatz-1', 'gefahrenzone:erstellt', expect.objectContaining({ zoneId: 'zone-1', gefahrentyp: 'ATEMGIFTE', geometryType: 'POLYGON' }));
  });

  it('dispatched gefahrenzone.geometry-geaendert → publisher.broadcast("gefahrenzone:geometry-geaendert", ...)', async () => {
    const event = new GefahrenzoneGeometryGeaendertEvent('zone-2', 'einsatz-1', 'POLYGON', samplePolygon, 'user-2', 'zone-2');

    emitter.emit('gefahrenzone.geometry-geaendert', event);
    await flushMicrotasks();

    expect(publisher.broadcast).toHaveBeenCalledWith('einsatz-1', 'gefahrenzone:geometry-geaendert', expect.objectContaining({ zoneId: 'zone-2', aktualisiertVon: 'user-2' }));
  });

  it('dispatched gefahrenzone.geloescht → publisher.broadcast("gefahrenzone:geloescht", ...)', async () => {
    const event = new GefahrenzoneGeloeschtEvent('zone-3', 'einsatz-1', 'user-3', 'zone-3');

    emitter.emit('gefahrenzone.geloescht', event);
    await flushMicrotasks();

    expect(publisher.broadcast).toHaveBeenCalledWith('einsatz-1', 'gefahrenzone:geloescht', expect.objectContaining({ zoneId: 'zone-3', geloeschtVon: 'user-3' }));
  });
});
