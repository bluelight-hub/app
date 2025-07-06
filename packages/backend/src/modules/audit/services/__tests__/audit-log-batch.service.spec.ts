import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogBatchService } from '../audit-log-batch.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateAuditLogDto, QueryAuditLogDto } from '../../dto';
import { BadRequestException } from '@nestjs/common';
import {
  AuditActionType,
  AuditLog,
  AuditSeverity,
  UserRole,
} from '@prisma/generated/prisma/client';

describe('AuditLogBatchService', () => {
  let service: AuditLogBatchService;
  let prismaService: PrismaService;

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
    oldValues: null,
    newValues: null,
    affectedFields: [],
    metadata: null,
    timestamp: new Date('2024-01-01'),
    duration: 150,
    success: true,
    errorMessage: null,
    statusCode: 201,
    compliance: [],
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
    duration: 150,
    success: true,
    statusCode: 201,
    sensitiveData: false,
    requiresReview: false,
    retentionPeriod: 365,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogBatchService,
        {
          provide: PrismaService,
          useValue: {
            auditLog: {
              createMany: jest.fn(),
              updateMany: jest.fn(),
              findMany: jest.fn(),
              deleteMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: any = {
                AUDIT_BATCH_SIZE: 100,
                AUDIT_DEFAULT_RETENTION_DAYS: 365,
                AUDIT_RETENTION_LOW: 90,
                AUDIT_RETENTION_MEDIUM: 180,
                AUDIT_RETENTION_HIGH: 365,
                AUDIT_RETENTION_CRITICAL: 730,
                AUDIT_RETENTION_GDPR: 1095,
                AUDIT_RETENTION_HIPAA: 2190,
                AUDIT_RETENTION_SOX: 2555,
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuditLogBatchService>(AuditLogBatchService);
    prismaService = module.get(PrismaService);
  });

  describe('createBatch', () => {
    it('should successfully create multiple audit logs', async () => {
      const mockDtos = [mockCreateDto, { ...mockCreateDto, action: 'update-user' }];
      (prismaService.auditLog.createMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        mockAuditLog,
        { ...mockAuditLog, action: 'update-user' },
      ]);

      const result = await service.createBatch(mockDtos);

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.totalProcessed).toBe(2);
    });

    it('should handle validation errors', async () => {
      const invalidDto = { ...mockCreateDto, action: '' }; // Invalid action
      const mockDtos = [mockCreateDto, invalidDto];

      (prismaService.auditLog.createMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([mockAuditLog]);

      const result = await service.createBatch(mockDtos);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.failed[0].error).toContain('action is required and cannot be empty');
    });

    it('should handle database errors during batch creation', async () => {
      (prismaService.auditLog.createMany as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.createBatch([mockCreateDto]);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failed[0].error).toContain('Database error');
    });

    it('should handle empty batch', async () => {
      const result = await service.createBatch([]);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(result.totalProcessed).toBe(0);
    });

    it('should validate field lengths', async () => {
      const longActionDto = { ...mockCreateDto, action: 'a'.repeat(101) };
      const longResourceDto = { ...mockCreateDto, resource: 'r'.repeat(101) };
      const longResourceIdDto = { ...mockCreateDto, resourceId: 'id'.repeat(128) };

      (prismaService.auditLog.createMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.createBatch([longActionDto, longResourceDto, longResourceIdDto]);

      expect(result.failureCount).toBe(3);
      expect(result.failed[0].error).toContain('action must not exceed 100 characters');
      expect(result.failed[1].error).toContain('resource must not exceed 100 characters');
      expect(result.failed[2].error).toContain('resourceId must not exceed 255 characters');
    });

    it('should validate IP address format', async () => {
      const invalidIpDto = { ...mockCreateDto, ipAddress: 'invalid-ip' };

      (prismaService.auditLog.createMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.createBatch([invalidIpDto]);

      expect(result.failureCount).toBe(1);
      expect(result.failed[0].error).toContain('ipAddress must be a valid IPv4 or IPv6 address');
    });

    it('should validate status code range', async () => {
      const invalidStatusDto = { ...mockCreateDto, statusCode: 600 };

      (prismaService.auditLog.createMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.createBatch([invalidStatusDto]);

      expect(result.failureCount).toBe(1);
      expect(result.failed[0].error).toContain(
        'statusCode must be a valid HTTP status code (100-599)',
      );
    });

    it('should validate HTTP method', async () => {
      const invalidMethodDto = { ...mockCreateDto, httpMethod: 'INVALID' };

      (prismaService.auditLog.createMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.createBatch([invalidMethodDto]);

      expect(result.failureCount).toBe(1);
      expect(result.failed[0].error).toContain('httpMethod must be one of');
    });

    it('should validate required fields', async () => {
      const missingActionTypeDto = { ...mockCreateDto, actionType: undefined as any };
      const missingResourceDto = { ...mockCreateDto, resource: '' };

      (prismaService.auditLog.createMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.createBatch([missingActionTypeDto, missingResourceDto]);

      expect(result.failureCount).toBe(2);
      expect(result.failed[0].error).toContain('actionType is required');
      expect(result.failed[1].error).toContain('resource is required and cannot be empty');
    });
  });

  describe('applyRetentionPolicy', () => {
    it('should apply retention policies and delete old entries', async () => {
      (prismaService.auditLog.deleteMany as jest.Mock)
        .mockResolvedValueOnce({ count: 10 }) // Retention-based deletion
        .mockResolvedValueOnce({ count: 5 }); // Archived entries deletion

      const result = await service.applyRetentionPolicy();

      expect(result).toBe(15);
      expect(prismaService.auditLog.deleteMany).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during retention policy application', async () => {
      (prismaService.auditLog.deleteMany as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.applyRetentionPolicy()).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAggregatedStatistics', () => {
    it('should aggregate statistics by day', async () => {
      const mockLogs = [
        { ...mockAuditLog, timestamp: new Date('2024-01-01') },
        { ...mockAuditLog, timestamp: new Date('2024-01-01'), success: false },
        { ...mockAuditLog, timestamp: new Date('2024-01-02'), actionType: AuditActionType.UPDATE },
      ];

      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

      const result = await service.getAggregatedStatistics(
        new Date('2024-01-01'),
        new Date('2024-01-02'),
        'day',
      );

      expect(result).toHaveLength(2);
      expect(result[0].period).toBe('2024-01-01');
      expect(result[0].total).toBe(2);
      expect(result[0].successRate.percentage).toBe(50);
    });

    it('should aggregate statistics by hour', async () => {
      const mockLogs = [
        { ...mockAuditLog, timestamp: new Date(Date.UTC(2024, 0, 1, 9, 0, 0)) },
        { ...mockAuditLog, timestamp: new Date(Date.UTC(2024, 0, 1, 9, 30, 0)) },
        { ...mockAuditLog, timestamp: new Date(Date.UTC(2024, 0, 1, 10, 0, 0)) },
      ];

      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

      const result = await service.getAggregatedStatistics(
        new Date(Date.UTC(2024, 0, 1, 9, 0, 0)),
        new Date(Date.UTC(2024, 0, 1, 10, 0, 0)),
        'hour',
      );

      expect(result).toHaveLength(2);
      expect(result[0].period).toBe('2024-01-01T09:00');
      expect(result[0].total).toBe(2);
    });

    it('should aggregate statistics by week', async () => {
      const mockLogs = [
        { ...mockAuditLog, timestamp: new Date(Date.UTC(2024, 0, 1)) },
        { ...mockAuditLog, timestamp: new Date(Date.UTC(2024, 0, 8)) },
      ];

      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

      const result = await service.getAggregatedStatistics(
        new Date(Date.UTC(2024, 0, 1)),
        new Date(Date.UTC(2024, 0, 8)),
        'week',
      );

      expect(result).toHaveLength(2);
      expect(result[0].period).toContain('Week');
    });

    it('should aggregate statistics by month', async () => {
      const mockLogs = [
        { ...mockAuditLog, timestamp: new Date(Date.UTC(2024, 0, 1)) },
        { ...mockAuditLog, timestamp: new Date(Date.UTC(2024, 1, 1)) },
      ];

      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

      const result = await service.getAggregatedStatistics(
        new Date(Date.UTC(2024, 0, 1)),
        new Date(Date.UTC(2024, 1, 1)),
        'month',
      );

      expect(result).toHaveLength(2);
      expect(result[0].period).toBe('2024-01');
      expect(result[1].period).toBe('2024-02');
    });

    it('should handle errors during aggregation', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        service.getAggregatedStatistics(
          new Date(Date.UTC(2024, 0, 1)),
          new Date(Date.UTC(2024, 0, 2)),
          'day',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('exportLogs', () => {
    it('should export logs as JSON', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([mockAuditLog]);

      const result = await service.exportLogs({}, 'json');

      expect(result).toBe(JSON.stringify([mockAuditLog], null, 2));
    });

    it('should export logs as CSV', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([mockAuditLog]);

      const result = await service.exportLogs({}, 'csv');

      expect(result).toContain('id,timestamp,actionType');
      expect(result).toContain('audit-123');
    });

    it('should export logs as NDJSON', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([mockAuditLog]);

      const result = await service.exportLogs({}, 'ndjson');

      expect(result).toContain(JSON.stringify(mockAuditLog));
      expect(result.split('\n').length).toBe(1); // Just one log
    });

    it('should apply query filters', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const queryDto: QueryAuditLogDto = {
        actionType: AuditActionType.UPDATE,
        severity: AuditSeverity.HIGH,
        userId: 'user-123',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      await service.exportLogs(queryDto);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            actionType: AuditActionType.UPDATE,
            severity: AuditSeverity.HIGH,
            userId: 'user-123',
            timestamp: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
          orderBy: { timestamp: 'desc' },
        }),
      );
    });

    it('should handle export errors', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.exportLogs({})).rejects.toThrow(BadRequestException);
    });

    it('should throw error for unsupported format', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.exportLogs({}, 'xml' as any)).rejects.toThrow(BadRequestException);
    });
  });
});
