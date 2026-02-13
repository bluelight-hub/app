import { Test, type TestingModule } from '@nestjs/testing';
import { GetAllFuehrungsrhythmusTemplatesHandler } from '../get-all-fuehrungsrhythmus-templates.handler';
import { FuehrungsrhythmusTemplate } from '@domain/fuehrungsrhythmus/entities/fuehrungsrhythmus-template.entity';
import { FuehrungsrhythmusTemplateId } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-id';
import { FuehrungsrhythmusTemplateName } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-name';
import { FuehrungsrhythmusEintrag } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-eintrag';
import { FuehrungsrhythmusTemplateScope } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-scope';
import { UserId } from '@domain/value-objects/user-id';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY } from '@/infrastructure/di-tokens';
import type { IFuehrungsrhythmusTemplateRepository } from '@domain/fuehrungsrhythmus/repositories/i-fuehrungsrhythmus-template.repository';
import { FuehrungsrhythmusTemplateResponseFactory } from '../../../dto/fuehrungsrhythmus-template-response.factory';

/**
 * Helper: Erstellt ein rekonstruiertes FuehrungsrhythmusTemplate fuer Tests.
 *
 * Nutzt reconstruct() da wir keine Domain-Events emittieren wollen.
 */
function createMockTemplate(overrides?: { name?: string; beschreibung?: string | null; eintraege?: FuehrungsrhythmusEintrag[]; createdAt?: Date; updatedAt?: Date }): FuehrungsrhythmusTemplate {
  const id = FuehrungsrhythmusTemplateId.create().value! as FuehrungsrhythmusTemplateId;
  const name = FuehrungsrhythmusTemplateName.create(overrides?.name ?? 'Test Template').value!;
  const createdBy = UserId.create().value!;
  const now = new Date();

  const defaultEintrag = FuehrungsrhythmusEintrag.create({
    titel: 'Lagebesprechung',
    intervallMinuten: 30,
    offsetMinuten: 0,
    sortOrder: 0,
  }).value!;

  return FuehrungsrhythmusTemplate.reconstruct({
    id,
    name,
    beschreibung: overrides?.beschreibung ?? null,
    eintraege: overrides?.eintraege ?? [defaultEintrag],
    scope: FuehrungsrhythmusTemplateScope.GLOBAL,
    einsatzId: null,
    createdBy,
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
  });
}

/**
 * Unit Tests fuer GetAllFuehrungsrhythmusTemplatesHandler.
 *
 * Testet den Query Handler gemaess AAA Pattern mit Given-When-Then Kommentaren.
 * Nutzt Mock Repository fuer Unit Test Isolation.
 *
 * **Test Coverage:**
 * - Happy Path: Alle Templates abrufen
 * - Empty Result: Keine Templates vorhanden
 * - ResponseFactory Nutzung
 * - Read-Only Constraint: save() wird nicht aufgerufen
 */
describe('GetAllFuehrungsrhythmusTemplatesHandler', () => {
  let handler: GetAllFuehrungsrhythmusTemplatesHandler;
  let mockTemplateRepository: jest.Mocked<IFuehrungsrhythmusTemplateRepository>;
  let mockResponseFactory: jest.Mocked<FuehrungsrhythmusTemplateResponseFactory>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Repository fuer FuehrungsrhythmusTemplates
    mockTemplateRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      exists: jest.fn(),
    } as jest.Mocked<IFuehrungsrhythmusTemplateRepository>;

    // Mock ResponseFactory
    mockResponseFactory = {
      create: jest.fn().mockImplementation((template) => ({
        id: template.id.toString(),
        name: template.name.value,
        beschreibung: template.beschreibung,
        eintraege: template.eintraege.map((e: FuehrungsrhythmusEintrag) => ({
          id: e.id,
          titel: e.titel,
          intervallMinuten: e.intervallMinuten,
          offsetMinuten: e.offsetMinuten,
          sortOrder: e.sortOrder,
        })),
        createdBy: template.createdBy.toString(),
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      })),
    } as unknown as jest.Mocked<FuehrungsrhythmusTemplateResponseFactory>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllFuehrungsrhythmusTemplatesHandler,
        { provide: FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY, useValue: mockTemplateRepository },
        { provide: FuehrungsrhythmusTemplateResponseFactory, useValue: mockResponseFactory },
      ],
    }).compile();

    handler = module.get<GetAllFuehrungsrhythmusTemplatesHandler>(GetAllFuehrungsrhythmusTemplatesHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return empty array when no templates exist', async () => {
      // Given (Arrange)
      mockTemplateRepository.findAll.mockResolvedValue([]);

      // When (Act)
      const result = await handler.execute();

      // Then (Assert)
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
      expect(mockTemplateRepository.findAll).toHaveBeenCalledTimes(1);
      expect(mockResponseFactory.create).not.toHaveBeenCalled();
    });

    it('should return all templates', async () => {
      // Given (Arrange)
      const eintrag1 = FuehrungsrhythmusEintrag.create({
        titel: 'Lagebesprechung',
        intervallMinuten: 30,
        offsetMinuten: 0,
        sortOrder: 0,
      }).value!;

      const eintrag2 = FuehrungsrhythmusEintrag.create({
        titel: 'Funkmeldecheck',
        intervallMinuten: 15,
        offsetMinuten: 5,
        sortOrder: 1,
      }).value!;

      const template1 = createMockTemplate({
        name: 'Standard 30min',
        eintraege: [eintrag1],
      });
      const template2 = createMockTemplate({
        name: 'Erweitert 15min',
        eintraege: [eintrag1, eintrag2],
      });
      const template3 = createMockTemplate({
        name: 'Minimal',
      });

      mockTemplateRepository.findAll.mockResolvedValue([template1, template2, template3]);

      // When (Act)
      const result = await handler.execute();

      // Then (Assert)
      expect(result).toHaveLength(3);
      expect(mockTemplateRepository.findAll).toHaveBeenCalledTimes(1);
      expect(mockResponseFactory.create).toHaveBeenCalledTimes(3);

      expect(result[0].name).toBe('Standard 30min');
      expect(result[1].name).toBe('Erweitert 15min');
      expect(result[2].name).toBe('Minimal');
    });

    it('should use ResponseFactory correctly for mapping', async () => {
      // Given (Arrange)
      const eintrag = FuehrungsrhythmusEintrag.create({
        titel: 'Lagebesprechung',
        intervallMinuten: 30,
        offsetMinuten: 0,
        sortOrder: 0,
      }).value!;

      const template = createMockTemplate({
        name: 'Test Template',
        beschreibung: 'Test Beschreibung',
        eintraege: [eintrag],
      });

      mockTemplateRepository.findAll.mockResolvedValue([template]);

      // When (Act)
      const result = await handler.execute();

      // Then (Assert)
      expect(result).toHaveLength(1);
      expect(mockResponseFactory.create).toHaveBeenCalledTimes(1);
      expect(mockResponseFactory.create).toHaveBeenCalledWith(template);

      const dto = result[0];
      expect(dto.id).toBe(template.id.toString());
      expect(dto.name).toBe('Test Template');
      expect(dto.beschreibung).toBe('Test Beschreibung');
      expect(dto.createdBy).toBe(template.createdBy.toString());
      expect(typeof dto.createdAt).toBe('string');
      expect(typeof dto.updatedAt).toBe('string');
      expect(dto.eintraege).toHaveLength(1);
      expect(dto.eintraege[0].titel).toBe('Lagebesprechung');
      expect(dto.eintraege[0].intervallMinuten).toBe(30);
    });

    it('should return single template correctly', async () => {
      // Given (Arrange)
      const template = createMockTemplate({ name: 'Einzelnes Template' });
      mockTemplateRepository.findAll.mockResolvedValue([template]);

      // When (Act)
      const result = await handler.execute();

      // Then (Assert)
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Einzelnes Template');
    });

    it('should handle templates with null beschreibung', async () => {
      // Given (Arrange)
      const template = createMockTemplate({
        name: 'Ohne Beschreibung',
        beschreibung: null,
      });
      mockTemplateRepository.findAll.mockResolvedValue([template]);

      // When (Act)
      const result = await handler.execute();

      // Then (Assert)
      expect(result).toHaveLength(1);
      expect(result[0].beschreibung).toBeNull();
    });

    it('should pass einsatzId filter to repository', async () => {
      // Given (Arrange)
      mockTemplateRepository.findAll.mockResolvedValue([]);

      // When (Act)
      await handler.execute({ scope: FuehrungsrhythmusTemplateScope.EINSATZ, einsatzId: 'clw3h8x9y0000qwertyuiopas' });

      // Then (Assert)
      expect(mockTemplateRepository.findAll).toHaveBeenCalledTimes(1);
      const calledFilter = mockTemplateRepository.findAll.mock.calls[0][0];
      expect(calledFilter?.scope).toBe(FuehrungsrhythmusTemplateScope.EINSATZ);
      expect(calledFilter?.einsatzId).toBeDefined();
    });

    it('should pass includeGlobal filter to repository', async () => {
      // Given (Arrange)
      mockTemplateRepository.findAll.mockResolvedValue([]);

      // When (Act)
      await handler.execute({ einsatzId: 'clw3h8x9y0000qwertyuiopas', includeGlobal: true });

      // Then (Assert)
      expect(mockTemplateRepository.findAll).toHaveBeenCalledTimes(1);
      const calledFilter = mockTemplateRepository.findAll.mock.calls[0][0];
      expect(calledFilter?.includeGlobal).toBe(true);
      expect(calledFilter?.einsatzId).toBeDefined();
    });

    it('should NOT call save() method (Read-Only Query)', async () => {
      // Given (Arrange)
      mockTemplateRepository.findAll.mockResolvedValue([]);

      // When (Act)
      await handler.execute();

      // Then (Assert)
      expect(mockTemplateRepository.save).not.toHaveBeenCalled();
    });
  });
});
