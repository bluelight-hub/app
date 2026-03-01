import { Test, type TestingModule } from '@nestjs/testing';
import { DeleteFuehrungsrhythmusTemplateHandler } from '../delete-fuehrungsrhythmus-template.handler';
import { DeleteFuehrungsrhythmusTemplateCommand } from '../delete-fuehrungsrhythmus-template.command';
import { FuehrungsrhythmusTemplate } from '@domain/fuehrungsrhythmus/entities/fuehrungsrhythmus-template.entity';
import { FuehrungsrhythmusTemplateGeloeschtEvent } from '@domain/fuehrungsrhythmus/events/fuehrungsrhythmus-template-geloescht.event';
import { FuehrungsrhythmusEintrag } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-eintrag';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY, OUTBOX_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import type { IFuehrungsrhythmusTemplateRepository } from '@domain/fuehrungsrhythmus/repositories/i-fuehrungsrhythmus-template.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES } from '../../../errors/fuehrungsrhythmus-template-error.codes';

describe('DeleteFuehrungsrhythmusTemplateHandler', () => {
  let handler: DeleteFuehrungsrhythmusTemplateHandler;
  let mockTemplateRepository: jest.Mocked<IFuehrungsrhythmusTemplateRepository>;
  let mockOutboxRepository: jest.Mocked<IOutboxRepository>;
  let mockPrismaService: { $transaction: jest.Mock };
  let mockLogger: jest.Mocked<ILogger>;

  /** Erstellt ein gueltiges FuehrungsrhythmusTemplate fuer Tests. */
  const createTestTemplate = () => {
    const userId = UserId.create().value!;
    return FuehrungsrhythmusTemplate.create({
      name: 'Test Template',
      beschreibung: 'Test Beschreibung',
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
        DeleteFuehrungsrhythmusTemplateHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY, useValue: mockTemplateRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<DeleteFuehrungsrhythmusTemplateHandler>(DeleteFuehrungsrhythmusTemplateHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should soft-delete template successfully', async () => {
      // Given
      const template = createTestTemplate();
      template.clearDomainEvents();
      mockTemplateRepository.findById.mockResolvedValue(template);

      const commandResult = DeleteFuehrungsrhythmusTemplateCommand.create({
        templateId: template.id.toString(),
        geloeschtVon: UserId.create().value?.toString(),
      });
      expect(commandResult.isSuccess).toBe(true);

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual({ success: true });
      expect(mockTemplateRepository.save).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should fail when template not found (NOT_FOUND)', async () => {
      // Given
      mockTemplateRepository.findById.mockResolvedValue(null);
      const template = createTestTemplate();

      const commandResult = DeleteFuehrungsrhythmusTemplateCommand.create({
        templateId: template.id.toString(),
        geloeschtVon: UserId.create().value?.toString(),
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

      const commandResult = DeleteFuehrungsrhythmusTemplateCommand.create({
        templateId: template.id.toString(),
        geloeschtVon: userId.toString(),
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain(FUEHRUNGSRHYTHMUS_TEMPLATE_ERROR_CODES.ALREADY_DELETED);
      expect(mockTemplateRepository.save).not.toHaveBeenCalled();
    });

    it('should emit FuehrungsrhythmusTemplateGeloeschtEvent with correct properties', async () => {
      // Given
      const template = createTestTemplate();
      template.clearDomainEvents();
      mockTemplateRepository.findById.mockResolvedValue(template);

      const deletedByUserId = UserId.create().value!;
      const commandResult = DeleteFuehrungsrhythmusTemplateCommand.create({
        templateId: template.id.toString(),
        geloeschtVon: deletedByUserId.toString(),
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(true);
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      expect(savedEvents.length).toBe(1);
      expect(savedEvents[0]).toBeInstanceOf(FuehrungsrhythmusTemplateGeloeschtEvent);

      const event = savedEvents[0] as FuehrungsrhythmusTemplateGeloeschtEvent;
      expect(event.templateId.toString()).toBe(template.id.toString());
      expect(event.name).toBe('Test Template');
      expect(event.deletedBy.equals(deletedByUserId)).toBe(true);
    });

    it('should log successful deletion', async () => {
      // Given
      const template = createTestTemplate();
      template.clearDomainEvents();
      mockTemplateRepository.findById.mockResolvedValue(template);

      const commandResult = DeleteFuehrungsrhythmusTemplateCommand.create({
        templateId: template.id.toString(),
        geloeschtVon: UserId.create().value?.toString(),
      });

      // When
      await handler.execute(commandResult.value!);

      // Then
      expect(mockLogger.log).toHaveBeenCalled();
      const logMsg = mockLogger.log.mock.calls[0][0];
      expect(logMsg).toContain('FuehrungsrhythmusTemplate geloescht');
    });

    it('should fail when geloeschtVon is invalid UserId', async () => {
      // Given
      const template = createTestTemplate();
      template.clearDomainEvents();
      mockTemplateRepository.findById.mockResolvedValue(template);

      const commandResult = DeleteFuehrungsrhythmusTemplateCommand.create({
        templateId: template.id.toString(),
        geloeschtVon: 'invalid-user-id-format',
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then
      expect(result.isSuccess).toBe(false);
      expect(mockTemplateRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when repository findById throws error', async () => {
      // Given
      const template = createTestTemplate();
      mockTemplateRepository.findById.mockRejectedValue(new Error('DB connection lost'));

      const commandResult = DeleteFuehrungsrhythmusTemplateCommand.create({
        templateId: template.id.toString(),
        geloeschtVon: UserId.create().value?.toString(),
      });

      // When
      const result = await handler.execute(commandResult.value!);

      // Then - TransactionalCommandHandler faengt Exceptions und konvertiert zu Result.fail()
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('DB connection lost');
      expect(mockTemplateRepository.save).not.toHaveBeenCalled();
    });
  });
});
