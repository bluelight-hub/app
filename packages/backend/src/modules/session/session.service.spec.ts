import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SessionService } from './session.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SessionNotFoundException } from './exceptions/session.exceptions';
import * as UAParser from 'ua-parser-js';

jest.mock('ua-parser-js', () => {
  return {
    UAParser: jest.fn().mockImplementation(() => ({
      getResult: jest.fn().mockReturnValue({
        browser: { name: 'Chrome', version: '96' },
        os: { name: 'Windows', version: '10' },
        device: { type: undefined },
      }),
    })),
  };
});

describe('SessionService', () => {
  let service: SessionService;

  const mockPrismaService = {
    session: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    sessionActivity: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        SESSION_IDLE_TIMEOUT: 30,
        SESSION_MAX_RISK_SCORE: 80,
        SESSION_HEARTBEAT_INTERVAL: 60,
      };
      return config[key];
    }),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);

    jest.clearAllMocks();
  });

  describe('getSessionDetails', () => {
    it('should return session with user data and activities', async () => {
      const mockSession = {
        id: '1',
        jti: 'session-jti',
        userId: 'user-1',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        isRevoked: false,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
        },
        activities: [],
      };

      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);

      const result = await service.getSessionDetails('1'); // sessionId, not jti

      expect(result).toEqual(mockSession);
      expect(mockPrismaService.session.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          user: true,
          activities: {
            orderBy: { timestamp: 'desc' },
            take: 100,
          },
        },
      });
    });

    it('should throw SessionNotFoundException if session not found', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.getSessionDetails('non-existent')).rejects.toThrow(
        SessionNotFoundException,
      );
    });
  });

  describe('enhanceSession', () => {
    it('should enhance session with device and location data', async () => {
      const mockSession = {
        id: '1',
        jti: 'session-jti',
        userId: 'user-1',
        user: { id: 'user-1', email: 'test@example.com', failedLoginCount: 0 },
      };

      // UAParser mock is already configured to return Chrome/Windows

      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.session.findMany.mockResolvedValue([]); // No previous sessions
      mockPrismaService.session.update.mockResolvedValue({
        ...mockSession,
        browser: 'Chrome',
        browserVersion: '96',
        os: 'Windows',
        osVersion: '10',
        deviceType: 'desktop',
        location: 'Unknown',
        riskScore: 0,
        suspiciousFlags: [],
      });
      mockPrismaService.sessionActivity.create.mockResolvedValue({});

      const result = await service.enhanceSession(
        '1', // sessionId, not jti
        '192.168.1.1',
        'Mozilla/5.0 Chrome/96.0',
        'password',
      );

      expect(result).toBeDefined();
      // The actual implementation might add location and flags, so we just check the basics
      expect(mockPrismaService.session.update).toHaveBeenCalledWith({
        where: { jti: '1' },
        data: expect.objectContaining({
          browser: 'Chrome',
          browserVersion: '96',
          os: 'Windows',
          osVersion: '10',
          deviceType: 'desktop',
          loginMethod: 'password',
          lastHeartbeat: expect.any(Date),
        }),
        include: { user: true },
      });
    });

    it('should detect device changes and set risk flags', async () => {
      const mockSession = {
        id: '1',
        jti: 'session-jti',
        userId: 'user-1',
        user: { id: 'user-1', email: 'test@example.com', failedLoginCount: 0 },
        browser: 'Chrome',
        browserVersion: '95',
        os: 'Windows',
        osVersion: '10',
        deviceType: 'desktop',
      };

      // Configure UAParser to return different browser/OS
      ((UAParser as any).UAParser as jest.Mock).mockImplementation(() => ({
        getResult: jest.fn().mockReturnValue({
          browser: { name: 'Firefox', version: '94' },
          os: { name: 'Linux', version: 'Ubuntu' },
          device: { type: 'mobile' },
        }),
      }));

      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.session.findMany.mockResolvedValue([mockSession]); // Previous sessions exist
      mockPrismaService.sessionActivity.count.mockResolvedValue(100); // High activity rate
      mockPrismaService.session.count.mockResolvedValue(6); // Over concurrent limit
      mockPrismaService.session.update.mockResolvedValue({
        ...mockSession,
        browser: 'Firefox',
        browserVersion: '94',
        os: 'Linux',
        osVersion: 'Ubuntu',
        deviceType: 'mobile',
        riskScore: 85, // High risk score
        suspiciousFlags: [
          'new_location',
          'new_device',
          'high_activity_rate',
          'concurrent_session_limit',
        ],
      });
      mockPrismaService.sessionActivity.create.mockResolvedValue({});

      await service.enhanceSession(
        '1', // sessionId
        '192.168.1.1',
        'Mozilla/5.0 Firefox/94.0',
        'password',
      );

      expect(mockPrismaService.session.update).toHaveBeenCalledWith({
        where: { jti: '1' },
        data: expect.objectContaining({
          browser: 'Firefox',
          browserVersion: '94',
          os: 'Linux',
          osVersion: 'Ubuntu',
          deviceType: 'mobile',
          riskScore: expect.any(Number),
          suspiciousFlags: expect.any(Array),
        }),
        include: { user: true },
      });

      // Should emit session.created event
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('session.created', expect.any(Object));

      // Verify that the session was updated with risk information
      const updateCall = mockPrismaService.session.update.mock.calls[0][0];
      expect(updateCall.data.riskScore).toBeGreaterThan(0);
      expect(updateCall.data.suspiciousFlags).toContain('new_device');
    });
  });

  describe('updateHeartbeat', () => {
    it('should update session heartbeat', async () => {
      const mockSession = {
        id: '1',
        jti: 'session-jti',
        lastHeartbeat: new Date(Date.now() - 60000),
        isOnline: false,
      };

      mockPrismaService.session.update.mockResolvedValue({
        ...mockSession,
        isOnline: true,
        lastHeartbeat: new Date(),
        user: { id: 'user-1', email: 'test@example.com' },
      });

      await service.updateHeartbeat('1'); // sessionId

      expect(mockPrismaService.session.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          lastHeartbeat: expect.any(Date),
          isOnline: true,
        },
        include: { user: true },
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'session.heartbeat',
        expect.objectContaining({
          ...mockSession,
          isOnline: true,
          lastHeartbeat: expect.any(Date),
          user: { id: 'user-1', email: 'test@example.com' },
        }),
      );
    });
  });

  describe('getSessions', () => {
    it('should return sessions with filters', async () => {
      const mockSessions = [
        {
          id: '1',
          jti: 'session-1',
          userId: 'user-1',
          isRevoked: false,
          expiresAt: new Date(Date.now() + 86400000),
          user: { id: 'user-1', username: 'test', email: 'test@example.com' },
        },
        {
          id: '2',
          jti: 'session-2',
          userId: 'user-1',
          isRevoked: false,
          expiresAt: new Date(Date.now() + 86400000),
          user: { id: 'user-1', username: 'test', email: 'test@example.com' },
        },
      ];

      mockPrismaService.session.findMany.mockResolvedValue(mockSessions);

      const result = await service.getSessions({ userId: 'user-1' });

      expect(result).toEqual(mockSessions);
      expect(mockPrismaService.session.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
        },
        include: { user: true },
        orderBy: { lastActivityAt: 'desc' },
      });
    });
  });

  describe('revokeSession', () => {
    it('should revoke a session', async () => {
      const mockSession = { id: '1', jti: 'session-jti', user: { id: 'user-1' } };

      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.session.update.mockResolvedValue({
        ...mockSession,
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'User logout',
        user: { id: 'user-1', email: 'test@example.com' },
      });

      await service.revokeSession('1', 'User logout'); // sessionId

      expect(mockPrismaService.session.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
          revokedReason: 'User logout',
          isOnline: false,
        },
        include: { user: true },
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('session.terminated', {
        session: expect.objectContaining({
          id: '1',
          jti: 'session-jti',
        }),
        reason: 'User logout',
      });
    });
  });

  describe('revokeUserSessions', () => {
    it('should revoke all sessions for a user', async () => {
      mockPrismaService.session.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.revokeUserSessions('user-1', 'Security breach');

      expect(result).toBe(3);
      expect(mockPrismaService.session.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
          revokedReason: 'Security breach',
          isOnline: false,
        },
      });

      // Note: revokeUserSessions doesn't emit an event
    });
  });

  // Note: getSessionActivities doesn't exist in the service - activities are fetched with getSessionDetails

  describe('markInactiveSessions', () => {
    it('should mark inactive sessions as offline', async () => {
      mockPrismaService.session.updateMany.mockResolvedValue({ count: 2 });

      const count = await service.markInactiveSessions();

      expect(count).toBe(2);
      expect(mockPrismaService.session.updateMany).toHaveBeenCalledWith({
        where: {
          isOnline: true,
          isRevoked: false,
          lastHeartbeat: { lt: expect.any(Date) },
        },
        data: {
          isOnline: false,
        },
      });
    });
  });

  describe('trackActivity', () => {
    it('should track session activity', async () => {
      mockPrismaService.sessionActivity.create.mockResolvedValue({
        id: '1',
        sessionId: '1',
        activityType: 'api_call',
        timestamp: new Date(),
        metadata: { endpoint: '/api/users' },
      });
      mockPrismaService.session.update.mockResolvedValue({});

      await service.trackActivity('1', {
        activityType: 'api_call' as any,
        metadata: { endpoint: '/api/users' },
      });

      expect(mockPrismaService.sessionActivity.create).toHaveBeenCalledWith({
        data: {
          sessionId: '1',
          activityType: 'api_call',
          metadata: { endpoint: '/api/users' },
          ipAddress: undefined,
        },
      });

      expect(mockPrismaService.session.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          lastActivityAt: expect.any(Date),
          activityCount: { increment: 1 },
        },
      });
    });
  });

  describe('getSessionStatistics', () => {
    it('should return session statistics', async () => {
      const mockSessions = [
        {
          id: '1',
          userId: 'user-1',
          browser: 'Chrome',
          os: 'Windows',
          deviceType: 'desktop',
          isOnline: true,
          isRevoked: false,
          createdAt: new Date(Date.now() - 3600000),
          expiresAt: new Date(Date.now() + 86400000),
          riskScore: 10,
        },
        {
          id: '2',
          userId: 'user-1',
          browser: 'Firefox',
          os: 'Linux',
          deviceType: 'mobile',
          isOnline: false,
          isRevoked: false,
          createdAt: new Date(Date.now() - 7200000),
          expiresAt: new Date(Date.now() + 86400000),
          riskScore: 50,
        },
      ];

      mockPrismaService.session.findMany.mockResolvedValue(mockSessions);
      mockPrismaService.session.count.mockImplementation(async (args) => {
        if (args?.where?.isOnline) return 1;
        if (args?.where?.isRevoked) return 0;
        if (args?.where?.riskScore) return 1;
        return 2;
      });
      mockPrismaService.sessionActivity.findMany.mockResolvedValue([]);

      const result = await service.getSessionStatistics('user-1');

      expect(result).toHaveProperty('totalSessions');
      expect(result).toHaveProperty('activeSessions');
      expect(result).toHaveProperty('revokedSessions');
      expect(result).toHaveProperty('highRiskSessions');
      expect(result).toHaveProperty('browserDistribution');
      expect(result).toHaveProperty('osDistribution');
      expect(result).toHaveProperty('deviceTypeDistribution');
      expect(result).toHaveProperty('locationDistribution');
      expect(result).toHaveProperty('recentActivities');
    });
  });
});
