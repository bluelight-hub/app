// @ts-nocheck
import { Result } from '@domain/common/result';
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import type { AddEintragHandler } from '@application/etb/commands';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { PsaProfilGeaendertEtbHandler } from '../psa-profil-geaendert-etb.handler';

function buildEinheitRepo(name = 'Rotkreuz 83/1'): jest.Mocked<IEinsatzEinheitRepository> {
  return {
    findById: jest.fn().mockResolvedValue(Result.ok({ name } as any)),
  } as unknown as jest.Mocked<IEinsatzEinheitRepository>;
}

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
  let mockEinheitRepo: jest.Mocked<IEinsatzEinheitRepository>;

  beforeEach(() => {
    mockAddEintragHandler = { execute: jest.fn() } as unknown as jest.Mocked<AddEintragHandler>;
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    mockEinheitRepo = buildEinheitRepo('Rotkreuz 83/1');
    handler = new PsaProfilGeaendertEtbHandler(mockAddEintragHandler, mockLogger, mockEinheitRepo);
  });

  it('Branch AKTIVIERT → nutzt Einheit-Name und Profil-Label', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ aktion: 'AKTIVIERT', profil: 'BASIS' }));
    expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('PSA-Profil Basis aktiviert für Einheit Rotkreuz 83/1: Begründung-Text');
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

  it('Branch DEAKTIVIERT → "PSA-Profil Infektion deaktiviert"', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ aktion: 'DEAKTIVIERT', profil: 'INFEKTION' }));
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('PSA-Profil Infektion deaktiviert für Einheit Rotkreuz 83/1: Begründung-Text');
    expect(cmd.metadata).toMatchObject({
      eventType: 'PsaProfilGeaendert',
      aktion: 'DEAKTIVIERT',
      profil: 'INFEKTION',
    });
  });

  it('Profil CBRN_PATIENT → "CBRN-Patient" Label (User-Bug-Reproduktion)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    await handler.handle(buildEvent({ profil: 'CBRN_PATIENT', begruendung: 'CBRN' }));
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toBe('PSA-Profil CBRN-Patient aktiviert für Einheit Rotkreuz 83/1: CBRN');
    expect(cmd.text).not.toContain('CBRN_PATIENT');
    expect(cmd.text).not.toContain('einheit-1');
  });

  it('Fallback auf ID, wenn Einheit nicht auflösbar', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    mockEinheitRepo.findById.mockResolvedValue(Result.ok(null));
    await handler.handle(buildEvent({ einheitId: 'einheit-missing' }));
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toContain('Einheit einheit-missing');
  });

  it('truncated Begründung > 200 Zeichen mit Ellipsis', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    const long = 'A'.repeat(250);
    await handler.handle(buildEvent({ begruendung: long }));
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text.endsWith('...')).toBe(true);
    expect(cmd.text).toContain('PSA-Profil Basis aktiviert für Einheit Rotkreuz 83/1: ');
    const begruendungPart = cmd.text.split(': ').slice(1).join(': ');
    expect(begruendungPart.length).toBe(200);
  });

  it('schluckt Fehler vom AddEintragHandler (Fire-and-Forget)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.fail('DB Error'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to add ETB entry'), 'PsaProfilGeaendertEtbHandler');
  });

  it('schluckt Fehler aus Einheit-Lookup (Fire-and-Forget, ID-Fallback)', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as any));
    mockEinheitRepo.findById.mockRejectedValue(new Error('DB down'));
    await expect(handler.handle(buildEvent({ einheitId: 'einheit-x' }))).resolves.toBeUndefined();
    const cmd = mockAddEintragHandler.execute.mock.calls[0][0];
    expect(cmd.text).toContain('Einheit einheit-x');
  });

  it('schluckt unerwartete Exceptions', async () => {
    mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal'));
    await expect(handler.handle(buildEvent())).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'), 'PsaProfilGeaendertEtbHandler');
  });
});
