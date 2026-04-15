// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { CreateFunkkanalHandler } from '../create-funkkanal.handler';
import { CreateFunkkanalCommand } from '../create-funkkanal.command';
import { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import { FunkkanalErstelltEvent } from '@domain/events/funkkanal-erstellt.event';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUNKKANAL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';

describe('CreateFunkkanalHandler', () => {
  let handler: CreateFunkkanalHandler;
  let mockRepo: jest.Mocked<IFunkkanalRepository>;
  let mockOutbox: jest.Mocked<IOutboxRepository>;
  let mockPrisma: { $transaction: jest.Mock };

  const validEinsatzId = () => EinsatzId.create().value!.toString();
  const validUserId = () => UserId.create().value!.toString();

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRepo = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
      findByEinsatzId: jest.fn().mockResolvedValue([]),
      existsByName: jest.fn().mockResolvedValue(false),
      hasFunkspruchReferenz: jest.fn().mockResolvedValue(false),
      delete: jest.fn().mockResolvedValue(undefined),
      reorder: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<IFunkkanalRepository>;

    mockOutbox = {
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IOutboxRepository>;

    mockPrisma = {
      $transaction: jest.fn().mockImplementation(async (cb) => cb({})),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateFunkkanalHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutbox },
        { provide: FUNKKANAL_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    handler = module.get(CreateFunkkanalHandler);
  });

  function makeCmd(overrides: Partial<{ name: string; sortIndex?: number }> = {}) {
    return CreateFunkkanalCommand.create({
      einsatzId: validEinsatzId(),
      name: overrides.name ?? 'Kanal 1',
      details: { type: 'tmo', sprechgruppe: 'SG_1' },
      sortIndex: overrides.sortIndex,
      userId: validUserId(),
    });
  }

  it('erstellt Kanal und persistiert Aggregat', async () => {
    const cmdResult = makeCmd();
    expect(cmdResult.isSuccess).toBe(true);

    const result = await handler.execute(cmdResult.value!);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBeInstanceOf(FunkkanalAggregate);
    expect(result.value!.name).toBe('Kanal 1');
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(mockOutbox.save).toHaveBeenCalledTimes(1);
  });

  it('emittiert FunkkanalErstelltEvent in Outbox', async () => {
    const cmd = makeCmd().value!;
    await handler.execute(cmd);

    const events = mockOutbox.save.mock.calls[0]?.[0] as unknown[];
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(FunkkanalErstelltEvent);
  });

  it('lehnt doppelten Namen ab', async () => {
    mockRepo.existsByName.mockResolvedValue(true);
    const cmd = makeCmd().value!;

    const result = await handler.execute(cmd);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('bereits vergeben');
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('berechnet sortIndex wenn nicht angegeben', async () => {
    mockRepo.findByEinsatzId.mockResolvedValue([{ sortIndex: 2 } as any, { sortIndex: 5 } as any]);
    const cmd = makeCmd({ sortIndex: undefined }).value!;

    const result = await handler.execute(cmd);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.sortIndex).toBe(6);
  });

  it('nutzt 0 als sortIndex bei leerem Kanalplan', async () => {
    const cmd = makeCmd({ sortIndex: undefined }).value!;

    const result = await handler.execute(cmd);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.sortIndex).toBe(0);
  });

  it('lehnt ungültige Details ab', async () => {
    const cmd = CreateFunkkanalCommand.create({
      einsatzId: validEinsatzId(),
      name: 'Kanal',
      details: { type: 'tmo', sprechgruppe: '   ' },
      userId: validUserId(),
    }).value!;

    const result = await handler.execute(cmd);

    expect(result.isFailure).toBe(true);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  describe('Command Validation', () => {
    it('verlangt Name', () => {
      const r = CreateFunkkanalCommand.create({
        einsatzId: validEinsatzId(),
        name: '   ',
        details: { type: 'tmo', sprechgruppe: 'SG' },
        userId: validUserId(),
      });
      expect(r.isFailure).toBe(true);
    });

    it('verlangt einsatzId', () => {
      const r = CreateFunkkanalCommand.create({
        einsatzId: '',
        name: 'K',
        details: { type: 'tmo', sprechgruppe: 'SG' },
        userId: validUserId(),
      });
      expect(r.isFailure).toBe(true);
    });

    it('akzeptiert DMO-Details', () => {
      const r = CreateFunkkanalCommand.create({
        einsatzId: validEinsatzId(),
        name: 'DMO-Kanal',
        details: { type: 'dmo', dmoKanal: '410' },
        userId: validUserId(),
      });
      expect(r.isSuccess).toBe(true);
    });

    it('akzeptiert Analog-Details', () => {
      const r = CreateFunkkanalCommand.create({
        einsatzId: validEinsatzId(),
        name: 'Analog',
        details: { type: 'analog', band: '4m', frequenz: '168.250' },
        userId: validUserId(),
      });
      expect(r.isSuccess).toBe(true);
    });
  });
});
