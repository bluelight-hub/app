// @ts-nocheck
/**
 * Unit-Tests für das EinsatzEventsGateway (Issue #407, Task 18).
 *
 * Testfälle:
 * - join:einsatz mit Zugehörigkeit → joint Room
 * - join:einsatz ohne Zugehörigkeit → emittiert FORBIDDEN-Error, kein Room-Join
 * - join:einsatz mit Repository-Fehler → emittiert ACCESS_CHECK_FAILED-Error
 * - leave:einsatz → leave Room
 * - broadcastToEinsatz → emittiert Event mit korrektem Room-Schlüssel
 */

import { EinsatzEventsGateway } from '../einsatz-events.gateway';

const loggerMock = () => ({ log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() });
const teilnehmerRepoMock = () => ({
  findByEinsatzAndUser: jest.fn(),
  existsEinsatzPerson: jest.fn(),
  findActiveByEinsatz: jest.fn(),
  isPersonAlreadyLinked: jest.fn(),
  create: jest.fn(),
  updateEinsatzPerson: jest.fn(),
  leave: jest.fn(),
});

describe('EinsatzEventsGateway', () => {
  const einsatzId = 'clh1ykg0k0000qwer1234abcd';
  const userId = 'usr1ykg0k0000qwer1234abcd';

  const makeClient = () => ({
    id: 'sock-1',
    data: { userId },
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
  });

  it('handleConnection loggt mit userId', () => {
    const logger = loggerMock();
    const gw = new EinsatzEventsGateway(logger, teilnehmerRepoMock());
    const client = makeClient();
    gw.handleConnection(client);
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Client connected'), 'EinsatzEventsGateway');
  });

  it('join:einsatz joint Room bei aktiver Teilnahme', async () => {
    const logger = loggerMock();
    const repo = teilnehmerRepoMock();
    repo.findByEinsatzAndUser.mockResolvedValue({ id: 't1', einsatzId, userId });
    const gw = new EinsatzEventsGateway(logger, repo);
    const client = makeClient();

    await gw.handleJoinEinsatz({ einsatzId }, client);

    expect(repo.findByEinsatzAndUser).toHaveBeenCalledWith(einsatzId, userId);
    expect(client.join).toHaveBeenCalledWith(`einsatz:${einsatzId}`);
    expect(client.emit).not.toHaveBeenCalled();
  });

  it('join:einsatz ohne Teilnahme → FORBIDDEN-Error', async () => {
    const logger = loggerMock();
    const repo = teilnehmerRepoMock();
    repo.findByEinsatzAndUser.mockResolvedValue(null);
    const gw = new EinsatzEventsGateway(logger, repo);
    const client = makeClient();

    await gw.handleJoinEinsatz({ einsatzId }, client);

    expect(client.join).not.toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith('join:einsatz:error', expect.objectContaining({ code: 'EINSATZ_WS_JOIN_FORBIDDEN', einsatzId }));
    expect(logger.warn).toHaveBeenCalled();
  });

  it('join:einsatz bei Repository-Fehler → ACCESS_CHECK_FAILED', async () => {
    const logger = loggerMock();
    const repo = teilnehmerRepoMock();
    repo.findByEinsatzAndUser.mockRejectedValue(new Error('db down'));
    const gw = new EinsatzEventsGateway(logger, repo);
    const client = makeClient();

    await gw.handleJoinEinsatz({ einsatzId }, client);

    expect(client.join).not.toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith('join:einsatz:error', expect.objectContaining({ code: 'EINSATZ_WS_JOIN_ACCESS_CHECK_FAILED', einsatzId }));
    expect(logger.error).toHaveBeenCalled();
  });

  it('leave:einsatz verlässt Room', () => {
    const gw = new EinsatzEventsGateway(loggerMock(), teilnehmerRepoMock());
    const client = makeClient();

    gw.handleLeaveEinsatz({ einsatzId }, client);

    expect(client.leave).toHaveBeenCalledWith(`einsatz:${einsatzId}`);
  });

  it('broadcastToEinsatz emittiert Event in Einsatz-Room', () => {
    const gw = new EinsatzEventsGateway(loggerMock(), teilnehmerRepoMock());
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    gw.server = { to } as never;

    gw.broadcastToEinsatz(einsatzId, 'funkkanal:erstellt', { kanalId: 'k1' });

    expect(to).toHaveBeenCalledWith(`einsatz:${einsatzId}`);
    expect(emit).toHaveBeenCalledWith('funkkanal:erstellt', { kanalId: 'k1' });
  });
});
