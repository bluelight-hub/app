// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { FmsStatusZuAlarmierungHandler } from '../fms-status-zu-alarmierung.handler';
import { FmsStatusGeaendertEvent } from '@domain/kraefte/events/fms-status-geaendert.event';
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { ALARMIERUNG_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';

function makeAggregateFor(fahrzeugId: string, einsatzId: EinsatzId, alarmierungszeit = new Date('2026-04-15T10:00:00Z')) {
  const aggregate = AlarmierungAggregate.create({
    einsatzId,
    bezeichnung: 'Brand',
    alarmierungszeit,
    createdBy: 'system',
  }).value!;
  aggregate.fuegeEmpfaengerHinzu({
    ref: { kind: 'fahrzeug', fahrzeugId },
    nameSnapshot: 'Florian Mainz 12-1',
    createdBy: 'system',
  });
  aggregate.clearDomainEvents();
  return aggregate;
}

describe('FmsStatusZuAlarmierungHandler', () => {
  let handler: FmsStatusZuAlarmierungHandler;
  let mockRepo: any;
  let mockLogger: any;
  let einsatzId: EinsatzId;

  beforeEach(async () => {
    jest.clearAllMocks();
    einsatzId = EinsatzId.create().value!;
    mockRepo = {
      save: jest.fn().mockResolvedValue(undefined),
      findAktiveByFahrzeugId: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
    };
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FmsStatusZuAlarmierungHandler, { provide: ALARMIERUNG_REPOSITORY, useValue: mockRepo }, { provide: LOGGER, useValue: mockLogger }],
    }).compile();
    handler = module.get(FmsStatusZuAlarmierungHandler);
  });

  it('setzt vorOrtAm bei FMS-Status 4 auf alle aktiven Alarmierungen', async () => {
    const a1 = makeAggregateFor('fz1', einsatzId);
    mockRepo.findAktiveByFahrzeugId.mockResolvedValue([a1]);

    const event = new FmsStatusGeaendertEvent('fz1', einsatzId.value, 'Florian Mainz 12-1', 3, 4, 'user-1');
    await handler.handle(event);

    expect(a1.empfaenger[0]!.vorOrtAm).toBeInstanceOf(Date);
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });

  it('macht nichts, wenn keine aktive Alarmierung existiert', async () => {
    mockRepo.findAktiveByFahrzeugId.mockResolvedValue([]);
    const event = new FmsStatusGeaendertEvent('fz1', einsatzId.value, 'Florian', 3, 4, 'user-1');
    await handler.handle(event);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('verarbeitet mehrere Aggregate hintereinander', async () => {
    const a1 = makeAggregateFor('fz1', einsatzId);
    const a2 = makeAggregateFor('fz1', einsatzId);
    mockRepo.findAktiveByFahrzeugId.mockResolvedValue([a1, a2]);

    const event = new FmsStatusGeaendertEvent('fz1', einsatzId.value, 'Florian', 3, 4, 'user-1');
    await handler.handle(event);

    expect(mockRepo.save).toHaveBeenCalledTimes(2);
  });

  it('propagiert keine Exceptions (Fire-and-Forget)', async () => {
    mockRepo.findAktiveByFahrzeugId.mockRejectedValue(new Error('DB down'));
    const event = new FmsStatusGeaendertEvent('fz1', einsatzId.value, 'Florian', 3, 4, 'user-1');
    await expect(handler.handle(event)).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
