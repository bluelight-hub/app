// @ts-nocheck
import { Result } from '@domain/common/result';
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import type { AddEintragHandler } from '@application/etb/commands';
import { PsaProfilGeaendertEtbHandler } from '../psa-profil-geaendert-etb.handler';

function buildEvent(
  overrides: {
    einsatzId?: string;
    userId?: string;
    einheitId?: string;
    zuweisungId?: string;
    propagationGroupId?: string;
    profil?: 'BASIS' | 'INFEKTION' | 'VU' | 'CBRN_PATIENT' | 'VOLLSCHUTZ';
    aktion?: 'AKTIVIERT' | 'DEAKTIVIERT';
    begruendung?: string;
  } = {},
) {
  return new PsaProfilGeaendertEvent(
    overrides.einsatzId ?? 'einsatz-1',
    overrides.userId ?? 'user-1',
    overrides.einheitId ?? 'einheit-1',
    overrides.zuweisungId ?? 'zuw-1',
    overrides.propagationGroupId ?? 'pg-1',
    overrides.profil ?? 'BASIS',
    overrides.aktion ?? 'AKTIVIERT',
    overrides.begruendung ?? 'Begründung-Text',
  );
}

describe('PsaProfilGeaendertEtbHandler', () => {
  let handler: PsaProfilGeaendertEtbHandler;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockLogger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };

  beforeEach(() => {
    mockAddEintragHandler = { execute: jest.fn() } as unknown as jest.Mocked<AddEintragHandler>;
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    handler = new PsaProfilGeaendertEtbHandler(mockAddEintragHandler, mockLogger);
  });

  it('Branch AKTIVIERT → "PSA-Profil BASIS aktiviert"', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ aktion: 'AKTIVIERT', profil: 'BASIS' }));
    expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('PSA-Profil BASIS aktiviert für Einheit einheit-1: Begründung-Text');
    expect(cmd.kategorie).toBe('MASSNAHME');
    expect(cmd.userId).toBe('user-1');
    expect(cmd.einsatzId).toBe('einsatz-1');
    expect(cmd.metadata).toMatchObject({
      eventType: 'PsaProfilGeaendert',
      zuweisungId: 'zuw-1',
      propagationGroupId: 'pg-1',
      profil: 'BASIS',
      aktion: 'AKTIVIERT',
      einheitId: 'einheit-1',
    });
  });

  it('Branch DEAKTIVIERT → "PSA-Profil INFEKTION deaktiviert"', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ aktion: 'DEAKTIVIERT', profil: 'INFEKTION' }));
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('PSA-Profil INFEKTION deaktiviert für Einheit einheit-1: Begründung-Text');
    expect(cmd.metadata).toMatchObject({
      eventType: 'PsaProfilGeaendert',
      aktion: 'DEAKTIVIERT',
      profil: 'INFEKTION',
    });
  });

  it('truncated Begründung > 200 Zeichen mit Ellipsis', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    const long = 'A'.repeat(250);
    await handler.handle(buildEvent({ begruendung: long }));
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text.endsWith('...')).toBe(true);
    // Format: "PSA-Profil BASIS aktiviert für Einheit einheit-1: " + truncated(197) + "..."
    expect(cmd.text).toContain('PSA-Profil BASIS aktiviert für Einheit einheit-1: ');
    const begruendungPart = cmd.text.split(': ').slice(1).join(': ');
    expect(begruendungPart.length).toBe(200);
  });

  it('schluckt Fehler vom AddEintragHandler (Fire-and-Forget)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.fail('DB Error'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to add ETB entry'), 'PsaProfilGeaendertEtbHandler');
  });

  it('schluckt unerwartete Exceptions', async () => {
    mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'), 'PsaProfilGeaendertEtbHandler');
  });
});
