// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { EntferneEmpfaengerHandler } from '../entferne-empfaenger.handler';
import { EntferneEmpfaengerCommand } from '../entferne-empfaenger.command';
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import { AlarmierungEmpfaengerEntferntEvent } from '@domain/events/alarmierung-empfaenger-entfernt.event';
import { AlarmierungEmpfaengerId } from '@domain/value-objects/alarmierung-empfaenger-id';
import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ALARMIERUNG_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';

function makeAggregateWithEmpfaenger() {
  const aggregate = AlarmierungAggregate.create({
    einsatzId: EinsatzId.create().value!,
    bezeichnung: 'Brand',
    createdBy: 'system',
  }).value!;
  const addResult = aggregate.fuegeEmpfaengerHinzu({
    ref: { kind: 'fahrzeug', fahrzeugId: 'fz1' },
    nameSnapshot: 'Florian Mainz 12-1',
    createdBy: 'system',
  });
  aggregate.clearDomainEvents();
  return { aggregate, empfaengerId: addResult.value!.id };
}

describe('EntferneEmpfaengerHandler', () => {
  let handler: EntferneEmpfaengerHandler;
  let mockRepo: any;
  let mockOutbox: any;
  let mockPrisma: any;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntferneEmpfaengerHandler,
        { provide: PrismaService, useValue: mockPrisma },
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
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isSuccess).toBe(true);
    expect(result.value!.empfaenger).toHaveLength(0);
    const events = mockOutbox.save.mock.calls[0]?.[0] as unknown[];
    expect(events.some((e) => e instanceof AlarmierungEmpfaengerEntferntEvent)).toBe(true);
  });

  it('schlägt fehl, wenn der Empfänger nicht zur Alarmierung gehört', async () => {
    const { aggregate } = makeAggregateWithEmpfaenger();
    mockRepo.findById.mockResolvedValue(aggregate);

    const fremdId = AlarmierungEmpfaengerId.create().value!.value;
    const cmd = EntferneEmpfaengerCommand.create({
      alarmierungId: aggregate.id.value,
      empfaengerId: fremdId,
      updatedBy: 'user-1',
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('nicht gefunden');
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('schlägt fehl, wenn die Alarmierung nicht existiert', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const cmd = EntferneEmpfaengerCommand.create({
      alarmierungId: AlarmierungId.create().value!.value,
      empfaengerId: AlarmierungEmpfaengerId.create().value!.value,
      updatedBy: 'user-1',
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Alarmierung nicht gefunden');
  });
});
