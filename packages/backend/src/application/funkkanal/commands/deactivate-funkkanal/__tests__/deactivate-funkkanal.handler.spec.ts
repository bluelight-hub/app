// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { DeactivateFunkkanalHandler } from '../deactivate-funkkanal.handler';
import { DeactivateFunkkanalCommand } from '../deactivate-funkkanal.command';
import { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import { FunkkanalGeaendertEvent } from '@domain/events/funkkanal-geaendert.event';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUNKKANAL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';

describe('DeactivateFunkkanalHandler', () => {
  let handler: DeactivateFunkkanalHandler;
  let mockRepo: jest.Mocked<IFunkkanalRepository>;
  let mockOutbox: jest.Mocked<IOutboxRepository>;
  let mockPrisma: { $transaction: jest.Mock };

  const userId = () => UserId.create().value!.toString();

  const make = () =>
    FunkkanalAggregate.create({
      einsatzId: EinsatzId.create().value!,
      name: 'K',
      details: { type: 'tmo', sprechgruppe: 'SG' },
      sortIndex: 0,
    }).value!;

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
        DeactivateFunkkanalHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutbox },
        { provide: FUNKKANAL_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    handler = module.get(DeactivateFunkkanalHandler);
  });

  it('deaktiviert aktiven Kanal und emittiert Geändert-Event', async () => {
    const a = make();
    a.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(a);

    const cmd = DeactivateFunkkanalCommand.create({ kanalId: a.id.value, userId: userId() }).value!;
    const result = await handler.execute(cmd);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.status).toBe('inaktiv');
    const events = mockOutbox.save.mock.calls[0]?.[0] as unknown[];
    expect(events[0]).toBeInstanceOf(FunkkanalGeaendertEvent);
  });

  it('lehnt erneutes Deaktivieren ab', async () => {
    const a = make();
    a.deactivate(userId());
    a.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(a);

    const cmd = DeactivateFunkkanalCommand.create({ kanalId: a.id.value, userId: userId() }).value!;
    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
  });

  it('lehnt Deaktivieren bei archiviertem Kanal ab', async () => {
    const a = make();
    a.archive(userId());
    a.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(a);

    const cmd = DeactivateFunkkanalCommand.create({ kanalId: a.id.value, userId: userId() }).value!;
    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
  });
});
