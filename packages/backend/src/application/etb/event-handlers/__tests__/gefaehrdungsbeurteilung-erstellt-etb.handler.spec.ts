// @ts-nocheck
import { Result } from '@domain/common/result';
import { GefaehrdungsbeurteilungErstelltEvent } from '@domain/eigenschutz/events/gefaehrdungsbeurteilung-erstellt.event';
import type { AddEintragHandler } from '@application/etb/commands';
import { GefaehrdungsbeurteilungErstelltEtbHandler } from '../gefaehrdungsbeurteilung-erstellt-etb.handler';

function buildEvent(
  overrides: Partial<{
    einsatzId: string;
    userId: string;
    einheitId: string;
    gefaehrdungsbeurteilungId: string;
    vorlageId: string | null;
    itemCount: number;
  }> = {},
) {
  return new GefaehrdungsbeurteilungErstelltEvent(
    overrides.einsatzId ?? 'einsatz-1',
    overrides.userId ?? 'user-1',
    overrides.einheitId ?? 'einheit-1',
    overrides.gefaehrdungsbeurteilungId ?? 'gb-1',
    overrides.vorlageId ?? null,
    overrides.itemCount ?? 5,
  );
}

describe('GefaehrdungsbeurteilungErstelltEtbHandler', () => {
  let handler: GefaehrdungsbeurteilungErstelltEtbHandler;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockLogger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };

  beforeEach(() => {
    mockAddEintragHandler = { execute: jest.fn() } as unknown as jest.Mocked<AddEintragHandler>;
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    handler = new GefaehrdungsbeurteilungErstelltEtbHandler(mockAddEintragHandler, mockLogger);
  });

  it('erstellt ETB-Eintrag mit Item-Count im Text', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ itemCount: 7 }));
    expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('Gefährdungsbeurteilung angelegt (7 Items)');
    expect(cmd.kategorie).toBe('MASSNAHME');
    expect(cmd.userId).toBe('user-1');
    expect(cmd.einsatzId).toBe('einsatz-1');
    expect(cmd.metadata).toMatchObject({
      eventType: 'GefaehrdungsbeurteilungErstellt',
      gefaehrdungsbeurteilungId: 'gb-1',
      einheitId: 'einheit-1',
    });
  });

  it('schluckt Fehler vom AddEintragHandler (Fire-and-Forget)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.fail('DB Error'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to add ETB entry'), 'GefaehrdungsbeurteilungErstelltEtbHandler');
  });

  it('schluckt unerwartete Exceptions', async () => {
    mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'), 'GefaehrdungsbeurteilungErstelltEtbHandler');
  });
});
