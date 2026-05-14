// @ts-nocheck
import { Result } from '@domain/common/result';
import { SicherungspostenAktualisiertEvent } from '@domain/eigenschutz/events/sicherungsposten-aktualisiert.event';
import type { AddEintragHandler } from '@application/etb/commands';
import { SicherungspostenAktualisiertEtbHandler } from '../sicherungsposten-aktualisiert-etb.handler';

function buildEvent(
  overrides: {
    einsatzId?: string;
    userId?: string;
    einheitId?: string;
    sicherungspostenId?: string;
    fromVersion?: number;
    toVersion?: number;
    changedFields?: { changed: string[]; aufgeloest?: boolean };
  } = {},
) {
  return new SicherungspostenAktualisiertEvent(
    overrides.einsatzId ?? 'einsatz-1',
    overrides.userId ?? 'user-1',
    overrides.sicherungspostenId ?? 'sp-1',
    overrides.fromVersion ?? 1,
    overrides.toVersion ?? 2,
    overrides.changedFields ?? { changed: ['bezeichnung', 'personal'] },
    overrides.einheitId ?? 'einheit-1',
  );
}

describe('SicherungspostenAktualisiertEtbHandler', () => {
  let handler: SicherungspostenAktualisiertEtbHandler;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockLogger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };

  beforeEach(() => {
    mockAddEintragHandler = { execute: jest.fn() } as unknown as jest.Mocked<AddEintragHandler>;
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    handler = new SicherungspostenAktualisiertEtbHandler(mockAddEintragHandler, mockLogger);
  });

  it('Branch AKTUALISIERT → Text mit Felder-Liste', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(
      buildEvent({
        fromVersion: 1,
        toVersion: 2,
        changedFields: { changed: ['bezeichnung', 'personal'] },
      }),
    );
    expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('Sicherungsposten aktualisiert (v1→v2, Felder: bezeichnung, personal)');
    expect(cmd.kategorie).toBe('MASSNAHME');
    expect(cmd.userId).toBe('user-1');
    expect(cmd.einsatzId).toBe('einsatz-1');
    expect(cmd.metadata).toMatchObject({
      eventType: 'SicherungspostenAktualisiert',
      sicherungspostenId: 'sp-1',
      fromVersion: 1,
      toVersion: 2,
      changedFields: { changed: ['bezeichnung', 'personal'] },
      einheitId: 'einheit-1',
    });
  });

  it('Branch AUFGELOEST → Text "aufgelöst"', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(
      buildEvent({
        fromVersion: 2,
        toVersion: 3,
        changedFields: { changed: ['aufgeloest'], aufgeloest: true },
      }),
    );
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('Sicherungsposten aufgelöst (v2→v3)');
    expect(cmd.kategorie).toBe('MASSNAHME');
    expect(cmd.metadata).toMatchObject({
      eventType: 'SicherungspostenAktualisiert',
      changedFields: { changed: ['aufgeloest'], aufgeloest: true },
    });
  });

  it('schluckt Fehler vom AddEintragHandler (Fire-and-Forget)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.fail('DB Error'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to add ETB entry'), 'SicherungspostenAktualisiertEtbHandler');
  });

  it('schluckt unerwartete Exceptions', async () => {
    mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'), 'SicherungspostenAktualisiertEtbHandler');
  });
});
