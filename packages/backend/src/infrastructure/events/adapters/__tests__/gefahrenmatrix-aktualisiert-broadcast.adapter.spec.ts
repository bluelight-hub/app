// @ts-nocheck
/**
 * Unit-Tests für den GefahrenmatrixAktualisiertBroadcastAdapter (Issue #627 G4).
 *
 * Der Adapter empfängt `GefahrenmatrixAktualisiertEvent` und ruft
 * `publisher.broadcast('gefahrenmatrix:aktualisiert', ...)` auf. Fehlt der
 * Publisher, loggt er nur; Publisher-Fehler werden gefangen.
 */

import { GefahrenmatrixAktualisiertBroadcastAdapter } from '../gefahrenmatrix-aktualisiert-broadcast.adapter';
import { GefahrenmatrixAktualisiertEvent } from '@domain/gefahr/events/gefahrenmatrix-aktualisiert.event';

const noopLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

describe('GefahrenmatrixAktualisiertBroadcastAdapter', () => {
  let publisher: { broadcast: jest.Mock };
  let adapter: GefahrenmatrixAktualisiertBroadcastAdapter;

  beforeEach(() => {
    publisher = { broadcast: jest.fn().mockResolvedValue(undefined) };
    adapter = new GefahrenmatrixAktualisiertBroadcastAdapter(noopLogger, publisher);
  });

  it('aktualisiert → broadcast "gefahrenmatrix:aktualisiert" mit vollem Payload', async () => {
    const event = new GefahrenmatrixAktualisiertEvent('einsatz-1', 'ATEMGIFTE', 'MENSCHEN', 'AKUT', 'user-1', 'bewertung-1');
    await adapter.onAktualisiert(event);
    expect(publisher.broadcast).toHaveBeenCalledWith(
      'einsatz-1',
      'gefahrenmatrix:aktualisiert',
      expect.objectContaining({
        einsatzId: 'einsatz-1',
        gefahrentyp: 'ATEMGIFTE',
        schutzobjekt: 'MENSCHEN',
        warnstufe: 'AKUT',
        aktualisiertVon: 'user-1',
      }),
    );
  });

  it('aktualisiert → broadcastet auch bei warnstufe=KEINE (Entfernungs-Signal)', async () => {
    const event = new GefahrenmatrixAktualisiertEvent('einsatz-2', 'BRAND', 'SACHWERTE', 'KEINE', 'user-2');
    await adapter.onAktualisiert(event);
    expect(publisher.broadcast).toHaveBeenCalledWith('einsatz-2', 'gefahrenmatrix:aktualisiert', expect.objectContaining({ warnstufe: 'KEINE', gefahrentyp: 'BRAND' }));
  });

  it('loggt nur, wenn kein Publisher injiziert ist', async () => {
    const loggerMock = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const offline = new GefahrenmatrixAktualisiertBroadcastAdapter(loggerMock);
    await offline.onAktualisiert(new GefahrenmatrixAktualisiertEvent('einsatz-x', 'EXPLOSION', 'MENSCHEN', 'HOCH', 'user-x'));
    expect(loggerMock.log).toHaveBeenCalled();
  });

  it('fängt Publisher-Fehler mit Logger.error', async () => {
    publisher.broadcast.mockRejectedValueOnce(new Error('boom'));
    const loggerMock = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const faulty = new GefahrenmatrixAktualisiertBroadcastAdapter(loggerMock, publisher);
    await faulty.onAktualisiert(new GefahrenmatrixAktualisiertEvent('einsatz-x', 'EXPLOSION', 'MENSCHEN', 'HOCH', 'user-x'));
    expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('boom'), 'GefahrenmatrixAktualisiertBroadcastAdapter');
  });
});
