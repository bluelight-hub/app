import { Test, type TestingModule } from '@nestjs/testing';
import { ErstelleAlarmierungHandler } from '../erstelle-alarmierung.handler';
import { ErstelleAlarmierungCommand, type ErstelleAlarmierungEmpfaengerInput } from '../erstelle-alarmierung.command';
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import { AlarmierungErstelltEvent } from '@domain/events/alarmierung-erstellt.event';
import { AlarmierungEmpfaengerHinzugefuegtEvent } from '@domain/events/alarmierung-empfaenger-hinzugefuegt.event';
import { NachalarmierungErstelltEvent } from '@domain/events/nachalarmierung-erstellt.event';
import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { Result } from '@domain/common/result';
import type { DomainEvent } from '@domain/common/domain-event';
import type { EinsatzFahrzeug } from '@domain/kraefte/aggregates/einsatz-fahrzeug.aggregate';
import type { EinsatzPerson } from '@domain/kraefte/aggregates/einsatz-person.aggregate';
import type { EinsatzEinheit } from '@domain/kraefte/aggregates/einsatz-einheit.aggregate';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ALARMIERUNG_REPOSITORY, KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import {
  asPrismaService,
  createAlarmierungRepoMock,
  createEinsatzEinheitRepoMock,
  createEinsatzFahrzeugRepoMock,
  createEinsatzPersonRepoMock,
  createOutboxRepoMock,
  createPrismaMock,
  type AlarmierungRepoMock,
  type EinsatzEinheitRepoMock,
  type EinsatzFahrzeugRepoMock,
  type EinsatzPersonRepoMock,
  type OutboxRepoMock,
  type PrismaServiceMock,
} from '../../../__tests__/test-doubles';

describe('ErstelleAlarmierungHandler', () => {
  let handler: ErstelleAlarmierungHandler;
  let mockRepo: AlarmierungRepoMock;
  let mockOutbox: OutboxRepoMock;
  let mockPrisma: PrismaServiceMock;
  let mockFahrzeugRepo: EinsatzFahrzeugRepoMock;
  let mockPersonRepo: EinsatzPersonRepoMock;
  let mockEinheitRepo: EinsatzEinheitRepoMock;

  const validEinsatzId = (): string => (EinsatzId.create().value as EinsatzId).value;
  const validUserId = (): string => 'system-user';

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRepo = createAlarmierungRepoMock();
    mockOutbox = createOutboxRepoMock();
    mockPrisma = createPrismaMock();

    mockFahrzeugRepo = createEinsatzFahrzeugRepoMock();
    mockPersonRepo = createEinsatzPersonRepoMock();
    mockEinheitRepo = createEinsatzEinheitRepoMock();

    mockFahrzeugRepo.findById.mockResolvedValue(Result.ok({ funkrufname: 'Florian Mainz 12-1' } as unknown as EinsatzFahrzeug));
    mockPersonRepo.findById.mockResolvedValue(Result.ok({ funkrufname: 'WL 12', vorname: 'Max', nachname: 'Mustermann' } as unknown as EinsatzPerson));
    mockEinheitRepo.findById.mockResolvedValue(Result.ok({ name: 'Zug 1' } as unknown as EinsatzEinheit));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErstelleAlarmierungHandler,
        { provide: PrismaService, useValue: asPrismaService(mockPrisma) },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutbox },
        { provide: ALARMIERUNG_REPOSITORY, useValue: mockRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG, useValue: mockFahrzeugRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_PERSON, useValue: mockPersonRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT, useValue: mockEinheitRepo },
      ],
    }).compile();

    handler = module.get(ErstelleAlarmierungHandler);
  });

  function makeCmd(overrides: { empfaenger?: ErstelleAlarmierungEmpfaengerInput[]; ursprungAlarmierungId?: string } = {}): ErstelleAlarmierungCommand {
    const r = ErstelleAlarmierungCommand.create({
      einsatzId: validEinsatzId(),
      bezeichnung: 'Brandschutz Süd',
      empfaenger: overrides.empfaenger ?? [{ kind: 'fahrzeug', fahrzeugId: 'fz1' }],
      ursprungAlarmierungId: overrides.ursprungAlarmierungId,
      createdBy: validUserId(),
    });
    return r.value as ErstelleAlarmierungCommand;
  }

  it('erstellt Alarmierung mit einem Fahrzeug-Empfänger und persistiert', async () => {
    const result = await handler.execute(makeCmd());

    expect(result.isSuccess).toBe(true);
    const aggregate = result.value as AlarmierungAggregate;
    expect(aggregate).toBeInstanceOf(AlarmierungAggregate);
    expect(aggregate.empfaenger).toHaveLength(1);
    expect(aggregate.empfaenger[0]?.nameSnapshot).toBe('Florian Mainz 12-1');
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(mockOutbox.save).toHaveBeenCalledTimes(1);
  });

  it('emittiert AlarmierungErstellt + EmpfaengerHinzugefuegt Events in Outbox', async () => {
    await handler.execute(makeCmd());

    const events = mockOutbox.save.mock.calls[0]?.[0] as DomainEvent[];
    expect(events.some((e) => e instanceof AlarmierungErstelltEvent)).toBe(true);
    expect(events.some((e) => e instanceof AlarmierungEmpfaengerHinzugefuegtEvent)).toBe(true);
  });

  it('emittiert NachalarmierungErstelltEvent wenn ursprungAlarmierungId gesetzt ist', async () => {
    const ursprung = (AlarmierungId.create().value as AlarmierungId).value;
    const result = await handler.execute(makeCmd({ ursprungAlarmierungId: ursprung }));

    expect(result.isSuccess).toBe(true);
    const events = mockOutbox.save.mock.calls[0]?.[0] as DomainEvent[];
    expect(events.some((e) => e instanceof NachalarmierungErstelltEvent)).toBe(true);
  });

  it('löst Name-Snapshots auf, wenn nicht mitgeschickt — Person via Vor-/Nachname-Fallback', async () => {
    mockPersonRepo.findById.mockResolvedValue(Result.ok({ funkrufname: undefined, vorname: 'Anna', nachname: 'Beispiel' } as unknown as EinsatzPerson));
    const result = await handler.execute(makeCmd({ empfaenger: [{ kind: 'person', personId: 'p1' }] }));

    expect(result.isSuccess).toBe(true);
    expect((result.value as AlarmierungAggregate).empfaenger[0]?.nameSnapshot).toBe('Anna Beispiel');
  });

  it('verwendet vom Aufrufer mitgeschickten nameSnapshot ohne Repository-Lookup', async () => {
    const result = await handler.execute(makeCmd({ empfaenger: [{ kind: 'einheit', einheitId: 'e1', nameSnapshot: 'Sonderzug' }] }));

    expect(result.isSuccess).toBe(true);
    expect((result.value as AlarmierungAggregate).empfaenger[0]?.nameSnapshot).toBe('Sonderzug');
    expect(mockEinheitRepo.findById).not.toHaveBeenCalled();
  });

  it('schlägt fehl, wenn das Fahrzeug nicht existiert', async () => {
    mockFahrzeugRepo.findById.mockResolvedValue(Result.ok(null));
    const result = await handler.execute(makeCmd());

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Fahrzeug nicht gefunden');
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('schlägt fehl bei doppeltem Empfänger', async () => {
    const result = await handler.execute(
      makeCmd({
        empfaenger: [
          { kind: 'fahrzeug', fahrzeugId: 'fz1' },
          { kind: 'fahrzeug', fahrzeugId: 'fz1' },
        ],
      }),
    );

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
