// @ts-nocheck
import { Result } from '@domain/common/result';
import { KonfliktAufgeloestEvent } from '@domain/eigenschutz/events/konflikt-aufgeloest.event';
import type { AddEintragHandler } from '@application/etb/commands';
import { KonfliktAufgeloestEtbHandler } from '../konflikt-aufgeloest-etb.handler';

function buildEvent(
  overrides: {
    einsatzId?: string;
    userId?: string;
    einheitId?: string | null;
    syncConflictId?: string;
    entityType?: 'PSA_PROFIL_ZUWEISUNG' | 'GEFAEHRDUNGSBEURTEILUNG_ITEM';
    entityId?: string;
    fieldPath?: string;
    resolution?: 'SERVER_WINS' | 'LOCAL_WINS' | 'MERGED';
    resolvedAt?: Date;
  } = {},
) {
  return new KonfliktAufgeloestEvent(
    overrides.einsatzId ?? 'einsatz-1',
    overrides.userId ?? 'user-1',
    overrides.einheitId === undefined ? 'einheit-1' : overrides.einheitId,
    overrides.syncConflictId ?? 'conflict-1',
    overrides.entityType ?? 'PSA_PROFIL_ZUWEISUNG',
    overrides.entityId ?? 'entity-1',
    overrides.fieldPath ?? 'profil',
    overrides.resolution ?? 'SERVER_WINS',
    overrides.resolvedAt ?? new Date('2026-03-15T10:00:00.000Z'),
  );
}

describe('KonfliktAufgeloestEtbHandler', () => {
  let handler: KonfliktAufgeloestEtbHandler;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockLogger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };

  beforeEach(() => {
    mockAddEintragHandler = { execute: jest.fn() } as unknown as jest.Mocked<AddEintragHandler>;
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    handler = new KonfliktAufgeloestEtbHandler(mockAddEintragHandler, mockLogger);
  });

  it('erstellt ETB-Eintrag mit Resolution-Modus (SERVER_WINS)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    const resolvedAt = new Date('2026-03-15T10:00:00.000Z');
    await handler.handle(
      buildEvent({
        syncConflictId: 'conflict-42',
        entityType: 'PSA_PROFIL_ZUWEISUNG',
        entityId: 'zuweisung-1',
        fieldPath: 'profil',
        resolution: 'SERVER_WINS',
        resolvedAt,
      }),
    );
    expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('Sync-Konflikt aufgelöst: SERVER_WINS (PSA_PROFIL_ZUWEISUNG.profil)');
    expect(cmd.kategorie).toBe('DOKUMENTATION');
    expect(cmd.userId).toBe('user-1');
    expect(cmd.einsatzId).toBe('einsatz-1');
    expect(cmd.metadata).toMatchObject({
      eventType: 'KonfliktAufgeloest',
      syncConflictId: 'conflict-42',
      entityType: 'PSA_PROFIL_ZUWEISUNG',
      entityId: 'zuweisung-1',
      fieldPath: 'profil',
      resolution: 'SERVER_WINS',
      resolvedAt: resolvedAt.toISOString(),
    });
  });

  it('akzeptiert LOCAL_WINS und MERGED als Resolution', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ resolution: 'LOCAL_WINS' }));
    const cmd1 = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd1.text).toBe('Sync-Konflikt aufgelöst: LOCAL_WINS (PSA_PROFIL_ZUWEISUNG.profil)');

    await handler.handle(buildEvent({ resolution: 'MERGED' }));
    const cmd2 = mockAddEintragHandler.execute.mock.calls[1][0];
    expect(cmd2.text).toBe('Sync-Konflikt aufgelöst: MERGED (PSA_PROFIL_ZUWEISUNG.profil)');
  });

  it('schluckt Fehler vom AddEintragHandler (Fire-and-Forget)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.fail('DB Error'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to add ETB entry'), 'KonfliktAufgeloestEtbHandler');
  });

  it('schluckt unerwartete Exceptions', async () => {
    mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'), 'KonfliktAufgeloestEtbHandler');
  });
});
