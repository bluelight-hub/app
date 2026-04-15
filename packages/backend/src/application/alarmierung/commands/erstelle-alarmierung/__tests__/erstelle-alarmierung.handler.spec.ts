// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { ErstelleAlarmierungHandler } from '../erstelle-alarmierung.handler';
import { ErstelleAlarmierungCommand } from '../erstelle-alarmierung.command';
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import { AlarmierungErstelltEvent } from '@domain/events/alarmierung-erstellt.event';
import { AlarmierungEmpfaengerHinzugefuegtEvent } from '@domain/events/alarmierung-empfaenger-hinzugefuegt.event';
import { NachalarmierungErstelltEvent } from '@domain/events/nachalarmierung-erstellt.event';
import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { Result } from '@domain/common/result';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ALARMIERUNG_REPOSITORY, KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';

describe('ErstelleAlarmierungHandler', () => {
  let handler: ErstelleAlarmierungHandler;
  let mockRepo: any;
  let mockOutbox: any;
  let mockPrisma: any;
  let mockFahrzeugRepo: any;
  let mockPersonRepo: any;
  let mockEinheitRepo: any;

  const validEinsatzId = () => EinsatzId.create().value!.toString();
  const validUserId = () => 'system-user';

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRepo = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByEinsatzId: jest.fn().mockResolvedValue([]),
      findAktiveByFahrzeugId: jest.fn().mockResolvedValue([]),
    };
    mockOutbox = { save: jest.fn().mockResolvedValue(undefined) };
    mockPrisma = { $transaction: jest.fn().mockImplementation(async (cb: any) => cb({})) };

    mockFahrzeugRepo = {
      findById: jest.fn().mockResolvedValue(Result.ok({ funkrufname: 'Florian Mainz 12-1' })),
    };
    mockPersonRepo = {
      findById: jest.fn().mockResolvedValue(Result.ok({ funkrufname: 'WL 12', vorname: 'Max', nachname: 'Mustermann' })),
    };
    mockEinheitRepo = {
      findById: jest.fn().mockResolvedValue(Result.ok({ name: 'Zug 1' })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErstelleAlarmierungHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutbox },
        { provide: ALARMIERUNG_REPOSITORY, useValue: mockRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG, useValue: mockFahrzeugRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_PERSON, useValue: mockPersonRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT, useValue: mockEinheitRepo },
      ],
    }).compile();

    handler = module.get(ErstelleAlarmierungHandler);
  });

  function makeCmd(overrides: Partial<{ empfaenger: any[]; ursprungAlarmierungId?: string }> = {}) {
    return ErstelleAlarmierungCommand.create({
      einsatzId: validEinsatzId(),
      bezeichnung: 'Brandschutz Süd',
      empfaenger: overrides.empfaenger ?? [{ kind: 'fahrzeug', fahrzeugId: 'fz1' }],
      ursprungAlarmierungId: overrides.ursprungAlarmierungId,
      createdBy: validUserId(),
    });
  }

  it('erstellt Alarmierung mit einem Fahrzeug-Empfänger und persistiert', async () => {
    const cmd = makeCmd().value!;
    const result = await handler.execute(cmd);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBeInstanceOf(AlarmierungAggregate);
    expect(result.value!.empfaenger).toHaveLength(1);
    expect(result.value!.empfaenger[0]!.nameSnapshot).toBe('Florian Mainz 12-1');
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(mockOutbox.save).toHaveBeenCalledTimes(1);
  });

  it('emittiert AlarmierungErstellt + EmpfaengerHinzugefuegt Events in Outbox', async () => {
    const cmd = makeCmd().value!;
    await handler.execute(cmd);

    const events = mockOutbox.save.mock.calls[0]?.[0] as unknown[];
    expect(events.some((e) => e instanceof AlarmierungErstelltEvent)).toBe(true);
    expect(events.some((e) => e instanceof AlarmierungEmpfaengerHinzugefuegtEvent)).toBe(true);
  });

  it('emittiert NachalarmierungErstelltEvent wenn ursprungAlarmierungId gesetzt ist', async () => {
    const ursprung = AlarmierungId.create().value!.value;
    const cmd = makeCmd({ ursprungAlarmierungId: ursprung }).value!;
    const result = await handler.execute(cmd);

    expect(result.isSuccess).toBe(true);
    const events = mockOutbox.save.mock.calls[0]?.[0] as unknown[];
    expect(events.some((e) => e instanceof NachalarmierungErstelltEvent)).toBe(true);
  });

  it('löst Name-Snapshots auf, wenn nicht mitgeschickt — Person via Vor-/Nachname-Fallback', async () => {
    mockPersonRepo.findById.mockResolvedValue(Result.ok({ funkrufname: undefined, vorname: 'Anna', nachname: 'Beispiel' }));
    const cmd = makeCmd({ empfaenger: [{ kind: 'person', personId: 'p1' }] }).value!;
    const result = await handler.execute(cmd);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.empfaenger[0]!.nameSnapshot).toBe('Anna Beispiel');
  });

  it('verwendet vom Aufrufer mitgeschickten nameSnapshot ohne Repository-Lookup', async () => {
    const cmd = makeCmd({ empfaenger: [{ kind: 'einheit', einheitId: 'e1', nameSnapshot: 'Sonderzug' }] }).value!;
    const result = await handler.execute(cmd);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.empfaenger[0]!.nameSnapshot).toBe('Sonderzug');
    expect(mockEinheitRepo.findById).not.toHaveBeenCalled();
  });

  it('schlägt fehl, wenn das Fahrzeug nicht existiert', async () => {
    mockFahrzeugRepo.findById.mockResolvedValue(Result.ok(null));
    const cmd = makeCmd().value!;
    const result = await handler.execute(cmd);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Fahrzeug nicht gefunden');
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('schlägt fehl bei doppeltem Empfänger', async () => {
    const cmd = makeCmd({
      empfaenger: [
        { kind: 'fahrzeug', fahrzeugId: 'fz1' },
        { kind: 'fahrzeug', fahrzeugId: 'fz1' },
      ],
    }).value!;
    const result = await handler.execute(cmd);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('bereits zugeordnet');
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  describe('Command Validation', () => {
    it('verlangt mindestens einen Empfänger', () => {
      const r = ErstelleAlarmierungCommand.create({
        einsatzId: validEinsatzId(),
        bezeichnung: 'X',
        empfaenger: [],
        createdBy: validUserId(),
      });
      expect(r.isFailure).toBe(true);
    });

    it('verlangt Bezeichnung', () => {
      const r = ErstelleAlarmierungCommand.create({
        einsatzId: validEinsatzId(),
        bezeichnung: '   ',
        empfaenger: [{ kind: 'fahrzeug', fahrzeugId: 'fz1' }],
        createdBy: validUserId(),
      });
      expect(r.isFailure).toBe(true);
    });

    it('lehnt leere Empfänger-IDs ab', () => {
      const r = ErstelleAlarmierungCommand.create({
        einsatzId: validEinsatzId(),
        bezeichnung: 'X',
        empfaenger: [{ kind: 'fahrzeug', fahrzeugId: '   ' }],
        createdBy: validUserId(),
      });
      expect(r.isFailure).toBe(true);
    });
  });
});
