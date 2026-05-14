// @ts-nocheck
import { Result } from '@domain/common/result';
import { KonfliktErkanntEvent } from '@domain/eigenschutz/events/konflikt-erkannt.event';
import type { AddEintragHandler } from '@application/etb/commands';
import { KonfliktErkanntEtbHandler } from '../konflikt-erkannt-etb.handler';

function buildEvent(
  overrides: {
    einsatzId?: string;
    userId?: string;
    einheitId?: string | null;
    entityType?: 'PSA_PROFIL_ZUWEISUNG' | 'GEFAEHRDUNGSBEURTEILUNG_ITEM';
    entityId?: string;
    fieldPath?: string;
    localPayload?: Record<string, unknown>;
    serverVersion?: number;
    localExpectedVersion?: number;
  } = {},
) {
  return new KonfliktErkanntEvent(
    overrides.einsatzId ?? 'einsatz-1',
    overrides.userId ?? 'user-1',
    overrides.einheitId === undefined ? 'einheit-1' : overrides.einheitId,
    overrides.entityType ?? 'PSA_PROFIL_ZUWEISUNG',
    overrides.entityId ?? 'entity-1',
    overrides.fieldPath ?? 'profil',
    overrides.localPayload ?? { profil: 'STANDARD' },
    overrides.serverVersion ?? 3,
    overrides.localExpectedVersion ?? 2,
  );
}

describe('KonfliktErkanntEtbHandler', () => {
  let handler: KonfliktErkanntEtbHandler;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockLogger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };

  beforeEach(() => {
    mockAddEintragHandler = { execute: jest.fn() } as unknown as jest.Mocked<AddEintragHandler>;
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    handler = new KonfliktErkanntEtbHandler(mockAddEintragHandler, mockLogger);
  });

  it('erstellt ETB-Eintrag mit Sync-Konflikt-Kontext', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(
      buildEvent({
        entityType: 'PSA_PROFIL_ZUWEISUNG',
        entityId: 'zuweisung-1',
        fieldPath: 'profil',
        serverVersion: 3,
        localExpectedVersion: 2,
      }),
    );
    expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('Sync-Konflikt erkannt: PSA_PROFIL_ZUWEISUNG.profil (server v3, lokal v2)');
    expect(cmd.kategorie).toBe('SYSTEM');
    expect(cmd.userId).toBe('user-1');
    expect(cmd.einsatzId).toBe('einsatz-1');
    expect(cmd.metadata).toMatchObject({
      eventType: 'KonfliktErkannt',
      entityType: 'PSA_PROFIL_ZUWEISUNG',
      entityId: 'zuweisung-1',
      fieldPath: 'profil',
      serverVersion: 3,
      localExpectedVersion: 2,
      einheitId: 'einheit-1',
    });
  });

  it('mappt fehlende einheitId auf null im Metadata', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ einheitId: null }));
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.metadata).toMatchObject({ einheitId: null });
  });

  it('schluckt Fehler vom AddEintragHandler (Fire-and-Forget)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.fail('DB Error'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to add ETB entry'), 'KonfliktErkanntEtbHandler');
  });

  it('schluckt unerwartete Exceptions', async () => {
    mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'), 'KonfliktErkanntEtbHandler');
  });
});
