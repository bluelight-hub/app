// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { AendereZuordnungRolleHandler } from '../aendere-zuordnung-rolle.handler';
import { AendereZuordnungRolleCommand } from '../aendere-zuordnung-rolle.command';
import { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUNKKANAL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';

describe('AendereZuordnungRolleHandler', () => {
  let handler: AendereZuordnungRolleHandler;
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
        AendereZuordnungRolleHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutbox },
        { provide: FUNKKANAL_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    handler = module.get(AendereZuordnungRolleHandler);
  });

  it('ändert Rolle einer Zuordnung', async () => {
    const { a, z } = makeWithZuordnung();
    mockRepo.findById.mockResolvedValue(a);

    const cmd = AendereZuordnungRolleCommand.create({
      kanalId: a.id.value,
      zuordnungId: z.id.value,
      rolle: 'sekundaer',
      userId: userId(),
    }).value!;

    const result = await handler.execute(cmd);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.zuordnungen[0].rolle).toBe('sekundaer');
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });

  it('meldet Fehler bei unbekannter Zuordnung', async () => {
    const { a } = makeWithZuordnung();
    mockRepo.findById.mockResolvedValue(a);

    const cmd = AendereZuordnungRolleCommand.create({
      kanalId: a.id.value,
      zuordnungId: 'z'.repeat(24),
      rolle: 'zuhoeren',
      userId: userId(),
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
  });

  it('Command lehnt ungültige Rolle ab', () => {
    const r = AendereZuordnungRolleCommand.create({
      kanalId: 'a'.repeat(24),
      zuordnungId: 'a'.repeat(24),
      rolle: 'XX' as any,
      userId: userId(),
    });
    expect(r.isFailure).toBe(true);
  });
});
