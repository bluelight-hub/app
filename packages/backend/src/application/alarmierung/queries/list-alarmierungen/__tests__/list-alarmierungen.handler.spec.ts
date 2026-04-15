import { Test, type TestingModule } from '@nestjs/testing';
import { ListAlarmierungenQueryHandler } from '../list-alarmierungen.handler';
import { ListAlarmierungenQuery } from '../list-alarmierungen.query';
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { IAlarmierungRepository } from '@domain/repositories/i-alarmierung.repository';
import { ALARMIERUNG_REPOSITORY } from '@infrastructure/di-tokens';

function makeAggregate(zeit: Date): AlarmierungAggregate {
  return AlarmierungAggregate.create({
    einsatzId: EinsatzId.create().value as EinsatzId,
    bezeichnung: `A-${zeit.toISOString()}`,
    alarmierungszeit: zeit,
    createdBy: 'system',
  }).value as AlarmierungAggregate;
}

function einsatzIdValue(): string {
  return (EinsatzId.create().value as EinsatzId).value;
}

describe('ListAlarmierungenQueryHandler', () => {
  let handler: ListAlarmierungenQueryHandler;
  let mockRepo: jest.Mocked<IAlarmierungRepository>;

  beforeEach(async () => {
    mockRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
      findAktiveByFahrzeugId: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ListAlarmierungenQueryHandler, { provide: ALARMIERUNG_REPOSITORY, useValue: mockRepo }],
    }).compile();
    handler = module.get(ListAlarmierungenQueryHandler);
  });

  it('liefert Alarmierungen DESC nach alarmierungszeit', async () => {
    const a1 = makeAggregate(new Date('2026-04-15T10:00:00Z'));
    const a2 = makeAggregate(new Date('2026-04-15T11:00:00Z'));
    const a3 = makeAggregate(new Date('2026-04-15T09:00:00Z'));
    mockRepo.findByEinsatzId.mockResolvedValue([a1, a2, a3]);

    const query = ListAlarmierungenQuery.create({ einsatzId: einsatzIdValue() }).value as ListAlarmierungenQuery;
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    const list = result.value as AlarmierungAggregate[];
    expect(list.map((a) => a.alarmierungszeit.getTime())).toEqual([new Date('2026-04-15T11:00:00Z').getTime(), new Date('2026-04-15T10:00:00Z').getTime(), new Date('2026-04-15T09:00:00Z').getTime()]);
  });

  it('liefert leere Liste wenn keine vorhanden', async () => {
    mockRepo.findByEinsatzId.mockResolvedValue([]);
    const query = ListAlarmierungenQuery.create({ einsatzId: einsatzIdValue() }).value as ListAlarmierungenQuery;
    const result = await handler.execute(query);
    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([]);
  });

  it('Query lehnt ungültiges take ab', () => {
    const r = ListAlarmierungenQuery.create({ einsatzId: 'a'.repeat(24), take: 999 });
    expect(r.isFailure).toBe(true);
  });

  it('Query lehnt negatives skip ab', () => {
    const r = ListAlarmierungenQuery.create({ einsatzId: 'a'.repeat(24), skip: -1 });
    expect(r.isFailure).toBe(true);
  });
});
