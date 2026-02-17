import { PrismaBefehlRepository } from '../prisma-befehl.repository';
import { PrismaBefehlMapper } from '../mappers/prisma-befehl.mapper';
import { Befehl } from '@domain/aggregates/befehl.aggregate';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { BefehlStatus } from '@domain/value-objects/befehl-status';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import type { Befehl as PrismaBefehl, BefehlEmpfaenger as PrismaBefehlEmpfaenger, BefehlKommentar as PrismaBefehlKommentar } from '@/generated/prisma/client';

type BefehlWithRelations = PrismaBefehl & {
  empfaenger: PrismaBefehlEmpfaenger[];
  kommentare: PrismaBefehlKommentar[];
};

/**
 * Unit Tests fuer PrismaBefehlRepository (AC8).
 *
 * Testet Repository-Methoden mit gemocktem PrismaService.
 * Mapper wird via jest.spyOn gemockt, um reine Repository-Logik zu testen.
 */
describe('PrismaBefehlRepository', () => {
  let repository: PrismaBefehlRepository;
  let mockPrismaService: {
    befehl: {
      upsert: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
  };

  const generateValidUserId = () => UserId.create().value!;
  const generateValidBefehlId = () => BefehlId.create().value! as BefehlId;
  const generateValidEinsatzId = () => EinsatzId.create().value! as EinsatzId;

  /**
   * Erstellt ein valides Befehl Domain Aggregate fuer Tests.
   */
  const createMockBefehl = (): Befehl => {
    const result = Befehl.create({
      einsatzId: generateValidEinsatzId(),
      auftrag: 'Patientenablage einrichten',
      befehlsgeberId: generateValidUserId(),
      erstellerId: generateValidUserId(),
      empfaengerIds: [generateValidUserId()],
      zeitvorgabe: '15 min',
    });
    return result.value!;
  };

  /**
   * Erstellt ein valides Prisma-Befehl-Record fuer findUnique/findMany Mocks.
   */
  const createPrismaBefehlRecord = (overrides: Partial<BefehlWithRelations> = {}): BefehlWithRelations => {
    const befehlId = generateValidBefehlId().value;
    const einsatzId = generateValidEinsatzId().value;
    const empfaengerId = generateValidUserId().value;

    return {
      id: befehlId,
      nummer: 'B2026-abcd1234',
      einsatzId,
      auftrag: 'Patientenablage einrichten',
      befehlsgeberId: generateValidUserId().value,
      erstellerId: generateValidUserId().value,
      status: 'ERTEILT',
      zeitvorgabe: '15 min',
      ereignis: null,
      mittel: null,
      ziel: null,
      weg: null,
      originalBefehlId: null,
      erteiltAm: new Date('2026-02-17T10:00:00.000Z'),
      createdAt: new Date('2026-02-17T10:00:00.000Z'),
      updatedAt: new Date('2026-02-17T10:00:00.000Z'),
      empfaenger: [
        {
          id: generateValidBefehlId().value,
          befehlId,
          empfaengerId,
          zugestelltAm: null,
          quittiertAm: null,
          quittierungArt: null,
          createdAt: new Date('2026-02-17T10:00:00.000Z'),
        } as PrismaBefehlEmpfaenger,
      ],
      kommentare: [],
      ...overrides,
    } as BefehlWithRelations;
  };

  beforeEach(() => {
    jest.restoreAllMocks();

    mockPrismaService = {
      befehl: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    repository = new PrismaBefehlRepository(mockPrismaService as any);
  });

  describe('save()', () => {
    it('should upsert befehl and return Result.ok on success', async () => {
      // Given
      const befehl = createMockBefehl();
      mockPrismaService.befehl.upsert.mockResolvedValue({});

      // When
      const result = await repository.save(befehl);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(mockPrismaService.befehl.upsert).toHaveBeenCalledTimes(1);

      const upsertCall = mockPrismaService.befehl.upsert.mock.calls[0][0];
      expect(upsertCall.where.id).toBe(befehl.id.value);
      expect(upsertCall.create).toBeDefined();
      expect(upsertCall.update).toBeDefined();
      // Verify nested write strategy
      expect(upsertCall.create.empfaenger).toBeDefined();
      expect(upsertCall.update.empfaenger.deleteMany).toBeDefined();
      expect(upsertCall.update.empfaenger.create).toBeDefined();
    });

    it('should return Result.fail on prisma error', async () => {
      // Given
      const befehl = createMockBefehl();
      mockPrismaService.befehl.upsert.mockRejectedValue(new Error('DB connection lost'));

      // When
      const result = await repository.save(befehl);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('DB connection lost');
    });

    it('should use transaction client when tx is provided', async () => {
      // Given
      const befehl = createMockBefehl();
      const mockTxClient = {
        befehl: {
          upsert: jest.fn().mockResolvedValue({}),
        },
      };

      // When
      const result = await repository.save(befehl, mockTxClient);

      // Then
      expect(result.isSuccess).toBe(true);
      // tx client should be used, NOT the default prisma service
      expect(mockTxClient.befehl.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.befehl.upsert).not.toHaveBeenCalled();
    });
  });

  describe('findById()', () => {
    it('should find befehl by id and return mapped domain aggregate', async () => {
      // Given
      const befehlId = generateValidBefehlId();
      const prismaRecord = createPrismaBefehlRecord({ id: befehlId.value });
      mockPrismaService.befehl.findUnique.mockResolvedValue(prismaRecord);

      // When
      const result = await repository.findById(befehlId);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeInstanceOf(Befehl);
      expect(result.value!.id.value).toBe(befehlId.value);

      // Verify correct prisma call with include
      expect(mockPrismaService.befehl.findUnique).toHaveBeenCalledWith({
        where: { id: befehlId.value },
        include: { empfaenger: true, kommentare: true },
      });
    });

    it('should return Result.ok(null) when befehl not found', async () => {
      // Given
      const befehlId = generateValidBefehlId();
      mockPrismaService.befehl.findUnique.mockResolvedValue(null);

      // When
      const result = await repository.findById(befehlId);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
    });

    it('should return Result.fail on prisma error', async () => {
      // Given
      const befehlId = generateValidBefehlId();
      mockPrismaService.befehl.findUnique.mockRejectedValue(new Error('Connection refused'));

      // When
      const result = await repository.findById(befehlId);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Connection refused');
    });
  });

  describe('findByEinsatzId()', () => {
    it('should find befehle by einsatzId with correct ordering and include', async () => {
      // Given
      const einsatzId = generateValidEinsatzId();
      const prismaRecord1 = createPrismaBefehlRecord({ einsatzId: einsatzId.value });
      const prismaRecord2 = createPrismaBefehlRecord({ einsatzId: einsatzId.value });
      mockPrismaService.befehl.findMany.mockResolvedValue([prismaRecord1, prismaRecord2]);

      // When
      const result = await repository.findByEinsatzId(einsatzId);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value![0]).toBeInstanceOf(Befehl);

      // Verify correct prisma call with orderBy and include
      expect(mockPrismaService.befehl.findMany).toHaveBeenCalledWith({
        where: { einsatzId: einsatzId.value },
        include: { empfaenger: true, kommentare: true },
        orderBy: { erteiltAm: 'desc' },
      });
    });

    it('should return empty array when no befehle found', async () => {
      // Given
      const einsatzId = generateValidEinsatzId();
      mockPrismaService.befehl.findMany.mockResolvedValue([]);

      // When
      const result = await repository.findByEinsatzId(einsatzId);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
    });

    it('should return Result.fail on prisma error', async () => {
      // Given
      const einsatzId = generateValidEinsatzId();
      mockPrismaService.befehl.findMany.mockRejectedValue(new Error('Timeout'));

      // When
      const result = await repository.findByEinsatzId(einsatzId);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Timeout');
    });
  });
});
