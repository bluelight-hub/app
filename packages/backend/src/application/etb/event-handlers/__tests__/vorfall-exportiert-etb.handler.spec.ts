// @ts-nocheck
import { Result } from '@domain/common/result';
import { VorfallExportiertEvent } from '@domain/eigenschutz/events/vorfall-exportiert.event';
import type { AddEintragHandler } from '@application/etb/commands';
import { VorfallExportiertEtbHandler } from '../vorfall-exportiert-etb.handler';

function buildEvent(
  overrides: {
    einsatzId?: string;
    userId?: string;
    vorfallId?: string;
    format?: 'pdf' | 'json';
    downloadedAt?: Date;
  } = {},
) {
  return new VorfallExportiertEvent(
    overrides.einsatzId ?? 'einsatz-1',
    overrides.userId ?? 'user-1',
    overrides.vorfallId ?? 'vorfall-1',
    overrides.format ?? 'pdf',
    overrides.downloadedAt ?? new Date('2026-03-10T12:00:00.000Z'),
  );
}

describe('VorfallExportiertEtbHandler', () => {
  let handler: VorfallExportiertEtbHandler;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockLogger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };

  beforeEach(() => {
    mockAddEintragHandler = { execute: jest.fn() } as unknown as jest.Mocked<AddEintragHandler>;
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    handler = new VorfallExportiertEtbHandler(mockAddEintragHandler, mockLogger);
  });

  it('erstellt ETB-Eintrag mit Format in Großbuchstaben (PDF)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    const downloadedAt = new Date('2026-03-10T12:00:00.000Z');
    await handler.handle(buildEvent({ format: 'pdf', downloadedAt }));
    expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('Vorfall exportiert als PDF');
    expect(cmd.kategorie).toBe('DOKUMENTATION');
    expect(cmd.userId).toBe('user-1');
    expect(cmd.einsatzId).toBe('einsatz-1');
    expect(cmd.metadata).toMatchObject({
      eventType: 'VorfallExportiert',
      vorfallId: 'vorfall-1',
      format: 'pdf',
      downloadedAt: downloadedAt.toISOString(),
    });
  });

  it('erstellt ETB-Eintrag mit JSON-Format-Variante', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ format: 'json' }));
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('Vorfall exportiert als JSON');
    expect(cmd.metadata).toMatchObject({ format: 'json' });
  });

  it('schluckt Fehler vom AddEintragHandler (Fire-and-Forget)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.fail('DB Error'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to add ETB entry'), 'VorfallExportiertEtbHandler');
  });

  it('schluckt unerwartete Exceptions', async () => {
    mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'), 'VorfallExportiertEtbHandler');
  });
});
