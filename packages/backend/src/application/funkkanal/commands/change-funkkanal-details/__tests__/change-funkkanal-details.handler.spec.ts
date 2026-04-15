// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { ChangeFunkkanalDetailsHandler } from '../change-funkkanal-details.handler';
import { ChangeFunkkanalDetailsCommand } from '../change-funkkanal-details.command';
import { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import { FunkkanalGeaendertEvent } from '@domain/events/funkkanal-geaendert.event';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUNKKANAL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';

describe('ChangeFunkkanalDetailsHandler', () => {
  let handler: ChangeFunkkanalDetailsHandler;
  let mockRepo: jest.Mocked<IFunkkanalRepository>;
  let mockOutbox: jest.Mocked<IOutboxRepository>;
  let mockPrisma: { $transaction: jest.Mock };

  const userId = () => UserId.create().value!.toString();

  function makeAggregate() {
    return FunkkanalAggregate.create({
      einsatzId: EinsatzId.create().value!,
      name: 'K',
      details: { type: 'tmo', sprechgruppe: 'SG_1' },
      sortIndex: 0,
    }).value!;
  }

  beforeEach(async () => {
    mockRepo = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
      existsByName: jest.fn(),
      hasFunkspruchReferenz: jest.fn(),
      delete: jest.fn(),
      reorder: jest.fn(),
    } as jest.Mocked<IFunkkanalRepository>;

    mockOutbox = { save: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<IOutboxRepository>;
    mockPrisma = { $transaction: jest.fn().mockImplementation(async (cb) => cb({})) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangeFunkkanalDetailsHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutbox },
        { provide: FUNKKANAL_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    handler = module.get(ChangeFunkkanalDetailsHandler);
  });

  it('wechselt von TMO zu DMO', async () => {
    const aggregate = makeAggregate();
    aggregate.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(aggregate);

    const cmd = ChangeFunkkanalDetailsCommand.create({
      kanalId: aggregate.id.value,
      details: { type: 'dmo', dmoKanal: '410' },
      userId: userId(),
    }).value!;

    const result = await handler.execute(cmd);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.details.type).toBe('dmo');
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    const events = mockOutbox.save.mock.calls[0]?.[0] as unknown[];
    expect(events[0]).toBeInstanceOf(FunkkanalGeaendertEvent);
  });

  it('meldet Fehler bei ungültigen Details', async () => {
    const cmd = ChangeFunkkanalDetailsCommand.create({
      kanalId: 'a'.repeat(24),
      details: { type: 'tmo', sprechgruppe: '' },
      userId: userId(),
    }).value!;

    const result = await handler.execute(cmd);

    expect(result.isFailure).toBe(true);
  });

  it('meldet Fehler bei nicht existierendem Kanal', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const cmd = ChangeFunkkanalDetailsCommand.create({
      kanalId: 'a'.repeat(24),
      details: { type: 'tmo', sprechgruppe: 'SG' },
      userId: userId(),
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
  });

  it('lehnt Änderung bei archiviertem Kanal ab', async () => {
    const aggregate = makeAggregate();
    aggregate.archive(userId());
    aggregate.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(aggregate);

    const cmd = ChangeFunkkanalDetailsCommand.create({
      kanalId: aggregate.id.value,
      details: { type: 'tmo', sprechgruppe: 'SG2' },
      userId: userId(),
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
  });
});
