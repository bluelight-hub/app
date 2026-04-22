import type { PrismaService } from '@/infrastructure/database/prisma.service';
import { PrismaRollenBesetzungRepository } from '../prisma-rollen-besetzung.repository';
import { PrismaRollenBesetzungMapper } from '../../mappers/prisma-rollen-besetzung.mapper';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';

/**
 * Unit-Tests für PrismaRollenBesetzungRepository — Fokus auf die in Story 1.3
 * ergänzte Methode `findActiveByUserIdAndEinsatzId` (Membership-Check für
 * `EinsatzScopeGuard`, AC1, AC6, AC7 Task 1 Szenarien a–d).
 *
 * **Scope dieser Spec:**
 * - Nur neue Methode getestet (bestehende `save/findById/findByEinsatzId/delete`
 *   haben ihre eigene Integrationstest-Abdeckung in `__tests__/prisma-schema-rollenbesetzung.integration.spec.ts`).
 *
 * **Mocking-Strategie:**
 * - `PrismaService` vollständig gemockt (nur `einsatzRollenbesetzung.findMany` relevant).
 * - `PrismaRollenBesetzungMapper.toDomain` gemockt pro Test, um Mapper-Fehler
 *   vs. Repository-Fehler sauber zu trennen.
 * - `ILogger`: Mock mit `warn`/`error` zur Regress-Assertion.
 */
describe('PrismaRollenBesetzungRepository — findActiveByUserIdAndEinsatzId', () => {
  let repository: PrismaRollenBesetzungRepository;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockLogger: jest.Mocked<ILogger>;

  const mockUserId = 'clw3h8x9y0000qwertyui00099';
  const mockEinsatzId = 'clw3h8x9y0000qwertyui00002';
  const mockBesetzungId = 'clw3h8x9y0000qwertyui00500';

  const createPrismaEntity = (overrides?: { id?: string; freigegebenAm?: Date | null; rollenName?: string }) => ({
    id: overrides?.id ?? mockBesetzungId,
    einsatzId: mockEinsatzId,
    rollenDefinitionId: 'clw3h8x9y0000qwertyui00800',
    personId: 'clw3h8x9y0000qwertyui00700',
    rollenName: overrides?.rollenName ?? 'Eigenschutz: Sicherheitsbeauftragter',
    personVorname: 'Max',
    personNachname: 'Mustermann',
    createdAt: new Date('2026-04-21T08:00:00Z'),
    createdBy: mockUserId,
    updatedAt: new Date('2026-04-21T08:00:00Z'),
    updatedBy: null,
    freigegebenAm: overrides?.freigegebenAm ?? null,
    freigegebenVon: null,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

    mockPrismaService = {
      einsatzRollenbesetzung: {
        findMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as jest.Mocked<ILogger>;

    repository = new PrismaRollenBesetzungRepository(mockPrismaService, mockLogger);
  });

  it('(a) findet aktive Rollenbesetzung für (userId, einsatzId) via 3-stufigen Join-Pfad', async () => {
    const entity = createPrismaEntity();
    mockPrismaService.einsatzRollenbesetzung.findMany.mockResolvedValue([entity]);

    const toDomainSpy = jest.spyOn(PrismaRollenBesetzungMapper, 'toDomain').mockReturnValue(
      Result.ok({
        id: { value: entity.id },
        einsatzId: { value: entity.einsatzId },
        rollenName: entity.rollenName,
      }) as unknown as ReturnType<typeof PrismaRollenBesetzungMapper.toDomain>,
    );

    const result = await repository.findActiveByUserIdAndEinsatzId(mockUserId, mockEinsatzId);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toHaveLength(1);
    expect(mockPrismaService.einsatzRollenbesetzung.findMany).toHaveBeenCalledWith({
      where: {
        einsatzId: mockEinsatzId,
        freigegebenAm: null,
        person: {
          stamm: {
            userAccount: { id: mockUserId },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    expect(toDomainSpy).toHaveBeenCalledWith(entity);
  });

  it('(b) filtert freigegebene (abgelaufene) Besetzungen aus — DB filtert, leeres Array', async () => {
    // Repository gibt Prisma-Layer die WHERE-Klausel `freigegebenAm: null` mit.
    // Bei rein freigegebenen Besetzungen liefert Prisma ein leeres Array zurück.
    mockPrismaService.einsatzRollenbesetzung.findMany.mockResolvedValue([]);

    const result = await repository.findActiveByUserIdAndEinsatzId(mockUserId, mockEinsatzId);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([]);
    expect(mockPrismaService.einsatzRollenbesetzung.findMany.mock.calls[0][0].where.freigegebenAm).toBeNull();
  });

  it('(c) ungültige / unbekannte einsatzId → Prisma liefert leer, KEIN Throw', async () => {
    mockPrismaService.einsatzRollenbesetzung.findMany.mockResolvedValue([]);

    const result = await repository.findActiveByUserIdAndEinsatzId(mockUserId, 'not-a-valid-einsatz-id');

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([]);
  });

  it('(d) User ohne stammpersonId → Join findet nichts, leeres Array (kein expliziter null-Check)', async () => {
    mockPrismaService.einsatzRollenbesetzung.findMany.mockResolvedValue([]);

    const result = await repository.findActiveByUserIdAndEinsatzId('user-without-stamm', mockEinsatzId);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([]);
    expect(mockPrismaService.einsatzRollenbesetzung.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          person: { stamm: { userAccount: { id: 'user-without-stamm' } } },
        }),
      }),
    );
  });

  it('skipt Entities mit fehlgeschlagenem Mapper und loggt Warnung (Defense-in-Depth)', async () => {
    const entities = [createPrismaEntity({ id: 'clw3h8x9y0000qwertyui00501' }), createPrismaEntity({ id: 'clw3h8x9y0000qwertyui00502' })];
    mockPrismaService.einsatzRollenbesetzung.findMany.mockResolvedValue(entities);

    const toDomainSpy = jest.spyOn(PrismaRollenBesetzungMapper, 'toDomain');
    toDomainSpy.mockReturnValueOnce(Result.fail('invalid id') as unknown as ReturnType<typeof PrismaRollenBesetzungMapper.toDomain>);
    toDomainSpy.mockReturnValueOnce(
      Result.ok({
        id: { value: entities[1].id },
        rollenName: entities[1].rollenName,
      }) as unknown as ReturnType<typeof PrismaRollenBesetzungMapper.toDomain>,
    );

    const result = await repository.findActiveByUserIdAndEinsatzId(mockUserId, mockEinsatzId);

    expect(result.isSuccess).toBe(true);
    expect(result.value).toHaveLength(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to map RollenBesetzung'), 'RollenBesetzungRepository');
  });

  it('mappt unerwartete Prisma-Errors über handlePrismaError (rethrow unbekannte Errors)', async () => {
    const unknownError = new Error('DB gone');
    mockPrismaService.einsatzRollenbesetzung.findMany.mockRejectedValue(unknownError);

    await expect(repository.findActiveByUserIdAndEinsatzId(mockUserId, mockEinsatzId)).rejects.toThrow('DB gone');
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('findActiveByUserIdAndEinsatzId'));
  });

  it('P2023 (Inconsistent Column Data, z. B. überlange einsatzId) → Result.ok([]) statt Throw (AC6 keine 500-Leaks)', async () => {
    const p2023 = Object.assign(new Error('Inconsistent column data'), {
      code: 'P2023',
      clientVersion: '7.7.0',
      meta: {},
    });
    mockPrismaService.einsatzRollenbesetzung.findMany.mockRejectedValue(p2023);

    const result = await repository.findActiveByUserIdAndEinsatzId(mockUserId, 'this-id-does-not-match-cuid-format-too-long');

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([]);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Prisma validation rejected einsatzId'), 'RollenBesetzungRepository');
  });

  it('P2009 (Query Validation) → Result.ok([]) (AC6-Pfad)', async () => {
    const p2009 = Object.assign(new Error('Validation error'), {
      code: 'P2009',
      clientVersion: '7.7.0',
      meta: {},
    });
    mockPrismaService.einsatzRollenbesetzung.findMany.mockRejectedValue(p2009);

    const result = await repository.findActiveByUserIdAndEinsatzId(mockUserId, '');

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Flächen-Coverage für die bereits vor Story 1.3 existierenden Methoden.
  // Die komplette Story-1.3-Port-Erweiterung erfordert laut AC7 ≥ 80 % Coverage
  // für `prisma-rollen-besetzung.repository.ts`. Die bestehenden Methoden haben
  // ihre primäre Coverage im `prisma-schema-rollenbesetzung.integration.spec.ts`
  // (Real-DB); hier ergänzen wir schnelle Happy-Path-Unit-Tests, damit die
  // Unit-Coverage der Datei den 80-%-Threshold sichert.
  // ---------------------------------------------------------------------------

  describe('Bestandsmethoden — Happy-Path + Error-Handling', () => {
    beforeEach(() => {
      mockPrismaService.einsatzRollenbesetzung = {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      } as unknown as typeof mockPrismaService.einsatzRollenbesetzung;
    });

    function createAggregate(id = mockBesetzungId) {
      return {
        id: { value: id },
      };
    }

    function createRollenBesetzungId(id = mockBesetzungId) {
      return { value: id };
    }

    function createEinsatzIdVo() {
      return { value: mockEinsatzId };
    }

    function createRolleIdVo() {
      return { value: 'clw3h8x9y0000qwertyui00800' };
    }

    it('save(): neue Besetzung → create-Pfad', async () => {
      mockPrismaService.einsatzRollenbesetzung.findUnique.mockResolvedValue(null);
      mockPrismaService.einsatzRollenbesetzung.create.mockResolvedValue(createPrismaEntity());
      jest.spyOn(PrismaRollenBesetzungMapper, 'toPersistence').mockReturnValue({ id: mockBesetzungId } as unknown as ReturnType<typeof PrismaRollenBesetzungMapper.toPersistence>);

      const result = await repository.save(createAggregate() as unknown as Parameters<typeof repository.save>[0]);

      expect(result.isSuccess).toBe(true);
      expect(mockPrismaService.einsatzRollenbesetzung.create).toHaveBeenCalled();
    });

    it('save(): bestehende Besetzung → update-Pfad (Optimistic Locking Success)', async () => {
      mockPrismaService.einsatzRollenbesetzung.findUnique.mockResolvedValue(createPrismaEntity());
      mockPrismaService.einsatzRollenbesetzung.updateMany.mockResolvedValue({ count: 1 });
      jest.spyOn(PrismaRollenBesetzungMapper, 'toUpdatePersistence').mockReturnValue({} as unknown as ReturnType<typeof PrismaRollenBesetzungMapper.toUpdatePersistence>);

      const result = await repository.save(createAggregate() as unknown as Parameters<typeof repository.save>[0]);

      expect(result.isSuccess).toBe(true);
      expect(mockPrismaService.einsatzRollenbesetzung.updateMany).toHaveBeenCalled();
    });

    it('save(): Optimistic-Lock-Fail (count=0) → BEREITS_FREIGEGEBEN', async () => {
      mockPrismaService.einsatzRollenbesetzung.findUnique.mockResolvedValue(createPrismaEntity());
      mockPrismaService.einsatzRollenbesetzung.updateMany.mockResolvedValue({ count: 0 });
      jest.spyOn(PrismaRollenBesetzungMapper, 'toUpdatePersistence').mockReturnValue({} as unknown as ReturnType<typeof PrismaRollenBesetzungMapper.toUpdatePersistence>);

      const result = await repository.save(createAggregate() as unknown as Parameters<typeof repository.save>[0]);

      expect(result.isFailure).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Optimistic locking failed'), expect.any(String));
    });

    it('findById(): Entity gefunden → Result.ok via Mapper', async () => {
      mockPrismaService.einsatzRollenbesetzung.findUnique.mockResolvedValue(createPrismaEntity());
      jest.spyOn(PrismaRollenBesetzungMapper, 'toDomain').mockReturnValue(Result.ok({ id: { value: mockBesetzungId } }) as unknown as ReturnType<typeof PrismaRollenBesetzungMapper.toDomain>);

      const result = await repository.findById(createRollenBesetzungId() as unknown as Parameters<typeof repository.findById>[0]);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
    });

    it('findById(): Entity NICHT gefunden → Result.ok(null)', async () => {
      mockPrismaService.einsatzRollenbesetzung.findUnique.mockResolvedValue(null);

      const result = await repository.findById(createRollenBesetzungId() as unknown as Parameters<typeof repository.findById>[0]);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
    });

    it('findByEinsatzId(): liefert Liste aktiver Besetzungen', async () => {
      const entities = [createPrismaEntity({ id: 'clw3h8x9y0000qwertyui00510' }), createPrismaEntity({ id: 'clw3h8x9y0000qwertyui00511' })];
      mockPrismaService.einsatzRollenbesetzung.findMany.mockResolvedValue(entities);

      const toDomainSpy = jest.spyOn(PrismaRollenBesetzungMapper, 'toDomain');
      toDomainSpy
        .mockReturnValueOnce(Result.ok({ id: { value: entities[0].id } }) as unknown as ReturnType<typeof PrismaRollenBesetzungMapper.toDomain>)
        .mockReturnValueOnce(Result.ok({ id: { value: entities[1].id } }) as unknown as ReturnType<typeof PrismaRollenBesetzungMapper.toDomain>);

      const result = await repository.findByEinsatzId(createEinsatzIdVo() as unknown as Parameters<typeof repository.findByEinsatzId>[0]);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(mockPrismaService.einsatzRollenbesetzung.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ einsatzId: mockEinsatzId, freigegebenAm: null }),
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('findByEinsatzId(): skippt Mapper-Failures und loggt Warnung', async () => {
      const entities = [createPrismaEntity(), createPrismaEntity({ id: 'clw3h8x9y0000qwertyui00512' })];
      mockPrismaService.einsatzRollenbesetzung.findMany.mockResolvedValue(entities);

      const toDomainSpy = jest.spyOn(PrismaRollenBesetzungMapper, 'toDomain');
      toDomainSpy.mockReturnValueOnce(Result.fail('invalid id') as unknown as ReturnType<typeof PrismaRollenBesetzungMapper.toDomain>);
      toDomainSpy.mockReturnValueOnce(Result.ok({ id: { value: entities[1].id } }) as unknown as ReturnType<typeof PrismaRollenBesetzungMapper.toDomain>);

      const result = await repository.findByEinsatzId(createEinsatzIdVo() as unknown as Parameters<typeof repository.findByEinsatzId>[0]);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to map RollenBesetzung'), 'RollenBesetzungRepository');
    });

    it('findByEinsatzIdAndRolleId(): Besetzung gefunden', async () => {
      mockPrismaService.einsatzRollenbesetzung.findFirst.mockResolvedValue(createPrismaEntity());
      jest.spyOn(PrismaRollenBesetzungMapper, 'toDomain').mockReturnValue(Result.ok({ id: { value: mockBesetzungId } }) as unknown as ReturnType<typeof PrismaRollenBesetzungMapper.toDomain>);

      const result = await repository.findByEinsatzIdAndRolleId(
        createEinsatzIdVo() as unknown as Parameters<typeof repository.findByEinsatzIdAndRolleId>[0],
        createRolleIdVo() as unknown as Parameters<typeof repository.findByEinsatzIdAndRolleId>[1],
      );

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
    });

    it('findByEinsatzIdAndRolleId(): keine aktive Besetzung → Result.ok(null)', async () => {
      mockPrismaService.einsatzRollenbesetzung.findFirst.mockResolvedValue(null);

      const result = await repository.findByEinsatzIdAndRolleId(
        createEinsatzIdVo() as unknown as Parameters<typeof repository.findByEinsatzIdAndRolleId>[0],
        createRolleIdVo() as unknown as Parameters<typeof repository.findByEinsatzIdAndRolleId>[1],
      );

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
    });

    it('delete(): erfolgreicher Delete → Result.ok', async () => {
      mockPrismaService.einsatzRollenbesetzung.delete.mockResolvedValue(createPrismaEntity());

      const result = await repository.delete(createRollenBesetzungId() as unknown as Parameters<typeof repository.delete>[0]);

      expect(result.isSuccess).toBe(true);
      expect(mockPrismaService.einsatzRollenbesetzung.delete).toHaveBeenCalledWith({
        where: { id: mockBesetzungId },
      });
    });

    it('handlePrismaError: P2002 (Unique Violation) → ROLLE_ALREADY_BESETZT', async () => {
      const p2002 = Object.assign(new Error('Unique constraint'), {
        code: 'P2002',
        clientVersion: '7.7.0',
        meta: { target: ['einsatzId_rollenDefinitionId'] },
      });
      // Prisma-Error-Typcheck erfordert den Klassennamen PrismaClientKnownRequestError.
      Object.setPrototypeOf(p2002, { constructor: { name: 'PrismaClientKnownRequestError' } });
      // Workaround: isPrismaError prüft `error.code`. Dem Mock reicht das Feld.
      mockPrismaService.einsatzRollenbesetzung.findUnique.mockRejectedValue(p2002);

      const result = await repository.findById(createRollenBesetzungId() as unknown as Parameters<typeof repository.findById>[0]);

      expect(result.isFailure).toBe(true);
    });

    it('handlePrismaError: P2003 (FK Violation, fieldName=personId) → PERSON_NOT_FOUND', async () => {
      const p2003 = Object.assign(new Error('FK constraint'), {
        code: 'P2003',
        clientVersion: '7.7.0',
        meta: { field_name: 'EinsatzRollenbesetzung_personId_fkey' },
      });
      mockPrismaService.einsatzRollenbesetzung.findUnique.mockRejectedValue(p2003);

      const result = await repository.findById(createRollenBesetzungId() as unknown as Parameters<typeof repository.findById>[0]);

      expect(result.isFailure).toBe(true);
    });

    it('handlePrismaError: P2003 (FK Violation, fieldName=rollenDefinitionId) → ROLLE_NOT_FOUND', async () => {
      const p2003 = Object.assign(new Error('FK constraint'), {
        code: 'P2003',
        clientVersion: '7.7.0',
        meta: { field_name: 'EinsatzRollenbesetzung_rollenDefinitionId_fkey' },
      });
      mockPrismaService.einsatzRollenbesetzung.findUnique.mockRejectedValue(p2003);

      const result = await repository.findById(createRollenBesetzungId() as unknown as Parameters<typeof repository.findById>[0]);

      expect(result.isFailure).toBe(true);
    });

    it('handlePrismaError: P2003 (FK Violation, Default-Fall einsatzId) → INVALID_EINSATZ_CONTEXT', async () => {
      const p2003 = Object.assign(new Error('FK constraint'), {
        code: 'P2003',
        clientVersion: '7.7.0',
        meta: { field_name: 'EinsatzRollenbesetzung_einsatzId_fkey' },
      });
      mockPrismaService.einsatzRollenbesetzung.findUnique.mockRejectedValue(p2003);

      const result = await repository.findById(createRollenBesetzungId() as unknown as Parameters<typeof repository.findById>[0]);

      expect(result.isFailure).toBe(true);
    });

    it('handlePrismaError: P2025 (Record not found) → RECORD_NOT_FOUND', async () => {
      const p2025 = Object.assign(new Error('Record not found'), {
        code: 'P2025',
        clientVersion: '7.7.0',
        meta: {},
      });
      mockPrismaService.einsatzRollenbesetzung.delete.mockRejectedValue(p2025);

      const result = await repository.delete(createRollenBesetzungId() as unknown as Parameters<typeof repository.delete>[0]);

      expect(result.isFailure).toBe(true);
    });
  });
});
