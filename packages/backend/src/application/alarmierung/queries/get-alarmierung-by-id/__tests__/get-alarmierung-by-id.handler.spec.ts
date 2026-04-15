import { Test, type TestingModule } from '@nestjs/testing';
import { GetAlarmierungByIdQueryHandler } from '../get-alarmierung-by-id.handler';
import { GetAlarmierungByIdQuery } from '../get-alarmierung-by-id.query';
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { IAlarmierungRepository } from '@domain/repositories/i-alarmierung.repository';
import { ALARMIERUNG_REPOSITORY } from '@infrastructure/di-tokens';

describe('GetAlarmierungByIdQueryHandler', () => {
  let handler: GetAlarmierungByIdQueryHandler;
  let mockRepo: jest.Mocked<IAlarmierungRepository>;

  beforeEach(async () => {
    mockRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
      findAktiveByFahrzeugId: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetAlarmierungByIdQueryHandler, { provide: ALARMIERUNG_REPOSITORY, useValue: mockRepo }],
    }).compile();
    handler = module.get(GetAlarmierungByIdQueryHandler);
  });

  it('gibt Alarmierung zurück, wenn vorhanden', async () => {
    const aggregate = AlarmierungAggregate.create({
      einsatzId: EinsatzId.create().value as EinsatzId,
      bezeichnung: 'Brand',
      createdBy: 'system',
    }).value as AlarmierungAggregate;
    mockRepo.findById.mockResolvedValue(aggregate);

    const query = GetAlarmierungByIdQuery.create({ alarmierungId: aggregate.id.value }).value as GetAlarmierungByIdQuery;
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBe(aggregate);
  });

  it('gibt null zurück, wenn nicht vorhanden', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const id = (AlarmierungId.create().value as AlarmierungId).value;
    const query = GetAlarmierungByIdQuery.create({ alarmierungId: id }).value as GetAlarmierungByIdQuery;
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBeNull();
  });

  it('meldet Fehler bei ungültiger alarmierungId', async () => {
    const query = GetAlarmierungByIdQuery.create({ alarmierungId: '123' }).value as GetAlarmierungByIdQuery;
    const result = await handler.execute(query);
    expect(result.isFailure).toBe(true);
  });
});
