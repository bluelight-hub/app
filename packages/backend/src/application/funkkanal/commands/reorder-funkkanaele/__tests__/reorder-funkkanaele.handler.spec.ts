// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { ReorderFunkkanaeleHandler } from '../reorder-funkkanaele.handler';
import { ReorderFunkkanaeleCommand } from '../reorder-funkkanaele.command';
import { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import { FunkkanalReihenfolgeGeaendertEvent } from '@domain/events/funkkanal-reihenfolge-geaendert.event';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUNKKANAL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';

describe('ReorderFunkkanaeleHandler', () => {
  let handler: ReorderFunkkanaeleHandler;
  let mockRepo: jest.Mocked<IFunkkanalRepository>;
  let mockOutbox: jest.Mocked<IOutboxRepository>;
  let mockPrisma: { $transaction: jest.Mock };

  const userId = () => UserId.create().value!.toString();
  const einsatz = EinsatzId.create().value!;

  const makeKanal = (name: string, sortIndex: number) =>
    FunkkanalAggregate.create({
      einsatzId: einsatz,
      name,
      details: { type: 'tmo', sprechgruppe: 'SG' },
      sortIndex,
    }).value!;

  beforeEach(async () => {
    mockRepo = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByEinsatzId: jest.fn().mockResolvedValue([]),
      existsByName: jest.fn(),
      hasFunkspruchReferenz: jest.fn(),
      delete: jest.fn(),
      reorder: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<IFunkkanalRepository>;
    mockOutbox = { save: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<IOutboxRepository>;
    mockPrisma = { $transaction: jest.fn().mockImplementation(async (cb) => cb({})) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReorderFunkkanaeleHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutbox },
        { provide: FUNKKANAL_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    handler = module.get(ReorderFunkkanaeleHandler);
  });

  it('persistiert neue Reihenfolge und emittiert Reihenfolge-Event', async () => {
    const k1 = makeKanal('K1', 0);
    const k2 = makeKanal('K2', 1);
    mockRepo.findByEinsatzId.mockResolvedValue([k1, k2]);

    const cmd = ReorderFunkkanaeleCommand.create({
      einsatzId: einsatz.value,
      ordering: [
        { kanalId: k2.id.value, sortIndex: 0 },
        { kanalId: k1.id.value, sortIndex: 1 },
      ],
      userId: userId(),
    }).value!;

    const result = await handler.execute(cmd);

    expect(result.isSuccess).toBe(true);
    expect(mockRepo.reorder).toHaveBeenCalledTimes(1);
    const events = mockOutbox.save.mock.calls[0]?.[0] as unknown[];
    expect(events[0]).toBeInstanceOf(FunkkanalReihenfolgeGeaendertEvent);
  });

  it('lehnt ordering mit unbekanntem Kanal ab', async () => {
    const k1 = makeKanal('K1', 0);
    mockRepo.findByEinsatzId.mockResolvedValue([k1]);

    const cmd = ReorderFunkkanaeleCommand.create({
      einsatzId: einsatz.value,
      ordering: [
        { kanalId: k1.id.value, sortIndex: 0 },
        { kanalId: 'z'.repeat(24), sortIndex: 1 },
      ],
      userId: userId(),
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
    expect(mockRepo.reorder).not.toHaveBeenCalled();
  });

  it('lehnt ordering ab, das nicht alle aktiven Kanäle enthält', async () => {
    const k1 = makeKanal('K1', 0);
    const k2 = makeKanal('K2', 1);
    mockRepo.findByEinsatzId.mockResolvedValue([k1, k2]);

    const cmd = ReorderFunkkanaeleCommand.create({
      einsatzId: einsatz.value,
      ordering: [{ kanalId: k1.id.value, sortIndex: 0 }],
      userId: userId(),
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
  });

  describe('Command Validation', () => {
    it('lehnt doppelten sortIndex ab', () => {
      const r = ReorderFunkkanaeleCommand.create({
        einsatzId: einsatz.value,
        ordering: [
          { kanalId: 'a'.repeat(24), sortIndex: 0 },
          { kanalId: 'b'.repeat(24), sortIndex: 0 },
        ],
        userId: userId(),
      });
      expect(r.isFailure).toBe(true);
    });

    it('lehnt doppelten Kanal ab', () => {
      const r = ReorderFunkkanaeleCommand.create({
        einsatzId: einsatz.value,
        ordering: [
          { kanalId: 'a'.repeat(24), sortIndex: 0 },
          { kanalId: 'a'.repeat(24), sortIndex: 1 },
        ],
        userId: userId(),
      });
      expect(r.isFailure).toBe(true);
    });

    it('lehnt leere ordering ab', () => {
      const r = ReorderFunkkanaeleCommand.create({
        einsatzId: einsatz.value,
        ordering: [],
        userId: userId(),
      });
      expect(r.isFailure).toBe(true);
    });
  });
});
