// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { SetFunkkanalZweckHandler } from '../set-funkkanal-zweck.handler';
import { SetFunkkanalZweckCommand } from '../set-funkkanal-zweck.command';
import { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import { FunkkanalGeaendertEvent } from '@domain/events/funkkanal-geaendert.event';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUNKKANAL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';

describe('SetFunkkanalZweckHandler', () => {
  let handler: SetFunkkanalZweckHandler;
  let mockRepo: jest.Mocked<IFunkkanalRepository>;
  let mockOutbox: jest.Mocked<IOutboxRepository>;
  let mockPrisma: { $transaction: jest.Mock };

  const userId = () => UserId.create().value!.toString();

  function makeAggregate(zweck?: string) {
    return FunkkanalAggregate.create({
      einsatzId: EinsatzId.create().value!,
      name: 'K',
      details: { type: 'tmo', sprechgruppe: 'SG' },
      sortIndex: 0,
      zweck,
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
        SetFunkkanalZweckHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutbox },
        { provide: FUNKKANAL_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    handler = module.get(SetFunkkanalZweckHandler);
  });

  it('setzt Zweck und emittiert Geändert-Event', async () => {
    const aggregate = makeAggregate();
    aggregate.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(aggregate);

    const cmd = SetFunkkanalZweckCommand.create({
      kanalId: aggregate.id.value,
      zweck: 'Führungskanal',
      userId: userId(),
    }).value!;

    const result = await handler.execute(cmd);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.zweck).toBe('Führungskanal');
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    const events = mockOutbox.save.mock.calls[0]?.[0] as unknown[];
    expect(events[0]).toBeInstanceOf(FunkkanalGeaendertEvent);
  });

  it('entfernt Zweck bei null', async () => {
    const aggregate = makeAggregate('Alt');
    aggregate.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(aggregate);

    const cmd = SetFunkkanalZweckCommand.create({
      kanalId: aggregate.id.value,
      zweck: null,
      userId: userId(),
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isSuccess).toBe(true);
    expect(result.value!.zweck).toBeUndefined();
  });

  it('meldet Fehler bei nicht existierendem Kanal', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const cmd = SetFunkkanalZweckCommand.create({
      kanalId: 'a'.repeat(24),
      zweck: 'X',
      userId: userId(),
    }).value!;
    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
  });

  it('lehnt bei archiviertem Kanal ab', async () => {
    const aggregate = makeAggregate();
    aggregate.archive(userId());
    aggregate.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(aggregate);

    const cmd = SetFunkkanalZweckCommand.create({
      kanalId: aggregate.id.value,
      zweck: 'X',
      userId: userId(),
    }).value!;
    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
  });
});
