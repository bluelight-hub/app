// @ts-nocheck
/**
 * Unit-Tests für den GefahrenzoneEventAdapter (Issue #627).
 *
 * Der Adapter empfängt Gefahrenzone-Domain-Events und ruft `publisher.broadcast(...)`
 * mit dem passenden Channel-Namen (`gefahrenzone:*`) und Payload auf. Fehlt der
 * Publisher, loggt der Adapter nur — kein Crash.
 */

import { GefahrenzoneEventAdapter } from '../gefahrenzone-event.adapter';
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

describe('GefahrenzoneEventAdapter', () => {
  let publisher: { broadcast: jest.Mock };
  let adapter: GefahrenzoneEventAdapter;

  beforeEach(() => {
    publisher = { broadcast: jest.fn().mockResolvedValue(undefined) };
    adapter = new GefahrenzoneEventAdapter(noopLogger, publisher);
  });

  it('erstellt → broadcast "gefahrenzone:erstellt"', async () => {
    const event = new GefahrenzoneErstelltEvent('zone-1', 'einsatz-1', 'ATEMGIFTE', 'MENSCHEN', 'POLYGON', samplePolygon, 'Nord-Sektor', 'user-1', 'zone-1');
    await adapter.onErstellt(event);
    expect(publisher.broadcast).toHaveBeenCalledWith(
      'einsatz-1',
      'gefahrenzone:erstellt',
      expect.objectContaining({
        zoneId: 'zone-1',
        einsatzId: 'einsatz-1',
        gefahrentyp: 'ATEMGIFTE',
        schutzobjekt: 'MENSCHEN',
        geometryType: 'POLYGON',
        geometry: samplePolygon,
        bezeichnung: 'Nord-Sektor',
        erstelltVon: 'user-1',
      }),
    );
  });

  it('erstellt → bezeichnung=null wird durchgereicht', async () => {
    const event = new GefahrenzoneErstelltEvent('zone-2', 'einsatz-1', 'BRAND', 'SACHWERTE', 'CIRCLE', samplePolygon, null, 'user-2', 'zone-2');
    await adapter.onErstellt(event);
    expect(publisher.broadcast).toHaveBeenCalledWith('einsatz-1', 'gefahrenzone:erstellt', expect.objectContaining({ bezeichnung: null, geometryType: 'CIRCLE' }));
  });

  it('geometry geaendert → broadcast "gefahrenzone:geometry-geaendert"', async () => {
    const event = new GefahrenzoneGeometryGeaendertEvent('zone-3', 'einsatz-1', 'POLYGON', samplePolygon, 'user-3', 'zone-3');
    await adapter.onGeometryGeaendert(event);
    expect(publisher.broadcast).toHaveBeenCalledWith(
      'einsatz-1',
      'gefahrenzone:geometry-geaendert',
      expect.objectContaining({
        zoneId: 'zone-3',
        einsatzId: 'einsatz-1',
        geometryType: 'POLYGON',
        geometry: samplePolygon,
        aktualisiertVon: 'user-3',
      }),
    );
  });

  it('geloescht → broadcast "gefahrenzone:geloescht"', async () => {
    const event = new GefahrenzoneGeloeschtEvent('zone-4', 'einsatz-1', 'user-4', 'zone-4');
    await adapter.onGeloescht(event);
    expect(publisher.broadcast).toHaveBeenCalledWith(
      'einsatz-1',
      'gefahrenzone:geloescht',
      expect.objectContaining({
        zoneId: 'zone-4',
        einsatzId: 'einsatz-1',
        geloeschtVon: 'user-4',
      }),
    );
  });

  it('loggt nur, wenn kein Publisher injiziert ist', async () => {
    const loggerMock = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const offline = new GefahrenzoneEventAdapter(loggerMock);
    await offline.onGeloescht(new GefahrenzoneGeloeschtEvent('zone-x', 'einsatz-x', 'user-x', 'zone-x'));
    expect(loggerMock.log).toHaveBeenCalled();
  });

  it('fängt Publisher-Fehler mit Logger.error', async () => {
    publisher.broadcast.mockRejectedValueOnce(new Error('boom'));
    const loggerMock = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const faultyAdapter = new GefahrenzoneEventAdapter(loggerMock, publisher);
    await faultyAdapter.onGeloescht(new GefahrenzoneGeloeschtEvent('zone-x', 'einsatz-x', 'user-x', 'zone-x'));
    expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('boom'), 'GefahrenzoneEventAdapter');
  });
});
