// @ts-nocheck
/**
 * Integration-Test für `GefahrenmatrixAktualisiertBroadcastAdapter` (Issue #627 G4).
 *
 * Verifiziert die `@OnEvent`-Verkabelung: EventEmitter2 → Adapter → Publisher.
 * Der Unit-Test ruft die Handler-Methode direkt; dieser Test stellt sicher,
 * dass der NestJS-Decorator auch wirklich auf den Event-Namen registriert ist.
 */

import { Test } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { EINSATZ_EVENT_PUBLISHER, LOGGER } from '@infrastructure/di-tokens';
import { GefahrenmatrixAktualisiertBroadcastAdapter } from '../gefahrenmatrix-aktualisiert-broadcast.adapter';
import { GefahrenmatrixAktualisiertEvent } from '@domain/gefahr/events/gefahrenmatrix-aktualisiert.event';

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('GefahrenmatrixAktualisiertBroadcastAdapter (Integration)', () => {
  let emitter: EventEmitter2;
  let publisher: { broadcast: jest.Mock };

  beforeEach(async () => {
    publisher = { broadcast: jest.fn().mockResolvedValue(undefined) };
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        GefahrenmatrixAktualisiertBroadcastAdapter,
        { provide: LOGGER, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } },
        { provide: EINSATZ_EVENT_PUBLISHER, useValue: publisher },
      ],
    }).compile();

    await module.init();
    emitter = module.get(EventEmitter2);
  });

  it('dispatched gefahrenmatrix.aktualisiert → publisher.broadcast("gefahrenmatrix:aktualisiert", ...)', async () => {
    const event = new GefahrenmatrixAktualisiertEvent('einsatz-1', 'ATEMGIFTE', 'MENSCHEN', 'AKUT', 'user-1');

    emitter.emit('gefahrenmatrix.aktualisiert', event);
    await flushMicrotasks();

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
});
