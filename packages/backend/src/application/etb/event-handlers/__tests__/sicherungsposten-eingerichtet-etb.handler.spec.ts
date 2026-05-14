// @ts-nocheck
import { Result } from '@domain/common/result';
import { SicherungspostenEingerichtetEvent } from '@domain/eigenschutz/events/sicherungsposten-eingerichtet.event';
import type { AddEintragHandler } from '@application/etb/commands';
import { SicherungspostenEingerichtetEtbHandler } from '../sicherungsposten-eingerichtet-etb.handler';

function buildEvent(
  overrides: {
    einsatzId?: string;
    userId?: string;
    einheitId?: string;
    sicherungspostenId?: string;
    bezeichnung?: string;
    standortKind?: 'coordinate' | 'address';
    personalCount?: number;
  } = {},
) {
  return new SicherungspostenEingerichtetEvent(
    overrides.einsatzId ?? 'einsatz-1',
    overrides.userId ?? 'user-1',
    overrides.sicherungspostenId ?? 'sp-1',
    overrides.bezeichnung ?? 'Nordzugang',
    overrides.standortKind ?? 'coordinate',
    overrides.personalCount ?? 3,
    overrides.einheitId ?? 'einheit-1',
  );
}

describe('SicherungspostenEingerichtetEtbHandler', () => {
  let handler: SicherungspostenEingerichtetEtbHandler;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockLogger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };

  beforeEach(() => {
    mockAddEintragHandler = { execute: jest.fn() } as unknown as jest.Mocked<AddEintragHandler>;
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    handler = new SicherungspostenEingerichtetEtbHandler(mockAddEintragHandler, mockLogger);
  });

  it('erstellt ETB-Eintrag mit Bezeichnung, Personal-Count und Koordinaten-Standort', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ bezeichnung: 'Nordzugang', personalCount: 3, standortKind: 'coordinate' }));
    expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('Sicherungsposten "Nordzugang" eingerichtet (3 Personen, Koordinaten)');
    expect(cmd.kategorie).toBe('MASSNAHME');
    expect(cmd.userId).toBe('user-1');
    expect(cmd.einsatzId).toBe('einsatz-1');
    expect(cmd.metadata).toMatchObject({
      eventType: 'SicherungspostenEingerichtet',
      sicherungspostenId: 'sp-1',
      bezeichnung: 'Nordzugang',
      standortKind: 'coordinate',
      personalCount: 3,
      einheitId: 'einheit-1',
    });
  });

  it('erstellt ETB-Eintrag mit Adresse-Standort-Variante', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ standortKind: 'address' }));
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('Sicherungsposten "Nordzugang" eingerichtet (3 Personen, Adresse)');
  });

  it('schluckt Fehler vom AddEintragHandler (Fire-and-Forget)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.fail('DB Error'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to add ETB entry'), 'SicherungspostenEingerichtetEtbHandler');
  });

  it('schluckt unerwartete Exceptions', async () => {
    mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'), 'SicherungspostenEingerichtetEtbHandler');
  });
});
