// @ts-nocheck
import { Result } from '@domain/common/result';
import { SicherheitsregelQuittiertEvent } from '@domain/eigenschutz/events/sicherheitsregel-quittiert.event';
import type { AddEintragHandler } from '@application/etb/commands';
import { SicherheitsregelQuittiertEtbHandler } from '../sicherheitsregel-quittiert-etb.handler';

function buildEvent(
  overrides: {
    einsatzId?: string;
    userId?: string;
    einheitId?: string;
    regelId?: string;
    propagationGroupId?: string | null;
    quittiertAm?: Date;
  } = {},
) {
  const propagationGroupId = 'propagationGroupId' in overrides ? (overrides.propagationGroupId as string | null) : 'pg-1';
  return new SicherheitsregelQuittiertEvent(
    overrides.einsatzId ?? 'einsatz-1',
    overrides.userId ?? 'user-1',
    overrides.einheitId ?? 'einheit-7',
    overrides.regelId ?? 'regel-1',
    propagationGroupId,
    overrides.quittiertAm ?? new Date('2026-05-14T10:00:00Z'),
  );
}

describe('SicherheitsregelQuittiertEtbHandler', () => {
  let handler: SicherheitsregelQuittiertEtbHandler;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockLogger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };

  beforeEach(() => {
    mockAddEintragHandler = { execute: jest.fn() } as unknown as jest.Mocked<AddEintragHandler>;
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    handler = new SicherheitsregelQuittiertEtbHandler(mockAddEintragHandler, mockLogger);
  });

  it('erstellt ETB-Eintrag mit Einheit-Referenz im Text', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ einheitId: 'einheit-7' }));
    expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('Sicherheitsregel quittiert durch Einheit einheit-7');
    expect(cmd.kategorie).toBe('DOKUMENTATION');
    expect(cmd.userId).toBe('user-1');
    expect(cmd.einsatzId).toBe('einsatz-1');
    expect(cmd.metadata).toMatchObject({
      eventType: 'SicherheitsregelQuittiert',
      regelId: 'regel-1',
      einheitId: 'einheit-7',
      propagationGroupId: 'pg-1',
      quittiertAm: '2026-05-14T10:00:00.000Z',
    });
  });

  it('verkraftet null-propagationGroupId (Outbox-Retention abgelaufen)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ propagationGroupId: null }));
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.metadata).toMatchObject({
      eventType: 'SicherheitsregelQuittiert',
      propagationGroupId: null,
    });
  });

  it('schluckt Fehler vom AddEintragHandler (Fire-and-Forget)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.fail('DB Error'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to add ETB entry'), 'SicherheitsregelQuittiertEtbHandler');
  });

  it('schluckt unerwartete Exceptions', async () => {
    mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'), 'SicherheitsregelQuittiertEtbHandler');
  });
});
