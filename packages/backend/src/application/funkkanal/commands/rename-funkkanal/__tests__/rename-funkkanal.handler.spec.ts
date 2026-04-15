// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { RenameFunkkanalHandler } from '../rename-funkkanal.handler';
import { RenameFunkkanalCommand } from '../rename-funkkanal.command';
import { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import { FunkkanalGeaendertEvent } from '@domain/events/funkkanal-geaendert.event';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUNKKANAL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';

describe('RenameFunkkanalHandler', () => {
  let handler: RenameFunkkanalHandler;
  let mockRepo: jest.Mocked<IFunkkanalRepository>;
  let mockOutbox: jest.Mocked<IOutboxRepository>;
  let mockPrisma: { $transaction: jest.Mock };

  const validUserId = () => UserId.create().value!.toString();

  function makeAggregate(name = 'Kanal 1') {
    return FunkkanalAggregate.create({
      einsatzId: EinsatzId.create().value!,
      name,
      details: { type: 'tmo', sprechgruppe: 'SG_1' },
      sortIndex: 0,
    }).value!;
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRepo = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByEinsatzId: jest.fn().mockResolvedValue([]),
      existsByName: jest.fn().mockResolvedValue(false),
      hasFunkspruchReferenz: jest.fn().mockResolvedValue(false),
      delete: jest.fn(),
      reorder: jest.fn(),
    } as jest.Mocked<IFunkkanalRepository>;

    mockOutbox = { save: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<IOutboxRepository>;
    mockPrisma = { $transaction: jest.fn().mockImplementation(async (cb) => cb({})) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RenameFunkkanalHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutbox },
        { provide: FUNKKANAL_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    handler = module.get(RenameFunkkanalHandler);
  });

  it('benennt Kanal um und emittiert Geändert-Event', async () => {
    const aggregate = makeAggregate('Alt');
    aggregate.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(aggregate);

    const cmd = RenameFunkkanalCommand.create({
      kanalId: aggregate.id.value,
      name: 'Neu',
      userId: validUserId(),
    }).value!;

    const result = await handler.execute(cmd);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.name).toBe('Neu');
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    const events = mockOutbox.save.mock.calls[0]?.[0] as unknown[];
    expect(events[0]).toBeInstanceOf(FunkkanalGeaendertEvent);
  });

  it('lehnt doppelten Namen ab (andere Kanal-ID)', async () => {
    const aggregate = makeAggregate('Alt');
    mockRepo.findById.mockResolvedValue(aggregate);
    mockRepo.existsByName.mockResolvedValue(true);

    const cmd = RenameFunkkanalCommand.create({
      kanalId: aggregate.id.value,
      name: 'Neu',
      userId: validUserId(),
    }).value!;

    const result = await handler.execute(cmd);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('bereits vergeben');
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('meldet Fehler bei nicht existierendem Kanal', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const cmd = RenameFunkkanalCommand.create({
      kanalId: 'a'.repeat(24),
      name: 'X',
      userId: validUserId(),
    }).value!;

    const result = await handler.execute(cmd);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('nicht gefunden');
  });

  it('lehnt Rename eines archivierten Kanals ab', async () => {
    const aggregate = makeAggregate('Alt');
    aggregate.archive(validUserId());
    aggregate.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(aggregate);

    const cmd = RenameFunkkanalCommand.create({
      kanalId: aggregate.id.value,
      name: 'Neu',
      userId: validUserId(),
    }).value!;

    const result = await handler.execute(cmd);

    expect(result.isFailure).toBe(true);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('Command verlangt name', () => {
    const r = RenameFunkkanalCommand.create({
      kanalId: 'a'.repeat(24),
      name: '   ',
      userId: validUserId(),
    });
    expect(r.isFailure).toBe(true);
  });
});
