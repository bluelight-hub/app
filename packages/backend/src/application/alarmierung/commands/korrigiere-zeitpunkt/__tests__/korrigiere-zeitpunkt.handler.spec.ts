// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { KorrigiereZeitpunktHandler } from '../korrigiere-zeitpunkt.handler';
import { KorrigiereZeitpunktCommand } from '../korrigiere-zeitpunkt.command';
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import { AlarmierungZeitpunktKorrigiertEvent } from '@domain/events/alarmierung-zeitpunkt-korrigiert.event';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ALARMIERUNG_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';

function makeAggregateWithEmpfaenger() {
  const aggregate = AlarmierungAggregate.create({
    einsatzId: EinsatzId.create().value!,
    bezeichnung: 'Brand',
    alarmierungszeit: new Date('2026-04-15T10:00:00Z'),
    createdBy: 'system',
  }).value!;
  const addResult = aggregate.fuegeEmpfaengerHinzu({
    ref: { kind: 'fahrzeug', fahrzeugId: 'fz1' },
    nameSnapshot: 'Florian Mainz 12-1',
    createdBy: 'system',
  });
  aggregate.clearDomainEvents();
  return { aggregate, empfaengerId: addResult.value!.id };
}

describe('KorrigiereZeitpunktHandler', () => {
  let handler: KorrigiereZeitpunktHandler;
  let mockRepo: any;
  let mockOutbox: any;
  let mockPrisma: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepo = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByEinsatzId: jest.fn().mockResolvedValue([]),
      findAktiveByFahrzeugId: jest.fn().mockResolvedValue([]),
    };
    mockOutbox = { save: jest.fn().mockResolvedValue(undefined) };
    mockPrisma = { $transaction: jest.fn().mockImplementation(async (cb: any) => cb({})) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KorrigiereZeitpunktHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutbox },
        { provide: ALARMIERUNG_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    handler = module.get(KorrigiereZeitpunktHandler);
  });

  it('setzt vorOrtAm und emittiert Korrigiert-Event', async () => {
    const { aggregate, empfaengerId } = makeAggregateWithEmpfaenger();
    mockRepo.findById.mockResolvedValue(aggregate);

    const cmd = KorrigiereZeitpunktCommand.create({
      alarmierungId: aggregate.id.value,
      empfaengerId: empfaengerId.value,
      feld: 'vorOrtAm',
      wert: new Date('2026-04-15T10:05:00Z'),
      updatedBy: 'user-1',
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isSuccess).toBe(true);
    expect(result.value!.empfaenger[0]!.vorOrtAm).toEqual(new Date('2026-04-15T10:05:00Z'));
    const events = mockOutbox.save.mock.calls[0]?.[0] as unknown[];
    expect(events.some((e) => e instanceof AlarmierungZeitpunktKorrigiertEvent)).toBe(true);
  });

  it('schlägt fehl, wenn Wert vor alarmiertAm liegt', async () => {
    const { aggregate, empfaengerId } = makeAggregateWithEmpfaenger();
    mockRepo.findById.mockResolvedValue(aggregate);

    const cmd = KorrigiereZeitpunktCommand.create({
      alarmierungId: aggregate.id.value,
      empfaengerId: empfaengerId.value,
      feld: 'vorOrtAm',
      wert: new Date('2026-04-15T09:00:00Z'),
      updatedBy: 'user-1',
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('alarmiertAm');
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('Command lehnt ungültiges Feld ab', () => {
    const r = KorrigiereZeitpunktCommand.create({
      alarmierungId: 'a'.repeat(24),
      empfaengerId: 'b'.repeat(24),
      feld: 'irgendwas' as any,
      wert: new Date(),
      updatedBy: 'u',
    });
    expect(r.isFailure).toBe(true);
  });
});
