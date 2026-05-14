// @ts-nocheck
import { Result } from '@domain/common/result';
import { VorfallGemeldetEvent } from '@domain/eigenschutz/events/vorfall-gemeldet.event';
import type { AddEintragHandler } from '@application/etb/commands';
import { VorfallGemeldetEtbHandler } from '../vorfall-gemeldet-etb.handler';

function buildEvent(
  overrides: {
    einsatzId?: string;
    userId?: string;
    einheitId?: string;
    vorfallId?: string;
    vorfallZeit?: Date;
    unfallkasseRelevant?: boolean;
  } = {},
) {
  return new VorfallGemeldetEvent(
    overrides.einsatzId ?? 'einsatz-1',
    overrides.userId ?? 'user-1',
    overrides.einheitId ?? 'einheit-1',
    overrides.vorfallId ?? 'vorfall-1',
    overrides.vorfallZeit ?? new Date('2026-01-15T10:30:00.000Z'),
    overrides.unfallkasseRelevant ?? false,
  );
}

describe('VorfallGemeldetEtbHandler', () => {
  let handler: VorfallGemeldetEtbHandler;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockLogger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };

  beforeEach(() => {
    mockAddEintragHandler = { execute: jest.fn() } as unknown as jest.Mocked<AddEintragHandler>;
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    handler = new VorfallGemeldetEtbHandler(mockAddEintragHandler, mockLogger);
  });

  it('erstellt ETB-Eintrag mit Einheit und Vorfall-Zeitpunkt (ohne Unfallkasse-Hinweis)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    const vorfallZeit = new Date('2026-01-15T10:30:00.000Z');
    await handler.handle(buildEvent({ vorfallZeit, unfallkasseRelevant: false }));
    expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe(`Vorfall gemeldet von Einheit einheit-1 — Zeitpunkt: ${vorfallZeit.toISOString()}`);
    expect(cmd.kategorie).toBe('SONSTIGES');
    expect(cmd.userId).toBe('user-1');
    expect(cmd.einsatzId).toBe('einsatz-1');
    expect(cmd.metadata).toMatchObject({
      eventType: 'VorfallGemeldet',
      vorfallId: 'vorfall-1',
      einheitId: 'einheit-1',
      vorfallZeit: vorfallZeit.toISOString(),
      unfallkasseRelevant: false,
    });
  });

  it('hängt " (unfallkasse-relevant)" als Suffix an, wenn unfallkasseRelevant=true', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    const vorfallZeit = new Date('2026-02-01T08:00:00.000Z');
    await handler.handle(buildEvent({ vorfallZeit, unfallkasseRelevant: true }));
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe(`Vorfall gemeldet von Einheit einheit-1 (unfallkasse-relevant) — Zeitpunkt: ${vorfallZeit.toISOString()}`);
    expect(cmd.metadata).toMatchObject({ unfallkasseRelevant: true });
  });

  it('schluckt Fehler vom AddEintragHandler (Fire-and-Forget)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.fail('DB Error'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to add ETB entry'), 'VorfallGemeldetEtbHandler');
  });

  it('schluckt unerwartete Exceptions', async () => {
    mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'), 'VorfallGemeldetEtbHandler');
  });
});
