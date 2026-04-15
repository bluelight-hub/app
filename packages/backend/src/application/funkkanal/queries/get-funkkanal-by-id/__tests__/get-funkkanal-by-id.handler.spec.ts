// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { GetFunkkanalByIdQueryHandler } from '../get-funkkanal-by-id.handler';
import { GetFunkkanalByIdQuery } from '../get-funkkanal-by-id.query';
import { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { FUNKKANAL_REPOSITORY } from '@infrastructure/di-tokens';
import type { IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';

describe('GetFunkkanalByIdQueryHandler', () => {
  let handler: GetFunkkanalByIdQueryHandler;
  let mockRepo: jest.Mocked<IFunkkanalRepository>;

  beforeEach(async () => {
    mockRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
      existsByName: jest.fn(),
      hasFunkspruchReferenz: jest.fn(),
      delete: jest.fn(),
      reorder: jest.fn(),
    } as jest.Mocked<IFunkkanalRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [GetFunkkanalByIdQueryHandler, { provide: FUNKKANAL_REPOSITORY, useValue: mockRepo }],
    }).compile();
    handler = module.get(GetFunkkanalByIdQueryHandler);
  });

  it('gibt Kanal zurück wenn vorhanden', async () => {
    const k = FunkkanalAggregate.create({
      einsatzId: EinsatzId.create().value!,
      name: 'K',
      details: { type: 'tmo', sprechgruppe: 'SG' },
      sortIndex: 0,
    }).value!;
    mockRepo.findById.mockResolvedValue(k);

    const query = GetFunkkanalByIdQuery.create({ kanalId: k.id.value }).value!;
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBe(k);
  });

  it('gibt null zurück wenn nicht vorhanden', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const query = GetFunkkanalByIdQuery.create({ kanalId: 'a'.repeat(24) }).value!;
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBeNull();
  });

  it('meldet Fehler bei ungültiger kanalId', async () => {
    const query = GetFunkkanalByIdQuery.create({ kanalId: '123' }).value!;
    const result = await handler.execute(query);
    expect(result.isFailure).toBe(true);
  });
});
