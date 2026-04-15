// @ts-nocheck
/**
 * Unit-Tests für EinsatzEventPublisher (Issue #407, Task 18).
 *
 * Testfälle:
 * - broadcast → delegiert an Gateway.broadcastToEinsatz
 * - broadcastByEtb mit gefundenem ETB → resolvt einsatzId und broadcastet
 * - broadcastByEtb ohne ETB → loggt Warnung, kein Broadcast
 * - broadcastByEtb mit ungültiger EtbId → loggt Warnung, kein Broadcast
 */

import { EinsatzEventPublisher } from '../einsatz-event.publisher';
import { EtbId } from '@domain/value-objects/etb-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';

const loggerMock = () => ({ log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() });

describe('EinsatzEventPublisher', () => {
  it('broadcast delegiert an Gateway', async () => {
    const gateway = { broadcastToEinsatz: jest.fn() } as never;
    const publisher = new EinsatzEventPublisher(gateway, loggerMock(), { findById: jest.fn() } as never);

    await publisher.broadcast('einsatz-1', 'funkkanal:erstellt', { foo: 'bar' });

    expect(gateway.broadcastToEinsatz).toHaveBeenCalledWith('einsatz-1', 'funkkanal:erstellt', { foo: 'bar' });
  });

  it('broadcastByEtb resolvt einsatzId via Repository', async () => {
    const etbId = EtbId.create().value as EtbId;
    const einsatzId = EinsatzId.create().value as EinsatzId;
    const etbAggregate = { einsatzId };
    const etbRepo = { findById: jest.fn().mockResolvedValue(etbAggregate) };
    const gateway = { broadcastToEinsatz: jest.fn() } as never;

    const publisher = new EinsatzEventPublisher(gateway, loggerMock(), etbRepo as never);

    await publisher.broadcastByEtb(etbId.value, 'etb:eintrag-erstellt', { eintragId: 'e1' });

    expect(etbRepo.findById).toHaveBeenCalledWith(expect.objectContaining({ value: etbId.value }));
    expect(gateway.broadcastToEinsatz).toHaveBeenCalledWith(einsatzId.value, 'etb:eintrag-erstellt', { eintragId: 'e1' });
  });

  it('broadcastByEtb verwirft Event ohne ETB-Treffer', async () => {
    const etbId = EtbId.create().value as EtbId;
    const logger = loggerMock();
    const etbRepo = { findById: jest.fn().mockResolvedValue(null) };
    const gateway = { broadcastToEinsatz: jest.fn() } as never;

    const publisher = new EinsatzEventPublisher(gateway, logger, etbRepo as never);

    await publisher.broadcastByEtb(etbId.value, 'etb:eintrag-erstellt', {});

    expect(gateway.broadcastToEinsatz).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('broadcastByEtb verwirft Event bei ungültiger EtbId', async () => {
    const logger = loggerMock();
    const etbRepo = { findById: jest.fn() };
    const gateway = { broadcastToEinsatz: jest.fn() } as never;

    const publisher = new EinsatzEventPublisher(gateway, logger, etbRepo as never);

    await publisher.broadcastByEtb('invalid-id', 'etb:eintrag-erstellt', {});

    expect(etbRepo.findById).not.toHaveBeenCalled();
    expect(gateway.broadcastToEinsatz).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });
});
