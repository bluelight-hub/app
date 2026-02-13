import { Test, type TestingModule } from '@nestjs/testing';
import { GetAllVorlagenHandler } from '../get-all-vorlagen.handler';
import { Erinnerungsvorlage } from '@domain/erinnerungsvorlage/entities/erinnerungsvorlage.entity';
import { ErinnerungsvorlageId } from '@domain/erinnerungsvorlage/value-objects/erinnerungsvorlage-id';
import { ErinnerungsvorlageTitel } from '@domain/erinnerungsvorlage/value-objects/erinnerungsvorlage-titel';
import { UserId } from '@domain/value-objects/user-id';
import { ERINNERUNGSVORLAGE_REPOSITORY } from '@/infrastructure/di-tokens';
import type { IErinnerungsvorlageRepository } from '@domain/erinnerungsvorlage/repositories/i-erinnerungsvorlage.repository';
import { ErinnerungsvorlageResponseFactory } from '../../../dto/erinnerungsvorlage-response.factory';

/**
 * Helper: Erstellt eine rekonstruierte Erinnerungsvorlage für Tests.
 *
 * Nutzt reconstruct() da wir keine Domain-Events emittieren wollen.
 */
function createMockVorlage(overrides?: { titel?: string; minuten?: number; beschreibung?: string | null; createdAt?: Date; updatedAt?: Date }): Erinnerungsvorlage {
  const id = ErinnerungsvorlageId.create().value! as ErinnerungsvorlageId;
  const titel = ErinnerungsvorlageTitel.create(overrides?.titel ?? 'Test Vorlage').value!;
  const createdBy = UserId.create().value!;
  const now = new Date();

  return Erinnerungsvorlage.reconstruct({
    id,
    titel,
    minuten: overrides?.minuten ?? 30,
    beschreibung: overrides?.beschreibung ?? null,
    createdBy,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
  });
}

/**
 * Unit Tests für GetAllVorlagenHandler.
 *
 * Testet den Query Handler gemäß AAA Pattern mit Given-When-Then Kommentaren.
 * Nutzt Mock Repository für Unit Test Isolation (AC6 Compliance).
 *
 * **Test Coverage:**
 * - Happy Path: Alle Vorlagen abrufen
 * - Empty Result: Keine Vorlagen vorhanden
 * - ResponseFactory Nutzung
 */
describe('GetAllVorlagenHandler', () => {
  let handler: GetAllVorlagenHandler;
  let mockVorlageRepository: jest.Mocked<IErinnerungsvorlageRepository>;
  let mockResponseFactory: jest.Mocked<ErinnerungsvorlageResponseFactory>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Repository für Erinnerungsvorlagen
    mockVorlageRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      exists: jest.fn(),
    } as jest.Mocked<IErinnerungsvorlageRepository>;

    // Mock ResponseFactory
    mockResponseFactory = {
      create: jest.fn().mockImplementation((vorlage) => ({
        id: vorlage.id.toString(),
        titel: vorlage.titel.value,
        minuten: vorlage.minuten,
        beschreibung: vorlage.beschreibung,
        createdBy: vorlage.createdBy.toString(),
        createdAt: vorlage.createdAt.toISOString(),
        updatedAt: vorlage.updatedAt.toISOString(),
      })),
    } as unknown as jest.Mocked<ErinnerungsvorlageResponseFactory>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [GetAllVorlagenHandler, { provide: ERINNERUNGSVORLAGE_REPOSITORY, useValue: mockVorlageRepository }, { provide: ErinnerungsvorlageResponseFactory, useValue: mockResponseFactory }],
    }).compile();

    handler = module.get<GetAllVorlagenHandler>(GetAllVorlagenHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return empty array when no vorlagen exist', async () => {
      // Given (Arrange)
      mockVorlageRepository.findAll.mockResolvedValue([]);

      // When (Act)
      const result = await handler.execute();

      // Then (Assert)
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
      expect(mockVorlageRepository.findAll).toHaveBeenCalledTimes(1);
      expect(mockResponseFactory.create).not.toHaveBeenCalled();
    });

    it('should return all vorlagen', async () => {
      // Given (Arrange)
      const vorlage1 = createMockVorlage({ titel: 'Lagebesprechung', minuten: 30 });
      const vorlage2 = createMockVorlage({ titel: 'Ablösung', minuten: 60 });
      const vorlage3 = createMockVorlage({ titel: 'Funkprobe', minuten: 15 });

      mockVorlageRepository.findAll.mockResolvedValue([vorlage1, vorlage2, vorlage3]);

      // When (Act)
      const result = await handler.execute();

      // Then (Assert)
      expect(result).toHaveLength(3);
      expect(mockVorlageRepository.findAll).toHaveBeenCalledTimes(1);
      expect(mockResponseFactory.create).toHaveBeenCalledTimes(3);

      expect(result[0].titel).toBe('Lagebesprechung');
      expect(result[0].minuten).toBe(30);
      expect(result[1].titel).toBe('Ablösung');
      expect(result[1].minuten).toBe(60);
      expect(result[2].titel).toBe('Funkprobe');
      expect(result[2].minuten).toBe(15);
    });

    it('should use ResponseFactory correctly for mapping', async () => {
      // Given (Arrange)
      const vorlage = createMockVorlage({
        titel: 'Test Vorlage',
        minuten: 45,
        beschreibung: 'Test Beschreibung',
      });

      mockVorlageRepository.findAll.mockResolvedValue([vorlage]);

      // When (Act)
      const result = await handler.execute();

      // Then (Assert)
      expect(result).toHaveLength(1);
      expect(mockResponseFactory.create).toHaveBeenCalledTimes(1);
      expect(mockResponseFactory.create).toHaveBeenCalledWith(vorlage);

      const dto = result[0];
      expect(dto.id).toBe(vorlage.id.toString());
      expect(dto.titel).toBe('Test Vorlage');
      expect(dto.minuten).toBe(45);
      expect(dto.beschreibung).toBe('Test Beschreibung');
      expect(dto.createdBy).toBe(vorlage.createdBy.toString());
      expect(typeof dto.createdAt).toBe('string');
      expect(typeof dto.updatedAt).toBe('string');
    });

    it('should return single vorlage correctly', async () => {
      // Given (Arrange)
      const vorlage = createMockVorlage({ titel: 'Einzelne Vorlage', minuten: 120 });
      mockVorlageRepository.findAll.mockResolvedValue([vorlage]);

      // When (Act)
      const result = await handler.execute();

      // Then (Assert)
      expect(result).toHaveLength(1);
      expect(result[0].titel).toBe('Einzelne Vorlage');
      expect(result[0].minuten).toBe(120);
    });

    it('should handle vorlagen with null beschreibung', async () => {
      // Given (Arrange)
      const vorlage = createMockVorlage({
        titel: 'Ohne Beschreibung',
        beschreibung: null,
      });
      mockVorlageRepository.findAll.mockResolvedValue([vorlage]);

      // When (Act)
      const result = await handler.execute();

      // Then (Assert)
      expect(result).toHaveLength(1);
      expect(result[0].beschreibung).toBeNull();
    });

    it('should NOT call save() method (Read-Only Query)', async () => {
      // Given (Arrange)
      mockVorlageRepository.findAll.mockResolvedValue([]);

      // When (Act)
      await handler.execute();

      // Then (Assert)
      expect(mockVorlageRepository.save).not.toHaveBeenCalled();
    });
  });
});
