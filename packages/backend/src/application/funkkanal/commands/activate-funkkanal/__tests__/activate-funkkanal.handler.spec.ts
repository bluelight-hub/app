// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { ActivateFunkkanalHandler } from '../activate-funkkanal.handler';
import { ActivateFunkkanalCommand } from '../activate-funkkanal.command';
import { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import { FunkkanalGeaendertEvent } from '@domain/events/funkkanal-geaendert.event';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUNKKANAL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';

describe('ActivateFunkkanalHandler', () => {
  let handler: ActivateFunkkanalHandler;
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
        ActivateFunkkanalHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutbox },
        { provide: FUNKKANAL_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    handler = module.get(ActivateFunkkanalHandler);
  });

  it('reaktiviert deaktivierten Kanal', async () => {
    const a = make();
    a.deactivate(userId());
    a.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(a);

    const cmd = ActivateFunkkanalCommand.create({ kanalId: a.id.value, userId: userId() }).value!;
    const result = await handler.execute(cmd);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.status).toBe('aktiv');
    const events = mockOutbox.save.mock.calls[0]?.[0] as unknown[];
    expect(events[0]).toBeInstanceOf(FunkkanalGeaendertEvent);
  });

  it('lehnt erneute Aktivierung bei aktivem Kanal ab', async () => {
    const a = make();
    a.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(a);

    const cmd = ActivateFunkkanalCommand.create({ kanalId: a.id.value, userId: userId() }).value!;
    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
  });

  it('lehnt Aktivierung bei archiviertem Kanal ab', async () => {
    const a = make();
    a.archive(userId());
    a.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(a);

    const cmd = ActivateFunkkanalCommand.create({ kanalId: a.id.value, userId: userId() }).value!;
    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
  });
});
