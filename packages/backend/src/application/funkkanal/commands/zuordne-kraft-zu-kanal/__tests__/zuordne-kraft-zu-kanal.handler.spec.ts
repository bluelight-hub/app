// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { ZuordneKraftZuKanalHandler } from '../zuordne-kraft-zu-kanal.handler';
import { ZuordneKraftZuKanalCommand } from '../zuordne-kraft-zu-kanal.command';
import { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import { FunkkanalZuordnungErstelltEvent } from '@domain/events/funkkanal-zuordnung-erstellt.event';
import { Result } from '@domain/common/result';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { EinsatzFahrzeugId } from '@domain/kraefte/value-objects/einsatz-fahrzeug-id';
import { EinsatzPersonId } from '@domain/kraefte/value-objects/einsatz-person-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUNKKANAL_REPOSITORY, KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';

describe('ZuordneKraftZuKanalHandler', () => {
  let handler: ZuordneKraftZuKanalHandler;
  let mockRepo: jest.Mocked<IFunkkanalRepository>;
  let mockOutbox: jest.Mocked<IOutboxRepository>;
  let mockPrisma: { $transaction: jest.Mock };
  let mockFahrzeugRepo: { findById: jest.Mock };
  let mockPersonRepo: { findById: jest.Mock };
  let mockEinheitRepo: { findById: jest.Mock };

  const userId = () => UserId.create().value!.toString();

  const make = () =>
    FunkkanalAggregate.create({
      einsatzId: EinsatzId.create().value!,
      name: 'K',
      details: { type: 'tmo', sprechgruppe: 'SG' },
      sortIndex: 0,
    }).value!;

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
    mockFahrzeugRepo = { findById: jest.fn() };
    mockPersonRepo = { findById: jest.fn() };
    mockEinheitRepo = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZuordneKraftZuKanalHandler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutbox },
        { provide: FUNKKANAL_REPOSITORY, useValue: mockRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG, useValue: mockFahrzeugRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_PERSON, useValue: mockPersonRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT, useValue: mockEinheitRepo },
      ],
    }).compile();

    handler = module.get(ZuordneKraftZuKanalHandler);
  });

  it('ordnet Fahrzeug zu und übernimmt Funkrufname als Snapshot', async () => {
    const a = make();
    a.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(a);
    const fahrzeugId = EinsatzFahrzeugId.create().value!.toString();
    mockFahrzeugRepo.findById.mockResolvedValue(Result.ok({ funkrufname: 'Florian 1' } as any));

    const cmd = ZuordneKraftZuKanalCommand.create({
      kanalId: a.id.value,
      kraft: { kind: 'fahrzeug', fahrzeugId },
      rolle: 'primaer',
      userId: userId(),
    }).value!;

    const result = await handler.execute(cmd);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.zuordnungen.length).toBe(1);
    expect(result.value!.zuordnungen[0].rufnameSnapshot).toBe('Florian 1');
    const events = mockOutbox.save.mock.calls[0]?.[0] as unknown[];
    expect(events[0]).toBeInstanceOf(FunkkanalZuordnungErstelltEvent);
  });

  it('ordnet Person zu und fällt auf Vorname+Nachname zurück', async () => {
    const a = make();
    a.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(a);
    const personId = EinsatzPersonId.create().value!.toString();
    mockPersonRepo.findById.mockResolvedValue(Result.ok({ funkrufname: undefined, vorname: 'Max', nachname: 'Mustermann' } as any));

    const cmd = ZuordneKraftZuKanalCommand.create({
      kanalId: a.id.value,
      kraft: { kind: 'person', personId },
      rolle: 'zuhoeren',
      userId: userId(),
    }).value!;

    const result = await handler.execute(cmd);

    expect(result.isSuccess).toBe(true);
    expect(result.value!.zuordnungen[0].rufnameSnapshot).toBe('Max Mustermann');
  });

  it('ordnet Einheit zu mit Name als Rufnamen', async () => {
    const a = make();
    a.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(a);
    mockEinheitRepo.findById.mockResolvedValue(Result.ok({ name: 'ZTrupp' } as any));

    const cmd = ZuordneKraftZuKanalCommand.create({
      kanalId: a.id.value,
      kraft: { kind: 'einheit', einheitId: 'a'.repeat(24) },
      rolle: 'sekundaer',
      userId: userId(),
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isSuccess).toBe(true);
    expect(result.value!.zuordnungen[0].rufnameSnapshot).toBe('ZTrupp');
  });

  it('meldet Fehler bei nicht existierendem Fahrzeug', async () => {
    const a = make();
    mockRepo.findById.mockResolvedValue(a);
    mockFahrzeugRepo.findById.mockResolvedValue(Result.ok(null));

    const cmd = ZuordneKraftZuKanalCommand.create({
      kanalId: a.id.value,
      kraft: { kind: 'fahrzeug', fahrzeugId: EinsatzFahrzeugId.create().value!.toString() },
      rolle: 'primaer',
      userId: userId(),
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('lehnt Zuordnung bei archiviertem Kanal ab', async () => {
    const a = make();
    a.archive(userId());
    a.clearDomainEvents();
    mockRepo.findById.mockResolvedValue(a);
    mockFahrzeugRepo.findById.mockResolvedValue(Result.ok({ funkrufname: 'X' } as any));

    const cmd = ZuordneKraftZuKanalCommand.create({
      kanalId: a.id.value,
      kraft: { kind: 'fahrzeug', fahrzeugId: EinsatzFahrzeugId.create().value!.toString() },
      rolle: 'primaer',
      userId: userId(),
    }).value!;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
  });

  describe('Command Validation', () => {
    it('lehnt ungültige Rolle ab', () => {
      const r = ZuordneKraftZuKanalCommand.create({
        kanalId: 'a'.repeat(24),
        kraft: { kind: 'fahrzeug', fahrzeugId: 'f' },
        rolle: 'irgendwas' as any,
        userId: userId(),
      });
      expect(r.isFailure).toBe(true);
    });

    it('verlangt kraft-Id', () => {
      const r = ZuordneKraftZuKanalCommand.create({
        kanalId: 'a'.repeat(24),
        kraft: { kind: 'person', personId: '' },
        rolle: 'primaer',
        userId: userId(),
      });
      expect(r.isFailure).toBe(true);
    });
  });
});
