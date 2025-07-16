import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LoginAttemptController } from './login-attempt.controller';
import { LoginAttemptService } from '../services/login-attempt.service';
import { LoginAttemptStatsDto } from '../dto/login-attempt.dto';
import { LoginAttempt } from '@prisma/generated/prisma';

describe('LoginAttemptController', () => {
  let controller: LoginAttemptController;
  let service: LoginAttemptService;

  const mockLoginAttemptService = {
    getLoginStats: jest.fn(),
    getRecentAttempts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoginAttemptController],
      providers: [
        {
          provide: LoginAttemptService,
          useValue: mockLoginAttemptService,
        },
      ],
    }).compile();

    controller = module.get<LoginAttemptController>(LoginAttemptController);
    service = module.get<LoginAttemptService>(LoginAttemptService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLoginStats', () => {
    it('should return login statistics for valid date range', async () => {
      const startDate = '2024-01-01T00:00:00.000Z';
      const endDate = '2024-01-31T23:59:59.999Z';
      const email = 'test@example.com';

      const mockStats: LoginAttemptStatsDto = {
        totalAttempts: 100,
        successfulAttempts: 80,
        failedAttempts: 20,
        uniqueIps: 15,
        suspiciousAttempts: 5,
        averageRiskScore: 25,
        periodStart: new Date(startDate),
        periodEnd: new Date(endDate),
      };

      mockLoginAttemptService.getLoginStats.mockResolvedValue(mockStats);

      const result = await controller.getLoginStats(startDate, endDate, email);

      expect(result).toEqual(mockStats);
      expect(service.getLoginStats).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
        email,
      );
    });

    it('should throw BadRequestException for invalid date format', async () => {
      const invalidStartDate = 'invalid-date';
      const endDate = '2024-01-31T23:59:59.999Z';

      await expect(controller.getLoginStats(invalidStartDate, endDate)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getLoginStats(invalidStartDate, endDate)).rejects.toThrow(
        'Invalid date format',
      );
    });

    it('should throw BadRequestException when start date is after end date', async () => {
      const startDate = '2024-02-01T00:00:00.000Z';
      const endDate = '2024-01-01T00:00:00.000Z';

      await expect(controller.getLoginStats(startDate, endDate)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getLoginStats(startDate, endDate)).rejects.toThrow(
        'Start date must be before end date',
      );
    });

    it('should work without email parameter', async () => {
      const startDate = '2024-01-01T00:00:00.000Z';
      const endDate = '2024-01-31T23:59:59.999Z';

      const mockStats: LoginAttemptStatsDto = {
        totalAttempts: 500,
        successfulAttempts: 400,
        failedAttempts: 100,
        uniqueIps: 50,
        suspiciousAttempts: 10,
        averageRiskScore: 20,
        periodStart: new Date(startDate),
        periodEnd: new Date(endDate),
      };

      mockLoginAttemptService.getLoginStats.mockResolvedValue(mockStats);

      const result = await controller.getLoginStats(startDate, endDate);

      expect(result).toEqual(mockStats);
      expect(service.getLoginStats).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
        undefined,
      );
    });
  });

  describe('getRecentAttempts', () => {
    it('should return recent login attempts', async () => {
      const mockAttempts: LoginAttempt[] = [
        {
          id: 'attempt-1',
          userId: 'user-123',
          email: 'user@example.com',
          attemptAt: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          success: true,
          failureReason: null,
          location: 'New York, US',
          deviceType: 'desktop',
          browser: 'Chrome',
          os: 'Windows',
          suspicious: false,
          riskScore: 0,
          metadata: null,
        },
        {
          id: 'attempt-2',
          userId: null,
          email: 'unknown@example.com',
          attemptAt: new Date(),
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          success: false,
          failureReason: 'User not found',
          location: null,
          deviceType: 'mobile',
          browser: 'Safari',
          os: 'iOS',
          suspicious: true,
          riskScore: 75,
          metadata: null,
        },
      ];

      mockLoginAttemptService.getRecentAttempts.mockResolvedValue(mockAttempts);

      const result = await controller.getRecentAttempts();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'attempt-1',
        email: 'user@example.com',
        success: true,
        suspicious: false,
      });
      expect(service.getRecentAttempts).toHaveBeenCalledWith(undefined, 10);
    });

    it('should filter by email when provided', async () => {
      const email = 'test@example.com';
      const mockAttempts: LoginAttempt[] = [
        {
          id: 'attempt-1',
          userId: 'user-123',
          email,
          attemptAt: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          success: true,
          failureReason: null,
          location: null,
          deviceType: 'desktop',
          browser: 'Chrome',
          os: 'Windows',
          suspicious: false,
          riskScore: 0,
          metadata: null,
        },
      ];

      mockLoginAttemptService.getRecentAttempts.mockResolvedValue(mockAttempts);

      const result = await controller.getRecentAttempts(email);

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe(email);
      expect(service.getRecentAttempts).toHaveBeenCalledWith(email, 10);
    });

    it('should limit results when limit parameter is provided', async () => {
      const limit = 50;
      mockLoginAttemptService.getRecentAttempts.mockResolvedValue([]);

      await controller.getRecentAttempts(undefined, limit);

      expect(service.getRecentAttempts).toHaveBeenCalledWith(undefined, 50);
    });

    it('should enforce maximum limit of 100', async () => {
      const limit = 200;
      mockLoginAttemptService.getRecentAttempts.mockResolvedValue([]);

      await controller.getRecentAttempts(undefined, limit);

      expect(service.getRecentAttempts).toHaveBeenCalledWith(undefined, 100);
    });

    it('should use default limit when limit is 0', async () => {
      const limit = 0;
      mockLoginAttemptService.getRecentAttempts.mockResolvedValue([]);

      await controller.getRecentAttempts(undefined, limit);

      expect(service.getRecentAttempts).toHaveBeenCalledWith(undefined, 10);
    });
  });
});
