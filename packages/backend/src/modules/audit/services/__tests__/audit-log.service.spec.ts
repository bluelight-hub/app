import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from '../audit-log.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogCacheService } from '../audit-log-cache.service';
import { CreateAuditLogDto, QueryAuditLogDto, AuditLogStatisticsResponse } from '../../dto';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  AuditActionType,
  AuditSeverity,
  UserRole,
  AuditLog,
} from '@prisma/generated/prisma/client';

// Mock logger
jest.mock('../../../../logger/consola.logger', () => ({
  logger: {
    error: jest.fn(),
    trace: jest.fn(),
  },
}));

describe('AuditLogService', () => {
  let service: AuditLogService;
  let prismaService: PrismaService;
  let cacheService: jest.Mocked<AuditLogCacheService>;

  const mockAuditLog: AuditLog = {
    id: 'audit-123',
    actionType: AuditActionType.CREATE,
    severity: AuditSeverity.MEDIUM,
    action: 'create-user',
    resource: 'user',
    resourceId: 'user-456',
    userId: 'admin-789',
    userEmail: 'admin@example.com',
    userRole: UserRole.ADMIN,
    impersonatedBy: null,
    requestId: 'req-123',
    sessionId: 'sess-456',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    endpoint: '/api/users',
    httpMethod: 'POST',
    oldValues: { name: 'Old' },
    newValues: { name: 'New' },
    affectedFields: ['name'],
    metadata: { source: 'api' },
    timestamp: new Date('2024-01-01'),
    duration: 150,
    success: true,
    errorMessage: null,
    statusCode: 201,
    compliance: ['GDPR'],
    sensitiveData: false,
    requiresReview: false,
    reviewedBy: null,
    reviewedAt: null,
    retentionPeriod: 365,
    archivedAt: null,
  };

  const mockCreateDto: CreateAuditLogDto = {
    actionType: AuditActionType.CREATE,
    severity: AuditSeverity.MEDIUM,
    action: 'create-user',
    resource: 'user',
    resourceId: 'user-456',
    userId: 'admin-789',
    userEmail: 'admin@example.com',
    userRole: UserRole.ADMIN,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    endpoint: '/api/users',
    httpMethod: 'POST',
    oldValues: { name: 'Old' },
    newValues: { name: 'New' },
    affectedFields: ['name'],
    metadata: { source: 'api' },
    duration: 150,
    success: true,
    statusCode: 201,
    compliance: ['GDPR'],
    sensitiveData: false,
    requiresReview: false,
    retentionPeriod: 365,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: PrismaService,
          useValue: {
            auditLog: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
              groupBy: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: AuditLogCacheService,
          useValue: {
            cacheResult: jest.fn(),
            invalidateCache: jest.fn(),
            invalidateStatistics: jest.fn(),
            getCachedResult: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            generateStatisticsKey: jest.fn().mockReturnValue('stats-key'),
          },
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    prismaService = module.get(PrismaService);
    cacheService = module.get(AuditLogCacheService);
  });

  describe('create', () => {
    it('should create an audit log entry', async () => {
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue(mockAuditLog);

      const result = await service.create(mockCreateDto);

      expect(result).toEqual({
        ...mockAuditLog,
        oldValues: mockAuditLog.oldValues as Record<string, any>,
        newValues: mockAuditLog.newValues as Record<string, any>,
        metadata: mockAuditLog.metadata as Record<string, any>,
      });
      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actionType: mockCreateDto.actionType,
          action: mockCreateDto.action,
          resource: mockCreateDto.resource,
        }),
      });
    });

    it('should handle creation errors', async () => {
      (prismaService.auditLog.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.create(mockCreateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated audit logs', async () => {
      const mockLogs = [mockAuditLog];
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);

      const queryDto: QueryAuditLogDto = {
        page: 1,
        limit: 50,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      };

      const result = await service.findAll(queryDto);

      expect(result.items).toHaveLength(1);
      expect(result.pagination).toEqual({
        currentPage: 1,
        itemsPerPage: 50,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should apply filters correctly', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(0);

      const queryDto: QueryAuditLogDto = {
        actionType: AuditActionType.UPDATE,
        severity: AuditSeverity.HIGH,
        userId: 'user-123',
        success: true,
        requiresReview: false,
        sensitiveData: false,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        search: 'test',
        httpMethods: ['POST', 'PUT'],
        compliance: ['GDPR'],
        minDuration: 100,
        maxDuration: 1000,
      };

      await service.findAll(queryDto);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          actionType: AuditActionType.UPDATE,
          severity: AuditSeverity.HIGH,
          userId: 'user-123',
          success: true,
          requiresReview: false,
          sensitiveData: false,
          timestamp: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
          OR: expect.arrayContaining([
            { action: { contains: 'test', mode: 'insensitive' } },
            { resource: { contains: 'test', mode: 'insensitive' } },
          ]),
          httpMethod: { in: ['POST', 'PUT'] },
          compliance: { hasSome: ['GDPR'] },
          duration: {
            gte: 100,
            lte: 1000,
          },
        }),
        orderBy: { timestamp: 'desc' },
        skip: 0,
        take: 50,
      });
    });

    it('should handle errors in findAll', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.findAll({})).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should find an audit log by id', async () => {
      (prismaService.auditLog.findUnique as jest.Mock).mockResolvedValue(mockAuditLog);

      const result = await service.findOne('audit-123');

      expect(result).toEqual({
        ...mockAuditLog,
        oldValues: mockAuditLog.oldValues as Record<string, any>,
        newValues: mockAuditLog.newValues as Record<string, any>,
        metadata: mockAuditLog.metadata as Record<string, any>,
      });
    });

    it('should throw NotFoundException when audit log not found', async () => {
      (prismaService.auditLog.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should handle database errors', async () => {
      (prismaService.auditLog.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findOne('audit-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('markAsReviewed', () => {
    it('should mark an audit log as reviewed', async () => {
      const reviewedLog = { ...mockAuditLog, reviewedBy: 'reviewer-123', reviewedAt: new Date() };
      (prismaService.auditLog.update as jest.Mock).mockResolvedValue(reviewedLog);

      const result = await service.markAsReviewed('audit-123', 'reviewer-123');

      expect(result).toEqual(reviewedLog);
      expect(prismaService.auditLog.update).toHaveBeenCalledWith({
        where: { id: 'audit-123' },
        data: {
          reviewedBy: 'reviewer-123',
          reviewedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException when audit log not found', async () => {
      (prismaService.auditLog.update as jest.Mock).mockRejectedValue({ code: 'P2025' });

      await expect(service.markAsReviewed('non-existent', 'reviewer-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle other errors', async () => {
      (prismaService.auditLog.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.markAsReviewed('audit-123', 'reviewer-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('archiveOldLogs', () => {
    it('should archive old logs', async () => {
      (prismaService.auditLog.updateMany as jest.Mock).mockResolvedValue({ count: 10 });

      const result = await service.archiveOldLogs(30);

      expect(result).toBe(10);
      expect(prismaService.auditLog.updateMany).toHaveBeenCalledWith({
        where: {
          timestamp: { lt: expect.any(Date) },
          archivedAt: null,
        },
        data: {
          archivedAt: expect.any(Date),
        },
      });
    });

    it('should handle errors during archiving', async () => {
      (prismaService.auditLog.updateMany as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.archiveOldLogs(30)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteArchivedLogs', () => {
    it('should delete archived logs older than specified days', async () => {
      (prismaService.auditLog.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await service.deleteArchivedLogs(90);

      expect(result).toBe(5);
      expect(prismaService.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          archivedAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should handle errors during deletion', async () => {
      (prismaService.auditLog.deleteMany as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.deleteArchivedLogs(90)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete an audit log without compliance tags', async () => {
      const logWithoutCompliance = { ...mockAuditLog, compliance: [] };
      (prismaService.auditLog.findUnique as jest.Mock).mockResolvedValue(logWithoutCompliance);
      (prismaService.auditLog.delete as jest.Mock).mockResolvedValue(logWithoutCompliance);

      await service.remove('audit-123');

      expect(prismaService.auditLog.delete).toHaveBeenCalledWith({
        where: { id: 'audit-123' },
      });
    });

    it('should throw ForbiddenException for compliance-tagged logs', async () => {
      (prismaService.auditLog.findUnique as jest.Mock).mockResolvedValue(mockAuditLog);

      await expect(service.remove('audit-123')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when audit log not found', async () => {
      (prismaService.auditLog.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(BadRequestException);
    });

    it('should handle delete errors', async () => {
      const logWithoutCompliance = { ...mockAuditLog, compliance: [] };
      (prismaService.auditLog.findUnique as jest.Mock).mockResolvedValue(logWithoutCompliance);
      (prismaService.auditLog.delete as jest.Mock).mockRejectedValue({ code: 'P2025' });

      await expect(service.remove('audit-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkDelete', () => {
    it('should bulk delete logs based on criteria', async () => {
      (prismaService.auditLog.deleteMany as jest.Mock).mockResolvedValue({ count: 20 });

      const criteria = {
        olderThan: new Date('2023-01-01'),
        severity: 'LOW',
        excludeCompliance: true,
      };

      const result = await service.bulkDelete(criteria);

      expect(result).toBe(20);
      expect(prismaService.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          timestamp: { lt: criteria.olderThan },
          severity: AuditSeverity.LOW,
          compliance: { isEmpty: true },
        },
      });
    });

    it('should handle errors during bulk deletion', async () => {
      (prismaService.auditLog.deleteMany as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.bulkDelete({ olderThan: new Date() })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStatistics', () => {
    it('should return statistics with cache', async () => {
      const mockStats: AuditLogStatisticsResponse = {
        totalLogs: 100,
        actionTypes: {
          CREATE: 40,
          READ: 20,
          UPDATE: 30,
          DELETE: 10,
        },
        severities: {
          LOW: 50,
          MEDIUM: 30,
          HIGH: 15,
          CRITICAL: 5,
        },
        successRate: {
          success: 90,
          failed: 10,
        },
        topUsers: [
          { userId: 'user-1', userEmail: 'user1@example.com', count: 20 },
          { userId: 'user-2', userEmail: 'user2@example.com', count: 15 },
        ],
        topResources: [
          { resource: 'user', count: 50 },
          { resource: 'organization', count: 30 },
        ],
      };

      cacheService.get.mockResolvedValue(mockStats);

      const result = await service.getStatistics({});

      expect(result).toEqual(mockStats);
      expect(cacheService.get).toHaveBeenCalled();
    });

    it('should calculate statistics when not cached', async () => {
      cacheService.get.mockResolvedValue(null);

      // Mock for total count
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(100);

      // Mock for action types groupBy
      (prismaService.auditLog.groupBy as jest.Mock).mockResolvedValueOnce([
        { actionType: AuditActionType.CREATE, _count: { actionType: 40 } },
        { actionType: AuditActionType.READ, _count: { actionType: 20 } },
        { actionType: AuditActionType.UPDATE, _count: { actionType: 30 } },
        { actionType: AuditActionType.DELETE, _count: { actionType: 10 } },
      ] as any);

      // Mock for severities groupBy
      (prismaService.auditLog.groupBy as jest.Mock).mockResolvedValueOnce([
        { severity: AuditSeverity.LOW, _count: { severity: 50 } },
        { severity: AuditSeverity.MEDIUM, _count: { severity: 30 } },
        { severity: AuditSeverity.HIGH, _count: { severity: 15 } },
        { severity: AuditSeverity.CRITICAL, _count: { severity: 5 } },
      ] as any);

      // Mock for success rate groupBy
      (prismaService.auditLog.groupBy as jest.Mock).mockResolvedValueOnce([
        { success: true, _count: { success: 90 } },
        { success: false, _count: { success: 10 } },
      ] as any);

      // Mock for top users groupBy
      (prismaService.auditLog.groupBy as jest.Mock).mockResolvedValueOnce([
        { userId: 'user-1', userEmail: 'user1@example.com', _count: { userId: 20 } },
        { userId: 'user-2', userEmail: 'user2@example.com', _count: { userId: 15 } },
      ] as any);

      // Mock for top resources groupBy
      (prismaService.auditLog.groupBy as jest.Mock).mockResolvedValueOnce([
        { resource: 'user', _count: { resource: 50 } },
        { resource: 'organization', _count: { resource: 30 } },
      ] as any);

      const result = await service.getStatistics({});

      expect(result.totalLogs).toBe(100);
      expect(result.actionTypes).toEqual({
        CREATE: 40,
        READ: 20,
        UPDATE: 30,
        DELETE: 10,
      });
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should handle errors during statistics calculation', async () => {
      cacheService.get.mockResolvedValue(null);
      (prismaService.auditLog.count as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.getStatistics({})).rejects.toThrow(BadRequestException);
    });
  });
});
