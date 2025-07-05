import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuditLogBatchService } from './audit-log-batch.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAuditLogDto } from '../dto';
import { AuditActionType, AuditSeverity } from '@prisma/generated/prisma/client';

describe('AuditLogBatchService', () => {
  let service: AuditLogBatchService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
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
  };

  const mockPrismaService = {
    auditLog: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogBatchService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuditLogBatchService>(AuditLogBatchService);
  });

  const validDto: CreateAuditLogDto = {
    actionType: AuditActionType.CREATE,
    severity: AuditSeverity.MEDIUM,
    action: 'create-user',
    resource: 'user',
    resourceId: '123',
    userId: 'user-123',
    userEmail: 'test@example.com',
    ipAddress: '192.168.1.1',
    httpMethod: 'POST',
    statusCode: 201,
    success: true,
  };

  describe('createBatch', () => {
    it('sollte erfolgreich einen Batch von Audit-Logs erstellen', async () => {
      const dtos = [validDto, { ...validDto, action: 'update-user' }];

      mockPrismaService.auditLog.createMany.mockResolvedValue({ count: 2 });
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        { id: '1', ...dtos[0], timestamp: new Date() },
        { id: '2', ...dtos[1], timestamp: new Date() },
      ]);

      const result = await service.createBatch(dtos);

      expect(result.totalProcessed).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);

      expect(mockPrismaService.auditLog.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            action: 'create-user',
            resource: 'user',
          }),
          expect.objectContaining({
            action: 'update-user',
            resource: 'user',
          }),
        ]),
        skipDuplicates: true,
      });
    });

    it('sollte ungültige Einträge ablehnen', async () => {
      const invalidDtos = [
        { ...validDto, action: '' }, // Leere Action
        { ...validDto, resource: '' }, // Leere Resource
        { ...validDto, ipAddress: 'invalid-ip' }, // Ungültige IP
        { ...validDto, statusCode: 999 }, // Ungültiger Status Code
      ];

      const result = await service.createBatch(invalidDtos);

      expect(result.totalProcessed).toBe(4);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(4);
      expect(result.failed).toHaveLength(4);

      expect(result.failed[0].error).toContain('action is required and cannot be empty');
      expect(result.failed[1].error).toContain('resource is required and cannot be empty');
      expect(result.failed[2].error).toContain('ipAddress must be a valid IPv4 or IPv6 address');
      expect(result.failed[3].error).toContain('statusCode must be a valid HTTP status code');
    });

    it('sollte Batch-Fehler behandeln', async () => {
      const dtos = [validDto];

      mockPrismaService.auditLog.createMany.mockRejectedValue(new Error('Database error'));

      const result = await service.createBatch(dtos);

      expect(result.totalProcessed).toBe(1);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Database error');
    });

    it('sollte große Batches in kleinere aufteilen', async () => {
      const largeBatch = Array(250).fill(validDto);

      mockPrismaService.auditLog.createMany
        .mockResolvedValueOnce({ count: 100 })
        .mockResolvedValueOnce({ count: 100 })
        .mockResolvedValueOnce({ count: 50 });

      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      await service.createBatch(largeBatch);

      expect(mockPrismaService.auditLog.createMany).toHaveBeenCalledTimes(3);
    });
  });

  describe('applyRetentionPolicy', () => {
    it('sollte Logs basierend auf Retention-Policy löschen', async () => {
      mockPrismaService.auditLog.deleteMany
        .mockResolvedValueOnce({ count: 10 }) // Retention-basiert
        .mockResolvedValueOnce({ count: 5 }); // Archiviert

      const result = await service.applyRetentionPolicy();

      expect(result).toBe(15);
      expect(mockPrismaService.auditLog.deleteMany).toHaveBeenCalledTimes(2);
    });

    it('sollte Fehler bei der Retention-Policy behandeln', async () => {
      mockPrismaService.auditLog.deleteMany.mockRejectedValue(new Error('Delete failed'));

      await expect(service.applyRetentionPolicy()).rejects.toThrow(
        'Failed to apply retention policy',
      );
    });
  });

  describe('getAggregatedStatistics', () => {
    it('sollte Statistiken nach Tag aggregieren', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');

      const mockLogs = [
        {
          timestamp: new Date('2024-01-01T10:00:00'),
          actionType: AuditActionType.CREATE,
          severity: AuditSeverity.MEDIUM,
          success: true,
          resource: 'user',
        },
        {
          timestamp: new Date('2024-01-01T15:00:00'),
          actionType: AuditActionType.UPDATE,
          severity: AuditSeverity.LOW,
          success: false,
          resource: 'user',
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getAggregatedStatistics(startDate, endDate, 'day');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        period: '2024-01-01',
        total: 2,
        byActionType: {
          CREATE: 1,
          UPDATE: 1,
        },
        bySeverity: {
          MEDIUM: 1,
          LOW: 1,
        },
        byResource: {
          user: 2,
        },
        successRate: {
          success: 1,
          failed: 1,
          percentage: 50,
        },
      });
    });

    it('sollte Fehler bei der Aggregation behandeln', async () => {
      mockPrismaService.auditLog.findMany.mockRejectedValue(new Error('Query failed'));

      await expect(service.getAggregatedStatistics(new Date(), new Date(), 'day')).rejects.toThrow(
        'Failed to generate aggregated statistics',
      );
    });
  });

  describe('exportLogs', () => {
    const mockLogs = [
      {
        id: '1',
        timestamp: '2024-01-01T10:00:00.000Z',
        actionType: AuditActionType.CREATE,
        severity: AuditSeverity.MEDIUM,
        action: 'create-user',
        resource: 'user',
        resourceId: '123',
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'ADMIN',
        ipAddress: '192.168.1.1',
        success: true,
        statusCode: 201,
        errorMessage: null,
      },
    ];

    it('sollte Logs als JSON exportieren', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.exportLogs({}, 'json');
      const parsed = JSON.parse(result as string);

      expect(parsed).toEqual(mockLogs);
    });

    it('sollte Logs als NDJSON exportieren', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.exportLogs({}, 'ndjson');
      const lines = (result as string).split('\n');

      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines[0])).toEqual(mockLogs[0]);
    });

    it('sollte Logs als CSV exportieren', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.exportLogs({}, 'csv');
      const lines = (result as string).split('\n');

      expect(lines[0]).toContain('id,timestamp,actionType');
      expect(lines[1]).toContain('1,');
      expect(lines[1]).toContain('create-user');
      expect(lines[1]).toContain('192.168.1.1');
    });

    it('sollte ungültige Export-Formate ablehnen', async () => {
      await expect(service.exportLogs({}, 'xml' as any)).rejects.toThrow(
        'Unsupported export format: xml',
      );
    });
  });

  describe('Validierung und Transformation', () => {
    it('sollte Retention-Period basierend auf Severity berechnen', async () => {
      const dtos = [
        { ...validDto, severity: AuditSeverity.LOW },
        { ...validDto, severity: AuditSeverity.CRITICAL },
        { ...validDto, severity: AuditSeverity.HIGH, compliance: ['GDPR'] },
      ];

      mockPrismaService.auditLog.createMany.mockResolvedValue({ count: 3 });
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      await service.createBatch(dtos);

      const createData = mockPrismaService.auditLog.createMany.mock.calls[0][0].data;

      expect(createData[0].retentionPeriod).toBe(90); // LOW
      expect(createData[1].retentionPeriod).toBe(730); // CRITICAL
      expect(createData[2].retentionPeriod).toBe(1095); // HIGH mit GDPR
    });

    it('sollte E-Mail-Adressen normalisieren', async () => {
      const dto = { ...validDto, userEmail: 'TEST@EXAMPLE.COM  ' };

      mockPrismaService.auditLog.createMany.mockResolvedValue({ count: 1 });
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      await service.createBatch([dto]);

      const createData = mockPrismaService.auditLog.createMany.mock.calls[0][0].data;
      expect(createData[0].userEmail).toBe('test@example.com');
    });

    it('sollte HTTP-Methoden normalisieren', async () => {
      const dto = { ...validDto, httpMethod: 'post' };

      mockPrismaService.auditLog.createMany.mockResolvedValue({ count: 1 });
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      await service.createBatch([dto]);

      const createData = mockPrismaService.auditLog.createMany.mock.calls[0][0].data;
      expect(createData[0].httpMethod).toBe('POST');
    });
  });
});
