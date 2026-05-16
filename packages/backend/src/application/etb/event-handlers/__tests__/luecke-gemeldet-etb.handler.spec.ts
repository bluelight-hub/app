// @ts-nocheck
import { Result } from '@domain/common/result';
import { LueckeGemeldetEvent } from '@domain/eigenschutz/events/luecke-gemeldet.event';
import type { AddEintragHandler } from '@application/etb/commands';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { LueckeGemeldetEtbHandler } from '../luecke-gemeldet-etb.handler';

function buildEinheitRepo(name = 'Sanitätstrupp 12'): jest.Mocked<IEinsatzEinheitRepository> {
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
    meldung?: string;
    gemeldetAm?: Date;
  } = {},
) {
  return new LueckeGemeldetEvent(
    overrides.einsatzId ?? 'einsatz-1',
    overrides.userId ?? 'user-1',
    overrides.einheitId ?? 'einheit-7',
    overrides.propagationGroupId ?? 'pg-1',
    overrides.meldung ?? 'Helme fehlen',
    overrides.gemeldetAm ?? new Date('2026-05-14T10:00:00Z'),
  );
}

describe('LueckeGemeldetEtbHandler', () => {
  let handler: LueckeGemeldetEtbHandler;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockLogger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };
  let mockEinheitRepo: jest.Mocked<IEinsatzEinheitRepository>;

  beforeEach(() => {
    mockAddEintragHandler = { execute: jest.fn() } as unknown as jest.Mocked<AddEintragHandler>;
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    mockEinheitRepo = buildEinheitRepo('Sanitätstrupp 12');
    handler = new LueckeGemeldetEtbHandler(mockAddEintragHandler, mockLogger, mockEinheitRepo);
  });

  it('erstellt ETB-Eintrag mit Einheit-Name und Meldung', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ meldung: 'Helme fehlen' }));
    expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('PSA-Lücke gemeldet von Einheit Sanitätstrupp 12: Helme fehlen');
    expect(cmd.kategorie).toBe('MATERIAL');
    expect(cmd.userId).toBe('user-1');
    expect(cmd.einsatzId).toBe('einsatz-1');
    expect(cmd.metadata).toMatchObject({
      eventType: 'LueckeGemeldet',
      einheitId: 'einheit-7',
      propagationGroupId: 'pg-1',
      gemeldetAm: '2026-05-14T10:00:00.000Z',
    });
  });

  it('truncated Meldung > 200 Zeichen mit Ellipsis', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    const long = 'B'.repeat(250);
    await handler.handle(buildEvent({ meldung: long }));
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text.endsWith('...')).toBe(true);
    const meldungPart = cmd.text.split(': ').slice(1).join(': ');
    expect(meldungPart.length).toBe(200);
  });

  it('schluckt Fehler vom AddEintragHandler (Fire-and-Forget)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.fail('DB Error'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to add ETB entry'), 'LueckeGemeldetEtbHandler');
  });

  it('schluckt unerwartete Exceptions', async () => {
    mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'), 'LueckeGemeldetEtbHandler');
  });
});
