// @ts-nocheck
import { Result } from '@domain/common/result';
import { QuittungUeberfaelligEvent } from '@domain/eigenschutz/events/quittung-ueberfaellig.event';
import type { AddEintragHandler } from '@application/etb/commands';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { QuittungUeberfaelligEtbHandler } from '../quittung-ueberfaellig-etb.handler';

function buildEinheitRepo(name = 'Rotkreuz 71/2'): jest.Mocked<IEinsatzEinheitRepository> {
  return {
    findById: jest.fn().mockResolvedValue(Result.ok({ name } as any)),
  } as unknown as jest.Mocked<IEinsatzEinheitRepository>;
}

function buildEvent(
  overrides: {
    einsatzId?: string;
    einheitId?: string;
    propagationGroupId?: string;
    originalEventId?: string;
    ueberfaelligSeitMin?: number;
    zuweisungId?: string | null;
  } = {},
) {
  const zuweisungId = 'zuweisungId' in overrides ? (overrides.zuweisungId as string | null) : 'zuw-1';
  return new QuittungUeberfaelligEvent(
    overrides.einsatzId ?? 'einsatz-1',
    overrides.einheitId ?? 'einheit-7',
    overrides.propagationGroupId ?? 'pg-1',
    overrides.originalEventId ?? 'orig-event-1',
    overrides.ueberfaelligSeitMin ?? 7,
    zuweisungId,
  );
}

describe('QuittungUeberfaelligEtbHandler', () => {
  let handler: QuittungUeberfaelligEtbHandler;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockLogger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };

  let mockEinheitRepo: jest.Mocked<IEinsatzEinheitRepository>;

  beforeEach(() => {
    mockAddEintragHandler = { execute: jest.fn() } as unknown as jest.Mocked<AddEintragHandler>;
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    mockEinheitRepo = buildEinheitRepo('Rotkreuz 71/2');
    handler = new QuittungUeberfaelligEtbHandler(mockAddEintragHandler, mockLogger, mockEinheitRepo);
  });

  it('erstellt ETB-Eintrag mit Überfälligkeits-Dauer und Einheit-Name', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ ueberfaelligSeitMin: 7, einheitId: 'einheit-7' }));
    expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('PSA-Quittung überfällig (7 min) — Einheit Rotkreuz 71/2');
    expect(cmd.kategorie).toBe('SYSTEM');
    expect(cmd.userId).toBe('SYSTEM');
    expect(cmd.einsatzId).toBe('einsatz-1');
    expect(cmd.metadata).toMatchObject({
      eventType: 'QuittungUeberfaellig',
      einheitId: 'einheit-7',
      propagationGroupId: 'pg-1',
      originalEventId: 'orig-event-1',
      ueberfaelligSeitMin: 7,
      zuweisungId: 'zuw-1',
    });
  });

  it('verkraftet null-zuweisungId', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ zuweisungId: null }));
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.metadata).toMatchObject({
      eventType: 'QuittungUeberfaellig',
      zuweisungId: null,
    });
  });

  it('schluckt Fehler vom AddEintragHandler (Fire-and-Forget)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.fail('DB Error'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to add ETB entry'), 'QuittungUeberfaelligEtbHandler');
  });

  it('schluckt unerwartete Exceptions', async () => {
    mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'), 'QuittungUeberfaelligEtbHandler');
  });
});
