// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { GetKanalplanQueryHandler } from '../get-kanalplan.handler';
import { GetKanalplanQuery } from '../get-kanalplan.query';
import { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { FUNKKANAL_REPOSITORY } from '@infrastructure/di-tokens';
import type { IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';

describe('GetKanalplanQueryHandler', () => {
  let handler: GetKanalplanQueryHandler;
  let mockRepo: jest.Mocked<IFunkkanalRepository>;

  const einsatzId = EinsatzId.create().value!;

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
      providers: [GetKanalplanQueryHandler, { provide: FUNKKANAL_REPOSITORY, useValue: mockRepo }],
    }).compile();
    handler = module.get(GetKanalplanQueryHandler);
  });

  it('gibt Kanäle eines Einsatzes zurück (ohne archivierte per Default)', async () => {
    const k = FunkkanalAggregate.create({
      einsatzId,
      name: 'K',
      details: { type: 'tmo', sprechgruppe: 'SG' },
      sortIndex: 0,
    }).value!;
    mockRepo.findByEinsatzId.mockResolvedValue([k]);

    const query = GetKanalplanQuery.create({ einsatzId: einsatzId.value }).value!;
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toHaveLength(1);
    expect(mockRepo.findByEinsatzId).toHaveBeenCalledWith(expect.anything(), { includeArchived: false });
  });

  it('reicht includeArchived durch', async () => {
    mockRepo.findByEinsatzId.mockResolvedValue([]);
    const query = GetKanalplanQuery.create({ einsatzId: einsatzId.value, includeArchived: true }).value!;
    await handler.execute(query);
    expect(mockRepo.findByEinsatzId).toHaveBeenCalledWith(expect.anything(), { includeArchived: true });
  });

  it('meldet Fehler bei ungültiger einsatzId', async () => {
    const query = GetKanalplanQuery.create({ einsatzId: '123' }).value!;
    const result = await handler.execute(query);
    expect(result.isFailure).toBe(true);
  });

  it('Query verlangt einsatzId', () => {
    const r = GetKanalplanQuery.create({ einsatzId: '' });
    expect(r.isFailure).toBe(true);
  });
});
