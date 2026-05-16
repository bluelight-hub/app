// @ts-nocheck
import { Result } from '@domain/common/result';
import { QuittungAbgegebenEvent } from '@domain/eigenschutz/events/quittung-abgegeben.event';
import type { AddEintragHandler } from '@application/etb/commands';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { QuittungAbgegebenEtbHandler } from '../quittung-abgegeben-etb.handler';

function buildEinheitRepo(name = 'Rotkreuz 71/1'): jest.Mocked<IEinsatzEinheitRepository> {
  return {
    findById: jest.fn().mockResolvedValue(Result.ok({ name } as any)),
  } as unknown as jest.Mocked<IEinsatzEinheitRepository>;
}

function buildEvent(
  overrides: {
    einsatzId?: string;
    userId?: string;
    einheitId?: string;
    propagationGroupId?: string;
    quittiertAm?: Date;
  } = {},
) {
  return new QuittungAbgegebenEvent(
    overrides.einsatzId ?? 'einsatz-1',
    overrides.userId ?? 'user-1',
    overrides.einheitId ?? 'einheit-7',
    overrides.propagationGroupId ?? 'pg-1',
    overrides.quittiertAm ?? new Date('2026-05-14T10:00:00Z'),
  );
}

describe('QuittungAbgegebenEtbHandler', () => {
  let handler: QuittungAbgegebenEtbHandler;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockLogger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };

  let mockEinheitRepo: jest.Mocked<IEinsatzEinheitRepository>;

  beforeEach(() => {
    mockAddEintragHandler = { execute: jest.fn() } as unknown as jest.Mocked<AddEintragHandler>;
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    mockEinheitRepo = buildEinheitRepo('Rotkreuz 71/1');
    handler = new QuittungAbgegebenEtbHandler(mockAddEintragHandler, mockLogger, mockEinheitRepo);
  });

  it('erstellt ETB-Eintrag mit Einheit-Name im Text', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ einheitId: 'einheit-7' }));
    expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('PSA-Quittung abgegeben durch Einheit Rotkreuz 71/1');
    expect(cmd.kategorie).toBe('DOKUMENTATION');
    expect(cmd.userId).toBe('user-1');
    expect(cmd.einsatzId).toBe('einsatz-1');
    expect(cmd.metadata).toMatchObject({
      eventType: 'QuittungAbgegeben',
      propagationGroupId: 'pg-1',
      einheitId: 'einheit-7',
      quittiertAm: '2026-05-14T10:00:00.000Z',
    });
  });

  it('schluckt Fehler vom AddEintragHandler (Fire-and-Forget)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.fail('DB Error'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to add ETB entry'), 'QuittungAbgegebenEtbHandler');
  });

  it('schluckt unerwartete Exceptions', async () => {
    mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'), 'QuittungAbgegebenEtbHandler');
  });
});
