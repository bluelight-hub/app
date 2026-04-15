// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { AlarmierungErstelltZuEtbHandler } from '../alarmierung-erstellt-zu-etb.handler';
import { AlarmierungEmpfaengerHinzugefuegtZuEtbHandler } from '../alarmierung-empfaenger-hinzugefuegt-zu-etb.handler';
import { AlarmierungZeitpunktKorrigiertZuEtbHandler } from '../alarmierung-zeitpunkt-korrigiert-zu-etb.handler';
import { AlarmierungAbgeschlossenZuEtbHandler } from '../alarmierung-abgeschlossen-zu-etb.handler';
import { AlarmierungAbgeschlossenEvent } from '@domain/events/alarmierung-abgeschlossen.event';
import { AlarmierungEmpfaengerHinzugefuegtEvent } from '@domain/events/alarmierung-empfaenger-hinzugefuegt.event';
import { AlarmierungErstelltEvent } from '@domain/events/alarmierung-erstellt.event';
import { AlarmierungZeitpunktKorrigiertEvent } from '@domain/events/alarmierung-zeitpunkt-korrigiert.event';
import { AlarmierungEmpfaengerId } from '@domain/value-objects/alarmierung-empfaenger-id';
import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { AddEintragHandler } from '@application/etb/commands';
import { Result } from '@domain/common/result';
import { LOGGER } from '@infrastructure/di-tokens';

describe('Alarmierung → ETB Event-Handler', () => {
  let mockAddEintragHandler: { execute: jest.Mock };
  let mockLogger: any;
  let einsatzId: EinsatzId;
  let alarmierungId: AlarmierungId;

  beforeEach(() => {
    jest.clearAllMocks();
    einsatzId = EinsatzId.create().value!;
    alarmierungId = AlarmierungId.create().value!;
    mockAddEintragHandler = { execute: jest.fn().mockResolvedValue(Result.ok({} as any)) };
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  });

  async function make<T>(cls: new (...args: any[]) => T): Promise<T> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [cls, { provide: AddEintragHandler, useValue: mockAddEintragHandler }, { provide: LOGGER, useValue: mockLogger }],
    }).compile();
    return module.get(cls);
  }

  it('AlarmierungErstelltZuEtbHandler erzeugt ETB-Eintrag mit Kategorie ALARMIERUNG', async () => {
    const handler = await make(AlarmierungErstelltZuEtbHandler);
    const event = new AlarmierungErstelltEvent(alarmierungId, einsatzId, {
      bezeichnung: 'Brandschutz Süd',
      alarmierungszeit: new Date(),
      empfaengerCount: 3,
    });

    await handler.handle(event);

    expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    const cmd = mockAddEintragHandler.execute.mock.calls[0]![0];
    expect(cmd.text).toContain('Brandschutz Süd');
    expect(cmd.text).toContain('3 Empfänger');
    expect(cmd.kategorie).toBe('ALARMIERUNG');
  });

  it('AlarmierungEmpfaengerHinzugefuegtZuEtbHandler nutzt nameSnapshot im Text', async () => {
    const handler = await make(AlarmierungEmpfaengerHinzugefuegtZuEtbHandler);
    const empfaengerId = AlarmierungEmpfaengerId.create().value!;
    const event = new AlarmierungEmpfaengerHinzugefuegtEvent(alarmierungId, einsatzId, {
      empfaengerId,
      ref: { kind: 'fahrzeug', fahrzeugId: 'fz1' },
      nameSnapshot: 'Florian Mainz 12-1',
      alarmiertAm: new Date(),
    });

    await handler.handle(event);

    const cmd = mockAddEintragHandler.execute.mock.calls[0]![0];
    expect(cmd.text).toBe('Alarmiert: Florian Mainz 12-1');
    expect(cmd.kategorie).toBe('ALARMIERUNG');
  });

  it('AlarmierungZeitpunktKorrigiertZuEtbHandler schreibt Audit-Trail mit alt → neu', async () => {
    const handler = await make(AlarmierungZeitpunktKorrigiertZuEtbHandler);
    const empfaengerId = AlarmierungEmpfaengerId.create().value!;
    const event = new AlarmierungZeitpunktKorrigiertEvent(alarmierungId, einsatzId, {
      empfaengerId,
      nameSnapshot: 'Florian Mainz 12-1',
      feld: 'vorOrtAm',
      alterWert: null,
      neuerWert: new Date('2026-04-15T10:05:00Z'),
      korrigiertVon: 'user-1',
    });

    await handler.handle(event);

    const cmd = mockAddEintragHandler.execute.mock.calls[0]![0];
    expect(cmd.text).toContain('vorOrtAm');
    expect(cmd.text).toContain('Florian Mainz 12-1');
    expect(cmd.text).toContain('user-1');
    expect(cmd.text).toContain('2026-04-15T10:05:00');
  });

  it('AlarmierungAbgeschlossenZuEtbHandler schreibt Abschluss-Eintrag', async () => {
    const handler = await make(AlarmierungAbgeschlossenZuEtbHandler);
    const event = new AlarmierungAbgeschlossenEvent(alarmierungId, einsatzId, 'user-1');

    await handler.handle(event);

    const cmd = mockAddEintragHandler.execute.mock.calls[0]![0];
    expect(cmd.text).toBe('Alarmierung abgeschlossen (durch user-1)');
    expect(cmd.kategorie).toBe('ALARMIERUNG');
  });

  it('Fire-and-Forget: ETB-Fehler wird nur geloggt, nicht propagiert', async () => {
    mockAddEintragHandler.execute.mockResolvedValue(Result.fail('DB down'));
    const handler = await make(AlarmierungErstelltZuEtbHandler);
    const event = new AlarmierungErstelltEvent(alarmierungId, einsatzId, {
      bezeichnung: 'Brand',
      alarmierungszeit: new Date(),
      empfaengerCount: 1,
    });

    await expect(handler.handle(event)).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
