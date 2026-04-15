import { Test, type TestingModule } from '@nestjs/testing';
import { EntferneEmpfaengerHandler } from '../entferne-empfaenger.handler';
import { EntferneEmpfaengerCommand } from '../entferne-empfaenger.command';
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import type { AlarmierungEmpfaenger } from '@domain/aggregates/alarmierung/alarmierung-empfaenger.entity';
import { AlarmierungEmpfaengerEntferntEvent } from '@domain/events/alarmierung-empfaenger-entfernt.event';
import { AlarmierungEmpfaengerId } from '@domain/value-objects/alarmierung-empfaenger-id';
import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { DomainEvent } from '@domain/common/domain-event';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ALARMIERUNG_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import {
  asPrismaService,
  createAlarmierungRepoMock,
  createOutboxRepoMock,
  createPrismaMock,
  type AlarmierungRepoMock,
  type OutboxRepoMock,
  type PrismaServiceMock,
} from '../../../__tests__/test-doubles';

function makeAggregateWithEmpfaenger(): { aggregate: AlarmierungAggregate; empfaengerId: AlarmierungEmpfaengerId } {
  const aggregate = AlarmierungAggregate.create({
    einsatzId: EinsatzId.create().value as EinsatzId,
    bezeichnung: 'Brand',
    createdBy: 'system',
  }).value as AlarmierungAggregate;
  const addResult = aggregate.fuegeEmpfaengerHinzu({
    ref: { kind: 'fahrzeug', fahrzeugId: 'fz1' },
    nameSnapshot: 'Florian Mainz 12-1',
    createdBy: 'system',
  });
  aggregate.clearDomainEvents();
  const empfaenger = addResult.value as AlarmierungEmpfaenger;
  return { aggregate, empfaengerId: empfaenger.id };
}

describe('EntferneEmpfaengerHandler', () => {
  let handler: EntferneEmpfaengerHandler;
  let mockRepo: AlarmierungRepoMock;
  let mockOutbox: OutboxRepoMock;
  let mockPrisma: PrismaServiceMock;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepo = createAlarmierungRepoMock();
    mockOutbox = createOutboxRepoMock();
    mockPrisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntferneEmpfaengerHandler,
        { provide: PrismaService, useValue: asPrismaService(mockPrisma) },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutbox },
        { provide: ALARMIERUNG_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    handler = module.get(EntferneEmpfaengerHandler);
  });

  it('entfernt einen Empfänger und emittiert Event', async () => {
    const { aggregate, empfaengerId } = makeAggregateWithEmpfaenger();
    mockRepo.findById.mockResolvedValue(aggregate);

    const cmd = EntferneEmpfaengerCommand.create({
      alarmierungId: aggregate.id.value,
      empfaengerId: empfaengerId.value,
      updatedBy: 'user-1',
    }).value as EntferneEmpfaengerCommand;

    const result = await handler.execute(cmd);
    expect(result.isSuccess).toBe(true);
    expect((result.value as AlarmierungAggregate).empfaenger).toHaveLength(0);
    const events = mockOutbox.save.mock.calls[0]?.[0] as DomainEvent[];
    expect(events.some((e) => e instanceof AlarmierungEmpfaengerEntferntEvent)).toBe(true);
  });

  it('schlägt fehl, wenn der Empfänger nicht zur Alarmierung gehört', async () => {
    const { aggregate } = makeAggregateWithEmpfaenger();
    mockRepo.findById.mockResolvedValue(aggregate);

    const fremdId = (AlarmierungEmpfaengerId.create().value as AlarmierungEmpfaengerId).value;
    const cmd = EntferneEmpfaengerCommand.create({
      alarmierungId: aggregate.id.value,
      empfaengerId: fremdId,
      updatedBy: 'user-1',
    }).value as EntferneEmpfaengerCommand;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('nicht gefunden');
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('schlägt fehl, wenn die Alarmierung nicht existiert', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const cmd = EntferneEmpfaengerCommand.create({
      alarmierungId: (AlarmierungId.create().value as AlarmierungId).value,
      empfaengerId: (AlarmierungEmpfaengerId.create().value as AlarmierungEmpfaengerId).value,
      updatedBy: 'user-1',
    }).value as EntferneEmpfaengerCommand;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Alarmierung nicht gefunden');
  });
});
