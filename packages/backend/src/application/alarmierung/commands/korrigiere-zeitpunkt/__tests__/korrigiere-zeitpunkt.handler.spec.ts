import { Test, type TestingModule } from '@nestjs/testing';
import { KorrigiereZeitpunktHandler } from '../korrigiere-zeitpunkt.handler';
import { KorrigiereZeitpunktCommand } from '../korrigiere-zeitpunkt.command';
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import type { AlarmierungEmpfaenger, ZeitpunktFeld } from '@domain/aggregates/alarmierung/alarmierung-empfaenger.entity';
import { AlarmierungZeitpunktKorrigiertEvent } from '@domain/events/alarmierung-zeitpunkt-korrigiert.event';
import { AlarmierungEmpfaengerId } from '@domain/value-objects/alarmierung-empfaenger-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { DomainEvent } from '@domain/common/domain-event';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ALARMIERUNG_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import {
  asPrismaService,
  createAlarmierungRepoMock,
  createOutboxRepoMock,
  createPrismaMock,
  type AlarmierungRepoMock,
  type OutboxRepoMock,
  type PrismaServiceMock,
} from '../../../__tests__/test-doubles';

function makeAggregateWithEmpfaenger(): { aggregate: AlarmierungAggregate; empfaengerId: AlarmierungEmpfaengerId } {
  const aggregate = AlarmierungAggregate.create({
    einsatzId: EinsatzId.create().value as EinsatzId,
    bezeichnung: 'Brand',
    alarmierungszeit: new Date('2026-04-15T10:00:00Z'),
    createdBy: 'system',
  }).value as AlarmierungAggregate;
  const addResult = aggregate.fuegeEmpfaengerHinzu({
    ref: { kind: 'fahrzeug', fahrzeugId: 'fz1' },
    nameSnapshot: 'Florian Mainz 12-1',
    createdBy: 'system',
  });
  aggregate.clearDomainEvents();
  const empfaenger = addResult.value as AlarmierungEmpfaenger;
  return { aggregate, empfaengerId: empfaenger.id };
}

describe('KorrigiereZeitpunktHandler', () => {
  let handler: KorrigiereZeitpunktHandler;
  let mockRepo: AlarmierungRepoMock;
  let mockOutbox: OutboxRepoMock;
  let mockPrisma: PrismaServiceMock;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepo = createAlarmierungRepoMock();
    mockOutbox = createOutboxRepoMock();
    mockPrisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KorrigiereZeitpunktHandler,
        { provide: PrismaService, useValue: asPrismaService(mockPrisma) },
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
    }).value as KorrigiereZeitpunktCommand;

    const result = await handler.execute(cmd);
    expect(result.isSuccess).toBe(true);
    const updated = result.value as AlarmierungAggregate;
    expect(updated.empfaenger[0]?.vorOrtAm).toEqual(new Date('2026-04-15T10:05:00Z'));
    const events = mockOutbox.save.mock.calls[0]?.[0] as DomainEvent[];
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
    }).value as KorrigiereZeitpunktCommand;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('alarmiertAm');
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('Command lehnt ungültiges Feld ab', () => {
    const r = KorrigiereZeitpunktCommand.create({
      alarmierungId: 'a'.repeat(24),
      empfaengerId: 'b'.repeat(24),
      feld: 'irgendwas' as ZeitpunktFeld,
      wert: new Date(),
      updatedBy: 'u',
    });
    expect(r.isFailure).toBe(true);
  });
});
