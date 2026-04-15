// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { EntferneZuordnungHandler } from '../entferne-zuordnung.handler';
import { EntferneZuordnungCommand } from '../entferne-zuordnung.command';
import { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import { FunkkanalZuordnungEntferntEvent } from '@domain/events/funkkanal-zuordnung-entfernt.event';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUNKKANAL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';

describe('EntferneZuordnungHandler', () => {
  let handler: EntferneZuordnungHandler;
  let mockRepo: jest.Mocked<IFunkkanalRepository>;
  let mockOutbox: jest.Mocked<IOutboxRepository>;
  let mockPrisma: { $transaction: jest.Mock };

  const userId = () => UserId.create().value!.toString();

  function makeWithZuordnung() {
    const a = FunkkanalAggregate.create({
      einsatzId: EinsatzId.create().value!,
      name: 'K',
      details: { type: 'tmo', sprechgruppe: 'SG' },
      sortIndex: 0,
    }).value!;
    const z = a.zuordneKraft({
      kraftRef: { kind: 'fahrzeug', fahrzeugId: 'fz1' },
      rufnameSnapshot: 'Florian 1',
      rolle: 'primaer',
    }).value!;
    a.clearDomainEvents();
    return { a, z };
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
        EntferneZuordnungHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutbox },
        { provide: FUNKKANAL_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    handler = module.get(EntferneZuordnungHandler);
  });

  it('entfernt Zuordnung und emittiert Entfernt-Event', async () => {
    const { a, z } = makeWithZuordnung();
    mockRepo.findById.mockResolvedValue(a);

    const cmd = EntferneZuordnungCommand.create({
      kanalId: a.id.value,
      zuordnungId: z.id.value,
      userId: userId(),
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isSuccess).toBe(true);
    expect(result.value!.zuordnungen.length).toBe(0);
    const events = mockOutbox.save.mock.calls[0]?.[0] as unknown[];
    expect(events[0]).toBeInstanceOf(FunkkanalZuordnungEntferntEvent);
  });

  it('meldet Fehler bei unbekannter Zuordnung', async () => {
    const { a } = makeWithZuordnung();
    mockRepo.findById.mockResolvedValue(a);

    const cmd = EntferneZuordnungCommand.create({
      kanalId: a.id.value,
      zuordnungId: 'z'.repeat(24),
      userId: userId(),
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
  });
});
