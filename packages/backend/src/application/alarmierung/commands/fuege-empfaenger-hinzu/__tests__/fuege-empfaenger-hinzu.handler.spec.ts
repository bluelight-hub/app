// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { FuegeEmpfaengerHinzuHandler } from '../fuege-empfaenger-hinzu.handler';
import { FuegeEmpfaengerHinzuCommand } from '../fuege-empfaenger-hinzu.command';
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import { AlarmierungEmpfaengerHinzugefuegtEvent } from '@domain/events/alarmierung-empfaenger-hinzugefuegt.event';
import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { Result } from '@domain/common/result';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ALARMIERUNG_REPOSITORY, KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';

function makeAggregate() {
  const einsatzId = EinsatzId.create().value!;
  const aggregate = AlarmierungAggregate.create({
    einsatzId,
    bezeichnung: 'Brand',
    createdBy: 'system',
  }).value!;
  // clear initial events so we only inspect the new ones
  aggregate.clearDomainEvents();
  return aggregate;
}

describe('FuegeEmpfaengerHinzuHandler', () => {
  let handler: FuegeEmpfaengerHinzuHandler;
  let mockRepo: any;
  let mockOutbox: any;
  let mockPrisma: any;
  let mockFahrzeugRepo: any;
  let mockPersonRepo: any;
  let mockEinheitRepo: any;

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
    mockFahrzeugRepo = { findById: jest.fn().mockResolvedValue(Result.ok({ funkrufname: 'Florian Mainz 12-1' })) };
    mockPersonRepo = { findById: jest.fn().mockResolvedValue(Result.ok({ funkrufname: undefined, vorname: 'Anna', nachname: 'B.' })) };
    mockEinheitRepo = { findById: jest.fn().mockResolvedValue(Result.ok({ name: 'Zug 1' })) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FuegeEmpfaengerHinzuHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutbox },
        { provide: ALARMIERUNG_REPOSITORY, useValue: mockRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG, useValue: mockFahrzeugRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_PERSON, useValue: mockPersonRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT, useValue: mockEinheitRepo },
      ],
    }).compile();

    handler = module.get(FuegeEmpfaengerHinzuHandler);
  });

  it('fügt Fahrzeug-Empfänger hinzu und emittiert Event', async () => {
    const aggregate = makeAggregate();
    mockRepo.findById.mockResolvedValue(aggregate);

    const cmd = FuegeEmpfaengerHinzuCommand.create({
      alarmierungId: aggregate.id.value,
      empfaenger: { kind: 'fahrzeug', fahrzeugId: 'fz1' },
      createdBy: 'user-1',
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isSuccess).toBe(true);
    expect(result.value!.empfaenger).toHaveLength(1);
    expect(result.value!.empfaenger[0]!.nameSnapshot).toBe('Florian Mainz 12-1');
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    const events = mockOutbox.save.mock.calls[0]?.[0] as unknown[];
    expect(events.some((e) => e instanceof AlarmierungEmpfaengerHinzugefuegtEvent)).toBe(true);
  });

  it('schlägt fehl, wenn die Alarmierung nicht existiert', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const cmd = FuegeEmpfaengerHinzuCommand.create({
      alarmierungId: AlarmierungId.create().value!.value,
      empfaenger: { kind: 'fahrzeug', fahrzeugId: 'fz1' },
      createdBy: 'user-1',
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('nicht gefunden');
  });

  it('lehnt doppelten Empfänger ab', async () => {
    const aggregate = makeAggregate();
    aggregate.fuegeEmpfaengerHinzu({ ref: { kind: 'fahrzeug', fahrzeugId: 'fz1' }, nameSnapshot: 'Florian Mainz 12-1', createdBy: 'system' });
    aggregate.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(aggregate);

    const cmd = FuegeEmpfaengerHinzuCommand.create({
      alarmierungId: aggregate.id.value,
      empfaenger: { kind: 'fahrzeug', fahrzeugId: 'fz1' },
      createdBy: 'user-1',
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('bereits zugeordnet');
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('Command lehnt fehlende empfaenger-ID ab', () => {
    const r = FuegeEmpfaengerHinzuCommand.create({
      alarmierungId: 'a'.repeat(24),
      empfaenger: { kind: 'fahrzeug', fahrzeugId: '   ' },
      createdBy: 'u',
    });
    expect(r.isFailure).toBe(true);
  });
});
