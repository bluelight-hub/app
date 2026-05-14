// @ts-nocheck
import { Result } from '@domain/common/result';
import { GefaehrdungsbeurteilungAktualisiertEvent } from '@domain/eigenschutz/events/gefaehrdungsbeurteilung-aktualisiert.event';
import type { AddEintragHandler } from '@application/etb/commands';
import { GefaehrdungsbeurteilungAktualisiertEtbHandler } from '../gefaehrdungsbeurteilung-aktualisiert-etb.handler';

function buildEvent(
  overrides: {
    einsatzId?: string;
    userId?: string;
    einheitId?: string;
    gbId?: string;
    fromVersion?: number;
    toVersion?: number;
    changedFields?: any;
  } = {},
) {
  return new GefaehrdungsbeurteilungAktualisiertEvent(
    overrides.einsatzId ?? 'einsatz-1',
    overrides.userId ?? 'user-1',
    overrides.einheitId ?? 'einheit-1',
    overrides.gbId ?? 'gb-1',
    overrides.fromVersion ?? 1,
    overrides.toVersion ?? 2,
    overrides.changedFields ?? {
      added: ['new-1'],
      removed: [],
      updated: [{ id: 'old-1', fields: ['title'] }],
      unchanged: 3,
    },
  );
}

describe('GefaehrdungsbeurteilungAktualisiertEtbHandler', () => {
  let handler: GefaehrdungsbeurteilungAktualisiertEtbHandler;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockLogger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };

  beforeEach(() => {
    mockAddEintragHandler = { execute: jest.fn() } as unknown as jest.Mocked<AddEintragHandler>;
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    handler = new GefaehrdungsbeurteilungAktualisiertEtbHandler(mockAddEintragHandler, mockLogger);
  });

  it('erstellt ETB-Eintrag mit Diff-Zusammenfassung', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent());
    expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('Gefährdungsbeurteilung aktualisiert (v1→v2): 1 neu, 1 geändert, 0 entfernt');
    expect(cmd.kategorie).toBe('MASSNAHME');
    expect(cmd.userId).toBe('user-1');
    expect(cmd.einsatzId).toBe('einsatz-1');
    expect(cmd.metadata).toMatchObject({
      eventType: 'GefaehrdungsbeurteilungAktualisiert',
      gefaehrdungsbeurteilungId: 'gb-1',
      einheitId: 'einheit-1',
      fromVersion: 1,
      toVersion: 2,
      added: 1,
      updated: 1,
      removed: 0,
      unchanged: 3,
    });
  });

  it('schluckt Fehler vom AddEintragHandler (Fire-and-Forget)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.fail('DB Error'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to add ETB entry'), 'GefaehrdungsbeurteilungAktualisiertEtbHandler');
  });

  it('schluckt unerwartete Exceptions', async () => {
    mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'), 'GefaehrdungsbeurteilungAktualisiertEtbHandler');
  });
});
