import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from '../services/audit-log.service';
import { AuditLogBatchService } from '../services/audit-log-batch.service';
import { CreateAuditLogDto, QueryAuditLogDto } from '../dto';
import { AuditActionType, AuditSeverity, UserRole } from '@prisma/generated/prisma/client';

// Mock the logger module
jest.mock('@/logger/consola.logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('AuditLogController', () => {
  let controller: AuditLogController;
  let auditLogService: jest.Mocked<AuditLogService>;
  let auditLogBatchService: jest.Mocked<AuditLogBatchService>;

  const mockAuditLog = {
    id: 'log-123',
    actionType: AuditActionType.READ,
    severity: AuditSeverity.LOW,
    action: 'read:user',
    resource: 'users',
    resourceId: 'resource-123',
    userId: 'user-123',
    userEmail: 'user@example.com',
    userRole: UserRole.USER,
    impersonatedBy: null,
    requestId: 'req-123',
    sessionId: 'session-123',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    endpoint: '/api/users/resource-123',
    httpMethod: 'GET',
    oldValues: null,
    newValues: null,
    affectedFields: [],
    metadata: {},
    timestamp: new Date(),
    duration: 45,
    success: true,
    errorMessage: null,
    statusCode: 200,
    compliance: [],
    sensitiveData: false,
    requiresReview: false,
    reviewedBy: null,
    reviewedAt: null,
    retentionPeriod: 365,
    archivedAt: null,
  };

  const mockPaginatedResponse = {
    items: [mockAuditLog],
    pagination: {
      currentPage: 1,
      itemsPerPage: 10,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [
        {
          provide: AuditLogService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            bulkDelete: jest.fn(),
            getStatistics: jest.fn(),
          },
        },
        {
          provide: AuditLogBatchService,
          useValue: {
            createBatch: jest.fn(),
            exportLogs: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuditLogController>(AuditLogController);
    auditLogService = module.get(AuditLogService);
    auditLogBatchService = module.get(AuditLogBatchService);
  });

  describe('create', () => {
    it('should create a single audit log entry', async () => {
      const createDto: CreateAuditLogDto = {
        userId: 'user-123',
        actionType: AuditActionType.CREATE,
        action: 'create:user',
        resource: 'users',
        resourceId: 'resource-123',
        severity: AuditSeverity.MEDIUM,
        metadata: { test: true },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      auditLogService.create.mockResolvedValue(mockAuditLog);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockAuditLog);
      expect(auditLogService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('createBatch', () => {
    it('should create multiple audit log entries', async () => {
      const createDtos: CreateAuditLogDto[] = [
        {
          userId: 'user-123',
          actionType: AuditActionType.CREATE,
          action: 'create:user',
          resource: 'users',
          severity: AuditSeverity.MEDIUM,
        },
        {
          userId: 'user-456',
          actionType: AuditActionType.UPDATE,
          action: 'update:post',
          resource: 'posts',
          severity: AuditSeverity.LOW,
        },
      ];

      const batchResult = {
        successful: createDtos.map((_, i) => ({ ...mockAuditLog, id: `log-${i}` })),
        failed: [],
        totalProcessed: 2,
        successCount: 2,
        failureCount: 0,
      };

      auditLogBatchService.createBatch.mockResolvedValue(batchResult);

      const result = await controller.createBatch(createDtos);

      expect(result).toEqual(batchResult);
      expect(auditLogBatchService.createBatch).toHaveBeenCalledWith(createDtos);
    });

    it('should reject non-array body', async () => {
      await expect(controller.createBatch({} as any)).rejects.toThrow(
        new BadRequestException('Body must be an array of audit log entries'),
      );
    });

    it('should reject empty batch', async () => {
      await expect(controller.createBatch([])).rejects.toThrow(
        new BadRequestException('Batch cannot be empty'),
      );
    });

    it('should reject batch exceeding size limit', async () => {
      const largeBatch = new Array(1001).fill({
        userId: 'user-123',
        action: 'test',
        actionType: AuditActionType.CREATE,
        resource: 'users',
      });

      await expect(controller.createBatch(largeBatch)).rejects.toThrow(
        new BadRequestException('Batch size cannot exceed 1000 entries'),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated audit logs', async () => {
      const query: QueryAuditLogDto = {
        page: 1,
        limit: 10,
        actionType: AuditActionType.READ,
        resource: 'users',
      };

      auditLogService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(auditLogService.findAll).toHaveBeenCalledWith(query);
    });

    it('should handle empty query parameters', async () => {
      const query = {};

      auditLogService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query as QueryAuditLogDto);

      expect(result).toEqual(mockPaginatedResponse);
      expect(auditLogService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('getStatistics', () => {
    it('should return audit log statistics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const groupBy = 'action';

      const statistics = {
        totalLogs: 100,
        actionTypes: {
          CREATE: 30,
          READ: 40,
          UPDATE: 20,
          DELETE: 10,
        },
        severities: {
          LOW: 50,
          MEDIUM: 30,
          HIGH: 15,
          CRITICAL: 5,
        },
        successRate: {
          success: 95,
          failed: 5,
        },
        topUsers: [],
        topResources: [],
      };

      auditLogService.getStatistics.mockResolvedValue(statistics);

      const result = await controller.getStatistics(startDate, endDate, groupBy);

      expect(result).toEqual(statistics);
      expect(auditLogService.getStatistics).toHaveBeenCalledWith({
        startDate,
        endDate,
        groupBy,
      });
    });

    it('should handle statistics without date range', async () => {
      const statistics = {
        totalLogs: 500,
        actionTypes: {},
        severities: {},
        successRate: {
          success: 500,
          failed: 0,
        },
        topUsers: [],
        topResources: [],
      };

      auditLogService.getStatistics.mockResolvedValue(statistics);

      const result = await controller.getStatistics();

      expect(result).toEqual(statistics);
      expect(auditLogService.getStatistics).toHaveBeenCalledWith({
        startDate: undefined,
        endDate: undefined,
        groupBy: undefined,
      });
    });
  });

  describe('export', () => {
    it('should export logs as JSON by default', async () => {
      const query: QueryAuditLogDto = {
        page: 1,
        limit: 100,
        startDate: '2024-01-01',
      };

      const exportData = JSON.stringify({ logs: [mockAuditLog], format: 'json' });

      auditLogBatchService.exportLogs.mockResolvedValue(exportData);

      const result = await controller.export(query);

      expect(result).toEqual(exportData);
      expect(auditLogBatchService.exportLogs).toHaveBeenCalledWith(query, 'json');
    });

    it('should export logs as CSV', async () => {
      const query: QueryAuditLogDto = {};
      const csvData = 'id,userId,action,resource\nlog-123,user-123,READ,users';

      auditLogBatchService.exportLogs.mockResolvedValue(csvData);

      const result = await controller.export(query, 'csv');

      expect(result).toEqual(csvData);
      expect(auditLogBatchService.exportLogs).toHaveBeenCalledWith(query, 'csv');
    });

    it('should export logs as NDJSON', async () => {
      const query: QueryAuditLogDto = {};
      const ndjsonData =
        '{"id":"log-123","userId":"user-123"}\n{"id":"log-456","userId":"user-456"}';

      auditLogBatchService.exportLogs.mockResolvedValue(ndjsonData);

      const result = await controller.export(query, 'ndjson');

      expect(result).toEqual(ndjsonData);
      expect(auditLogBatchService.exportLogs).toHaveBeenCalledWith(query, 'ndjson');
    });
  });

  describe('findOne', () => {
    it('should return a single audit log', async () => {
      const id = 'log-123';

      auditLogService.findOne.mockResolvedValue(mockAuditLog);

      const result = await controller.findOne(id);

      expect(result).toEqual(mockAuditLog);
      expect(auditLogService.findOne).toHaveBeenCalledWith(id);
    });

    it('should handle not found error', async () => {
      const id = 'non-existent';

      auditLogService.findOne.mockRejectedValue(new NotFoundException('Audit log not found'));

      await expect(controller.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete an audit log', async () => {
      const id = 'log-123';

      auditLogService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(auditLogService.remove).toHaveBeenCalledWith(id);
    });

    it('should handle forbidden deletion of compliance logs', async () => {
      const id = 'compliance-log-123';

      auditLogService.remove.mockRejectedValue(
        new ForbiddenException('Cannot delete compliance-tagged logs'),
      );

      await expect(controller.remove(id)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('bulkDelete', () => {
    it('should bulk delete audit logs', async () => {
      const olderThan = new Date('2024-01-01');
      const severity = 'LOW';
      const excludeCompliance = true;

      auditLogService.bulkDelete.mockResolvedValue(50);

      const result = await controller.bulkDelete(olderThan, severity, excludeCompliance);

      expect(result).toEqual({
        deletedCount: 50,
        message: 'Successfully deleted 50 audit log entries',
      });
      expect(auditLogService.bulkDelete).toHaveBeenCalledWith({
        olderThan: new Date(olderThan),
        severity,
        excludeCompliance,
      });
    });

    it('should require olderThan parameter', async () => {
      await expect(controller.bulkDelete(null as any)).rejects.toThrow(
        new BadRequestException('olderThan parameter is required'),
      );
    });

    it('should handle bulk delete without severity filter', async () => {
      const olderThan = new Date('2024-01-01');

      auditLogService.bulkDelete.mockResolvedValue(100);

      const result = await controller.bulkDelete(olderThan);

      expect(result.deletedCount).toBe(100);
      expect(auditLogService.bulkDelete).toHaveBeenCalledWith({
        olderThan: new Date(olderThan),
        severity: undefined,
        excludeCompliance: true,
      });
    });
  });
});
