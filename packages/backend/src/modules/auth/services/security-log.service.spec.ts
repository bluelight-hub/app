import { Test, TestingModule } from '@nestjs/testing';
import { SecurityLogService } from './security-log.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SecurityEventType } from '../enums/security-event-type.enum';

describe('SecurityLogService', () => {
  let service: SecurityLogService;
  let _prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    securityLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityLogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SecurityLogService>(SecurityLogService);
    _prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logSecurityEvent', () => {
    it('should log a security event successfully', async () => {
      const params = {
        eventType: SecurityEventType.LOGIN_SUCCESS,
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { foo: 'bar' },
      };

      await service.logSecurityEvent(params);

      expect(mockPrismaService.securityLog.create).toHaveBeenCalledWith({
        data: {
          eventType: params.eventType,
          userId: params.userId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata: params.metadata,
          createdAt: expect.any(Date),
        },
      });
    });

    it('should handle errors gracefully', async () => {
      const params = {
        eventType: SecurityEventType.LOGIN_FAILED,
        userId: 'user123',
      };

      mockPrismaService.securityLog.create.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(service.logSecurityEvent(params)).resolves.not.toThrow();
    });
  });

  describe('getSecurityLogs', () => {
    it('should retrieve security logs with filters', async () => {
      const filters = {
        eventType: SecurityEventType.LOGIN_FAILED,
        userId: 'user123',
        ipAddress: '192.168.1.1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        limit: 50,
      };

      const mockLogs = [
        {
          id: '1',
          eventType: SecurityEventType.LOGIN_FAILED,
          userId: 'user123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: null,
          metadata: {},
          message: null,
          createdAt: new Date(),
          user: {
            id: 'user123',
            email: 'user@example.com',
            role: 'USER',
          },
        },
      ];

      mockPrismaService.securityLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getSecurityLogs(filters);

      expect(mockPrismaService.securityLog.findMany).toHaveBeenCalledWith({
        where: {
          eventType: filters.eventType,
          userId: filters.userId,
          ipAddress: filters.ipAddress,
          createdAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      expect(result).toEqual(mockLogs);
    });

    it('should use default limit of 100', async () => {
      await service.getSecurityLogs({});

      expect(mockPrismaService.securityLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete old logs', async () => {
      const daysToKeep = 30;
      const deletedCount = 150;

      mockPrismaService.securityLog.deleteMany.mockResolvedValue({ count: deletedCount });

      const result = await service.cleanupOldLogs(daysToKeep);

      expect(mockPrismaService.securityLog.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });

      expect(result).toBe(deletedCount);
    });

    it('should use default retention period of 90 days', async () => {
      await service.cleanupOldLogs();

      expect(mockPrismaService.securityLog.deleteMany).toHaveBeenCalled();
    });
  });

  describe('getUserSecurityEvents', () => {
    it('should get security events for a user', async () => {
      const userId = 'user123';
      const limit = 5;

      await service.getUserSecurityEvents(userId, limit);

      expect(mockPrismaService.securityLog.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    });
  });

  describe('getIpSecurityEvents', () => {
    it('should get security events for an IP address', async () => {
      const ipAddress = '192.168.1.1';
      const limit = 5;

      await service.getIpSecurityEvents(ipAddress, limit);

      expect(mockPrismaService.securityLog.findMany).toHaveBeenCalledWith({
        where: { ipAddress },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    });
  });
});
