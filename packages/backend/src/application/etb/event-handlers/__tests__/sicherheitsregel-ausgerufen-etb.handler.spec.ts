// @ts-nocheck
import { Result } from '@domain/common/result';
import { SicherheitsregelAusgerufenEvent } from '@domain/eigenschutz/events/sicherheitsregel-ausgerufen.event';
import type { AddEintragHandler } from '@application/etb/commands';
import { SicherheitsregelAusgerufenEtbHandler } from '../sicherheitsregel-ausgerufen-etb.handler';

function buildEvent(
  cf: { created?: boolean; updated?: Array<'titel' | 'inhalt' | 'einheitId'>; deprecated?: boolean },
  overrides: {
    einsatzId?: string;
    userId?: string;
    einheitId?: string;
    regelId?: string;
    propagationGroupId?: string;
    fromVersion?: number | null;
    toVersion?: number;
    titel?: string;
    inhalt?: string;
  } = {},
) {
  return new SicherheitsregelAusgerufenEvent(
    overrides.einsatzId ?? 'einsatz-1',
    overrides.userId ?? 'user-1',
    overrides.einheitId ?? 'einheit-1',
    overrides.regelId ?? 'regel-1',
    overrides.propagationGroupId ?? 'pg-1',
    overrides.fromVersion ?? null,
    overrides.toVersion ?? 1,
    cf,
    overrides.titel ?? 'Schutzhelme verpflichtend',
    overrides.inhalt ?? 'Im Trümmerbereich Schutzhelm tragen',
  );
}

describe('SicherheitsregelAusgerufenEtbHandler', () => {
  let handler: SicherheitsregelAusgerufenEtbHandler;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockLogger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };

  beforeEach(() => {
    mockAddEintragHandler = { execute: jest.fn() } as unknown as jest.Mocked<AddEintragHandler>;
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    handler = new SicherheitsregelAusgerufenEtbHandler(mockAddEintragHandler, mockLogger);
  });

  it('Branch CREATED → Text "ausgerufen"', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ created: true }));
    expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('Sicherheitsregel "Schutzhelme verpflichtend" ausgerufen');
    expect(cmd.kategorie).toBe('MASSNAHME');
    expect(cmd.userId).toBe('user-1');
    expect(cmd.einsatzId).toBe('einsatz-1');
    expect(cmd.metadata).toMatchObject({
      eventType: 'SicherheitsregelAusgerufen',
      regelId: 'regel-1',
      propagationGroupId: 'pg-1',
      einheitId: 'einheit-1',
      fromVersion: null,
      toVersion: 1,
      changedFields: { created: true },
    });
  });

  it('Branch UPDATED → Text "aktualisiert (Felder: titel, inhalt)"', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ updated: ['titel', 'inhalt'] }, { fromVersion: 1, toVersion: 2 }));
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('Sicherheitsregel "Schutzhelme verpflichtend" aktualisiert (v1→v2, Felder: titel, inhalt)');
    expect(cmd.metadata).toMatchObject({
      eventType: 'SicherheitsregelAusgerufen',
      fromVersion: 1,
      toVersion: 2,
      changedFields: { updated: ['titel', 'inhalt'] },
    });
  });

  it('Branch DEPRECATED → Text "abgekündigt"', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ deprecated: true }, { fromVersion: 2, toVersion: 2 }));
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('Sicherheitsregel "Schutzhelme verpflichtend" abgekündigt');
    expect(cmd.metadata).toMatchObject({
      eventType: 'SicherheitsregelAusgerufen',
      changedFields: { deprecated: true },
    });
  });

  it('schluckt Fehler vom AddEintragHandler (Fire-and-Forget)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.fail('DB Error'));
    await expect(handler.handle(buildEvent({ created: true }))).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to add ETB entry'), 'SicherheitsregelAusgerufenEtbHandler');
  });

  it('schluckt unerwartete Exceptions', async () => {
    mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal'));
    await expect(handler.handle(buildEvent({ created: true }))).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'), 'SicherheitsregelAusgerufenEtbHandler');
  });
});
