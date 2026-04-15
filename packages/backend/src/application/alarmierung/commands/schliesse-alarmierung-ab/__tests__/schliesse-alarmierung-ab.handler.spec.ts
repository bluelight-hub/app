// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { SchliesseAlarmierungAbHandler } from '../schliesse-alarmierung-ab.handler';
import { SchliesseAlarmierungAbCommand } from '../schliesse-alarmierung-ab.command';
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import { AlarmierungAbgeschlossenEvent } from '@domain/events/alarmierung-abgeschlossen.event';
import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ALARMIERUNG_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';

function makeAggregate() {
  const aggregate = AlarmierungAggregate.create({
    einsatzId: EinsatzId.create().value!,
    bezeichnung: 'Brand',
    createdBy: 'system',
  }).value!;
  aggregate.clearDomainEvents();
  return aggregate;
}

describe('SchliesseAlarmierungAbHandler', () => {
  let handler: SchliesseAlarmierungAbHandler;
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
        SchliesseAlarmierungAbHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutbox },
        { provide: ALARMIERUNG_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    handler = module.get(SchliesseAlarmierungAbHandler);
  });

  it('schließt eine aktive Alarmierung ab und emittiert Event', async () => {
    const aggregate = makeAggregate();
    mockRepo.findById.mockResolvedValue(aggregate);

    const cmd = SchliesseAlarmierungAbCommand.create({ alarmierungId: aggregate.id.value, updatedBy: 'user-1' }).value!;
    const result = await handler.execute(cmd);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.status).toBe('abgeschlossen');
    const events = mockOutbox.save.mock.calls[0]?.[0] as unknown[];
    expect(events.some((e) => e instanceof AlarmierungAbgeschlossenEvent)).toBe(true);
  });

  it('schlägt fehl, wenn Alarmierung bereits abgeschlossen ist', async () => {
    const aggregate = makeAggregate();
    aggregate.abschliessen('first');
    aggregate.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(aggregate);

    const cmd = SchliesseAlarmierungAbCommand.create({ alarmierungId: aggregate.id.value, updatedBy: 'user-1' }).value!;
    const result = await handler.execute(cmd);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('bereits abgeschlossen');
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('schlägt fehl, wenn Alarmierung nicht existiert', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const cmd = SchliesseAlarmierungAbCommand.create({
      alarmierungId: AlarmierungId.create().value!.value,
      updatedBy: 'user-1',
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
  });
});
