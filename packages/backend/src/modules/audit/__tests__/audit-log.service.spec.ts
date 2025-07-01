import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuditLogService } from '../services/audit-log.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAuditLogDto, QueryAuditLogDto } from '../dto';
import { AuditActionType, AuditSeverity } from '@prisma/generated/prisma/enums';

// Mock consola logger
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('AuditLogService', () => {
  let service: AuditLogService;

  const mockPrismaService = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    // Reset mock for each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an audit log entry with default values', async () => {
      const createDto: CreateAuditLogDto = {
        actionType: AuditActionType.CREATE,
        action: 'create-user',
        resource: 'user',
        resourceId: 'user_123',
        userId: 'admin_456',
        userEmail: 'admin@test.com',
      };

      const expectedAuditLog = {
        id: 'audit_789',
        ...createDto,
        severity: AuditSeverity.MEDIUM,
        success: true,
        sensitiveData: false,
        requiresReview: false,
        compliance: [],
        affectedFields: [],
        timestamp: new Date(),
      };

      mockPrismaService.auditLog.create.mockResolvedValue(expectedAuditLog);

      const result = await service.create(createDto);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          severity: AuditSeverity.MEDIUM,
          success: true,
          sensitiveData: false,
          requiresReview: false,
          compliance: [],
          affectedFields: [],
        },
      });
      expect(result).toEqual(expectedAuditLog);
    });

    it('should throw BadRequestException when creation fails', async () => {
      const createDto: CreateAuditLogDto = {
        actionType: AuditActionType.CREATE,
        action: 'create-user',
        resource: 'user',
      };

      mockPrismaService.auditLog.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findMany', () => {
    it('should return paginated audit logs with default parameters', async () => {
      const queryDto: QueryAuditLogDto = {};
      const mockAuditLogs = [
        { id: 'audit_1', action: 'create-user', timestamp: new Date() },
        { id: 'audit_2', action: 'update-user', timestamp: new Date() },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockAuditLogs);
      mockPrismaService.auditLog.count.mockResolvedValue(50);

      const result = await service.findMany(queryDto);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { archivedAt: null },
        orderBy: { timestamp: 'desc' },
        skip: 0,
        take: 50,
      });
      expect(result.items).toEqual([
        {
          ...mockAuditLogs[0],
          oldValues: undefined,
          newValues: undefined,
          metadata: undefined,
        },
        {
          ...mockAuditLogs[1],
          oldValues: undefined,
          newValues: undefined,
          metadata: undefined,
        },
      ]);
      expect(result.pagination).toEqual({
        currentPage: 1,
        itemsPerPage: 50,
        totalItems: 50,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should apply filters correctly', async () => {
      const queryDto: QueryAuditLogDto = {
        actionType: AuditActionType.CREATE,
        severity: AuditSeverity.HIGH,
        userId: 'user_123',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        search: 'user creation',
        page: 2,
        limit: 25,
        sortBy: 'severity',
        sortOrder: 'asc',
      };

      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.findMany(queryDto);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          archivedAt: null,
          actionType: AuditActionType.CREATE,
          severity: AuditSeverity.HIGH,
          userId: 'user_123',
          timestamp: {
            gte: new Date('2024-01-01T00:00:00Z'),
            lte: new Date('2024-12-31T23:59:59Z'),
          },
          OR: [
            { action: { contains: 'user creation', mode: 'insensitive' } },
            { resource: { contains: 'user creation', mode: 'insensitive' } },
            { errorMessage: { contains: 'user creation', mode: 'insensitive' } },
            { userEmail: { contains: 'user creation', mode: 'insensitive' } },
          ],
        },
        orderBy: { severity: 'asc' },
        skip: 25,
        take: 25,
      });
    });

    it('should handle HTTP methods and compliance filters', async () => {
      const queryDto: QueryAuditLogDto = {
        httpMethods: ['POST', 'PUT'],
        compliance: ['GDPR', 'HIPAA'],
      };

      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.findMany(queryDto);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          archivedAt: null,
          httpMethod: { in: ['POST', 'PUT'] },
          compliance: { hasSome: ['GDPR', 'HIPAA'] },
        },
        orderBy: { timestamp: 'desc' },
        skip: 0,
        take: 50,
      });
    });
  });

  describe('findOne', () => {
    it('should return audit log by id', async () => {
      const auditLogId = 'audit_123';
      const mockAuditLog = {
        id: auditLogId,
        action: 'create-user',
        timestamp: new Date(),
      };

      mockPrismaService.auditLog.findUnique.mockResolvedValue(mockAuditLog);

      const result = await service.findOne(auditLogId);

      expect(mockPrismaService.auditLog.findUnique).toHaveBeenCalledWith({
        where: { id: auditLogId },
      });
      expect(result).toEqual(mockAuditLog);
    });

    it('should throw NotFoundException when audit log not found', async () => {
      const auditLogId = 'audit_nonexistent';

      mockPrismaService.auditLog.findUnique.mockResolvedValue(null);

      await expect(service.findOne(auditLogId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAsReviewed', () => {
    it('should mark audit log as reviewed', async () => {
      const auditLogId = 'audit_123';
      const reviewedBy = 'admin_456';
      const mockUpdatedAuditLog = {
        id: auditLogId,
        reviewedBy,
        reviewedAt: new Date(),
      };

      mockPrismaService.auditLog.update.mockResolvedValue(mockUpdatedAuditLog);

      const result = await service.markAsReviewed(auditLogId, reviewedBy);

      expect(mockPrismaService.auditLog.update).toHaveBeenCalledWith({
        where: { id: auditLogId },
        data: {
          reviewedBy,
          reviewedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(mockUpdatedAuditLog);
    });

    it('should throw NotFoundException when audit log not found for review', async () => {
      const auditLogId = 'audit_nonexistent';
      const reviewedBy = 'admin_456';

      mockPrismaService.auditLog.update.mockRejectedValue({ code: 'P2025' });

      await expect(service.markAsReviewed(auditLogId, reviewedBy)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('archiveOldLogs', () => {
    it('should archive logs older than specified days', async () => {
      const daysToKeep = 30;
      const mockResult = { count: 25 };

      mockPrismaService.auditLog.updateMany.mockResolvedValue(mockResult);

      const result = await service.archiveOldLogs(daysToKeep);

      expect(mockPrismaService.auditLog.updateMany).toHaveBeenCalledWith({
        where: {
          timestamp: { lt: expect.any(Date) },
          archivedAt: null,
        },
        data: {
          archivedAt: expect.any(Date),
        },
      });
      expect(result).toBe(25);
    });
  });

  describe('deleteArchivedLogs', () => {
    it('should delete archived logs older than specified days', async () => {
      const olderThanDays = 90;
      const mockResult = { count: 15 };

      mockPrismaService.auditLog.deleteMany.mockResolvedValue(mockResult);

      const result = await service.deleteArchivedLogs(olderThanDays);

      expect(mockPrismaService.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          archivedAt: { lt: expect.any(Date) },
        },
      });
      expect(result).toBe(15);
    });
  });

  describe('getStatistics', () => {
    it('should return comprehensive statistics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPrismaService.auditLog.count.mockResolvedValue(100);
      mockPrismaService.auditLog.groupBy
        .mockResolvedValueOnce([
          { actionType: AuditActionType.CREATE, _count: { actionType: 60 } },
          { actionType: AuditActionType.UPDATE, _count: { actionType: 40 } },
        ])
        .mockResolvedValueOnce([
          { severity: AuditSeverity.HIGH, _count: { severity: 20 } },
          { severity: AuditSeverity.MEDIUM, _count: { severity: 80 } },
        ])
        .mockResolvedValueOnce([
          { success: true, _count: { success: 90 } },
          { success: false, _count: { success: 10 } },
        ])
        .mockResolvedValueOnce([
          { userId: 'user_1', userEmail: 'user1@test.com', _count: { userId: 50 } },
        ])
        .mockResolvedValueOnce([
          { resource: 'user', _count: { resource: 70 } },
          { resource: 'einsatz', _count: { resource: 30 } },
        ]);

      const result = await service.getStatistics({ startDate, endDate });

      expect(result).toEqual({
        totalLogs: 100,
        actionTypes: {
          [AuditActionType.CREATE]: 60,
          [AuditActionType.UPDATE]: 40,
        },
        severities: {
          [AuditSeverity.HIGH]: 20,
          [AuditSeverity.MEDIUM]: 80,
        },
        successRate: {
          success: 90,
          failed: 10,
        },
        topUsers: [
          {
            userId: 'user_1',
            userEmail: 'user1@test.com',
            count: 50,
          },
        ],
        topResources: [
          {
            resource: 'user',
            count: 70,
          },
          {
            resource: 'einsatz',
            count: 30,
          },
        ],
      });
    });
  });
});
