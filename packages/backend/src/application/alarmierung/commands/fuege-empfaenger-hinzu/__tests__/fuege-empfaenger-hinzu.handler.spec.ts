import { Test, type TestingModule } from '@nestjs/testing';
import { FuegeEmpfaengerHinzuHandler } from '../fuege-empfaenger-hinzu.handler';
import { FuegeEmpfaengerHinzuCommand } from '../fuege-empfaenger-hinzu.command';
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import { AlarmierungEmpfaengerHinzugefuegtEvent } from '@domain/events/alarmierung-empfaenger-hinzugefuegt.event';
import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { EinsatzFahrzeug } from '@domain/kraefte/aggregates/einsatz-fahrzeug.aggregate';
import type { EinsatzPerson } from '@domain/kraefte/aggregates/einsatz-person.aggregate';
import type { EinsatzEinheit } from '@domain/kraefte/aggregates/einsatz-einheit.aggregate';
import { Result } from '@domain/common/result';
import type { DomainEvent } from '@domain/common/domain-event';
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

function makeAggregate(): AlarmierungAggregate {
  const einsatzId = EinsatzId.create().value as EinsatzId;
  const aggregate = AlarmierungAggregate.create({
    einsatzId,
    bezeichnung: 'Brand',
    createdBy: 'system',
  }).value as AlarmierungAggregate;
  // clear initial events so we only inspect the new ones
  aggregate.clearDomainEvents();
  return aggregate;
}

describe('FuegeEmpfaengerHinzuHandler', () => {
  let handler: FuegeEmpfaengerHinzuHandler;
  let mockRepo: AlarmierungRepoMock;
  let mockOutbox: OutboxRepoMock;
  let mockPrisma: PrismaServiceMock;
  let mockFahrzeugRepo: EinsatzFahrzeugRepoMock;
  let mockPersonRepo: EinsatzPersonRepoMock;
  let mockEinheitRepo: EinsatzEinheitRepoMock;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepo = createAlarmierungRepoMock();
    mockOutbox = createOutboxRepoMock();
    mockPrisma = createPrismaMock();
    mockFahrzeugRepo = createEinsatzFahrzeugRepoMock();
    mockPersonRepo = createEinsatzPersonRepoMock();
    mockEinheitRepo = createEinsatzEinheitRepoMock();

    mockFahrzeugRepo.findById.mockResolvedValue(Result.ok({ funkrufname: 'Florian Mainz 12-1' } as unknown as EinsatzFahrzeug));
    mockPersonRepo.findById.mockResolvedValue(Result.ok({ funkrufname: undefined, vorname: 'Anna', nachname: 'B.' } as unknown as EinsatzPerson));
    mockEinheitRepo.findById.mockResolvedValue(Result.ok({ name: 'Zug 1' } as unknown as EinsatzEinheit));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FuegeEmpfaengerHinzuHandler,
        { provide: PrismaService, useValue: asPrismaService(mockPrisma) },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutbox },
        { provide: ALARMIERUNG_REPOSITORY, useValue: mockRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG, useValue: mockFahrzeugRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_PERSON, useValue: mockPersonRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT, useValue: mockEinheitRepo },
      ],
    }).compile();

    handler = module.get(FuegeEmpfaengerHinzuHandler);
  });

  it('fügt Fahrzeug-Empfänger hinzu und emittiert Event', async () => {
    const aggregate = makeAggregate();
    mockRepo.findById.mockResolvedValue(aggregate);

    const cmd = FuegeEmpfaengerHinzuCommand.create({
      alarmierungId: aggregate.id.value,
      empfaenger: { kind: 'fahrzeug', fahrzeugId: 'fz1' },
      createdBy: 'user-1',
    }).value as FuegeEmpfaengerHinzuCommand;

    const result = await handler.execute(cmd);
    expect(result.isSuccess).toBe(true);
    const updated = result.value as AlarmierungAggregate;
    expect(updated.empfaenger).toHaveLength(1);
    expect(updated.empfaenger[0]?.nameSnapshot).toBe('Florian Mainz 12-1');
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    const events = mockOutbox.save.mock.calls[0]?.[0] as DomainEvent[];
    expect(events.some((e) => e instanceof AlarmierungEmpfaengerHinzugefuegtEvent)).toBe(true);
  });

  it('schlägt fehl, wenn die Alarmierung nicht existiert', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const cmd = FuegeEmpfaengerHinzuCommand.create({
      alarmierungId: (AlarmierungId.create().value as AlarmierungId).value,
      empfaenger: { kind: 'fahrzeug', fahrzeugId: 'fz1' },
      createdBy: 'user-1',
    }).value as FuegeEmpfaengerHinzuCommand;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('nicht gefunden');
  });

  it('lehnt doppelten Empfänger ab', async () => {
    const aggregate = makeAggregate();
    aggregate.fuegeEmpfaengerHinzu({ ref: { kind: 'fahrzeug', fahrzeugId: 'fz1' }, nameSnapshot: 'Florian Mainz 12-1', createdBy: 'system' });
    aggregate.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(aggregate);

    const cmd = FuegeEmpfaengerHinzuCommand.create({
      alarmierungId: aggregate.id.value,
      empfaenger: { kind: 'fahrzeug', fahrzeugId: 'fz1' },
      createdBy: 'user-1',
    }).value as FuegeEmpfaengerHinzuCommand;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('bereits zugeordnet');
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('Command lehnt fehlende empfaenger-ID ab', () => {
    const r = FuegeEmpfaengerHinzuCommand.create({
      alarmierungId: 'a'.repeat(24),
      empfaenger: { kind: 'fahrzeug', fahrzeugId: '   ' },
      createdBy: 'u',
    });
    expect(r.isFailure).toBe(true);
  });
});
