import { Test, type TestingModule } from '@nestjs/testing';
import { UpdateFuehrungsrhythmusTemplateHandler } from '../update-fuehrungsrhythmus-template.handler';
import { UpdateFuehrungsrhythmusTemplateCommand } from '../update-fuehrungsrhythmus-template.command';
import { FuehrungsrhythmusTemplate } from '@domain/fuehrungsrhythmus/entities/fuehrungsrhythmus-template.entity';
import { FuehrungsrhythmusTemplateAktualisiertEvent } from '@domain/fuehrungsrhythmus/events/fuehrungsrhythmus-template-aktualisiert.event';
import { FuehrungsrhythmusEintrag } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-eintrag';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY, OUTBOX_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import type { IFuehrungsrhythmusTemplateRepository } from '@domain/fuehrungsrhythmus/repositories/i-fuehrungsrhythmus-template.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { FuehrungsrhythmusTemplateResponseFactory } from '../../../dto/fuehrungsrhythmus-template-response.factory';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES } from '../../../errors/fuehrungsrhythmus-template-error.codes';

describe('UpdateFuehrungsrhythmusTemplateHandler', () => {
  let handler: UpdateFuehrungsrhythmusTemplateHandler;
  let mockTemplateRepository: jest.Mocked<IFuehrungsrhythmusTemplateRepository>;
  let mockOutboxRepository: jest.Mocked<IOutboxRepository>;
  let mockPrismaService: { $transaction: jest.Mock };
  let mockLogger: jest.Mocked<ILogger>;

  /** Generiert eine gueltige UserId als String fuer Command-Tests. */
  const generateValidUserIdString = () => UserId.create().value?.toString();

  /** Erstellt ein gueltiges FuehrungsrhythmusTemplate fuer Tests. */
  const createTestTemplate = () => {
    const userId = UserId.create().value!;
    return FuehrungsrhythmusTemplate.create({
      name: 'Original Template',
      beschreibung: 'Original Beschreibung',
      eintraege: [
        FuehrungsrhythmusEintrag.create({
          titel: 'Lagebesprechung',
          intervallMinuten: 30,
          offsetMinuten: 0,
          sortOrder: 0,
        }).value!,
      ],
      createdBy: userId,
    }).value!;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockTemplateRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<IFuehrungsrhythmusTemplateRepository>;

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findPendingEvents: jest.fn(),
      markAsPublished: jest.fn(),
      markAsFailed: jest.fn(),
      getRetryCount: jest.fn(),
    } as unknown as jest.Mocked<IOutboxRepository>;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const txMock = {};
        return callback(txMock);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateFuehrungsrhythmusTemplateHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY, useValue: mockTemplateRepository },
        { provide: LOGGER, useValue: mockLogger },
        {
          provide: FuehrungsrhythmusTemplateResponseFactory,
          useValue: {
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
          },
        },
      ],
    }).compile();

    handler = module.get<UpdateFuehrungsrhythmusTemplateHandler>(UpdateFuehrungsrhythmusTemplateHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should update template successfully', async () => {
      // Given
      const template = createTestTemplate();
      template.clearDomainEvents();
      mockTemplateRepository.findById.mockResolvedValue(template);

      const commandResult = UpdateFuehrungsrhythmusTemplateCommand.create({
        templateId: template.id.toString(),
        name: 'Neuer Name',
        beschreibung: 'Neue Beschreibung',
        eintraege: [{ titel: 'Funkmeldecheck', intervallMinuten: 15 }],
        aktualisiertVon: generateValidUserIdString(),
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.name).toBe('Neuer Name');
      expect(result.value?.beschreibung).toBe('Neue Beschreibung');
      expect(mockTemplateRepository.save).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should fail when template not found (NOT_FOUND)', async () => {
      // Given
      mockTemplateRepository.findById.mockResolvedValue(null);
      const template = createTestTemplate();

      const commandResult = UpdateFuehrungsrhythmusTemplateCommand.create({
        templateId: template.id.toString(),
        name: 'Test',
        eintraege: [{ titel: 'Lagebesprechung', intervallMinuten: 30 }],
        aktualisiertVon: generateValidUserIdString(),
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.NOT_FOUND);
      expect(mockTemplateRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when template is already deleted (ALREADY_DELETED)', async () => {
      // Given
      const template = createTestTemplate();
      template.clearDomainEvents();
      const userId = UserId.create().value!;
      template.softDelete(userId);
      template.clearDomainEvents();
      mockTemplateRepository.findById.mockResolvedValue(template);

      const commandResult = UpdateFuehrungsrhythmusTemplateCommand.create({
        templateId: template.id.toString(),
        name: 'Test',
        eintraege: [{ titel: 'Lagebesprechung', intervallMinuten: 30 }],
        aktualisiertVon: generateValidUserIdString(),
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.ALREADY_DELETED);
      expect(mockTemplateRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when eintraege have invalid values', async () => {
      // Given
      const template = createTestTemplate();
      template.clearDomainEvents();
      mockTemplateRepository.findById.mockResolvedValue(template);

      const commandResult = UpdateFuehrungsrhythmusTemplateCommand.create({
        templateId: template.id.toString(),
        name: 'Test',
        eintraege: [{ titel: 'Lagebesprechung', intervallMinuten: 0 }],
        aktualisiertVon: generateValidUserIdString(),
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(false);
      expect(mockTemplateRepository.save).not.toHaveBeenCalled();
    });

    it('should emit FuehrungsrhythmusTemplateAktualisiertEvent with correct properties', async () => {
      // Given
      const template = createTestTemplate();
      template.clearDomainEvents();
      mockTemplateRepository.findById.mockResolvedValue(template);

      const commandResult = UpdateFuehrungsrhythmusTemplateCommand.create({
        templateId: template.id.toString(),
        name: 'Aktualisierter Name',
        eintraege: [{ titel: 'Lagebesprechung', intervallMinuten: 60 }],
        aktualisiertVon: generateValidUserIdString(),
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      expect(savedEvents.length).toBe(1);
      expect(savedEvents[0]).toBeInstanceOf(FuehrungsrhythmusTemplateAktualisiertEvent);

      const event = savedEvents[0] as FuehrungsrhythmusTemplateAktualisiertEvent;
      expect(event.templateId.toString()).toBe(template.id.toString());
      expect(event.name).toBe('Aktualisierter Name');
    });

    it('should log successful update', async () => {
      // Given
      const template = createTestTemplate();
      template.clearDomainEvents();
      mockTemplateRepository.findById.mockResolvedValue(template);

      const commandResult = UpdateFuehrungsrhythmusTemplateCommand.create({
        templateId: template.id.toString(),
        name: 'Aktualisiert',
        eintraege: [{ titel: 'Lagebesprechung', intervallMinuten: 30 }],
        aktualisiertVon: generateValidUserIdString(),
      });

      // When
      await handler.execute(commandResult.value!);

      // Then
      expect(mockLogger.log).toHaveBeenCalled();
      const logMsg = mockLogger.log.mock.calls[0][0];
      expect(logMsg).toContain('FuehrungsrhythmusTemplate aktualisiert');
    });

    it('should fail when repository findById throws error', async () => {
      // Given
      const template = createTestTemplate();
      mockTemplateRepository.findById.mockRejectedValue(new Error('DB connection lost'));

      const commandResult = UpdateFuehrungsrhythmusTemplateCommand.create({
        templateId: template.id.toString(),
        name: 'Test',
        eintraege: [{ titel: 'Lagebesprechung', intervallMinuten: 30 }],
        aktualisiertVon: generateValidUserIdString(),
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then - TransactionalCommandHandler faengt Exceptions und konvertiert zu Result.fail()
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('DB connection lost');
      expect(mockTemplateRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when repository save throws error', async () => {
      // Given
      const template = createTestTemplate();
      template.clearDomainEvents();
      mockTemplateRepository.findById.mockResolvedValue(template);
      mockTemplateRepository.save.mockRejectedValue(new Error('Save failed'));

      const commandResult = UpdateFuehrungsrhythmusTemplateCommand.create({
        templateId: template.id.toString(),
        name: 'Neuer Name',
        eintraege: [{ titel: 'Lagebesprechung', intervallMinuten: 30 }],
        aktualisiertVon: generateValidUserIdString(),
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then - TransactionalCommandHandler faengt Exceptions und konvertiert zu Result.fail()
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Save failed');
    });
  });
});
