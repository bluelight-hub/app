import { Test, TestingModule } from '@nestjs/testing';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { SessionFilterDto } from './dto/session.dto';

describe('SessionController', () => {
  let controller: SessionController;

  const mockSessionService = {
    getSessions: jest.fn(),
    getSessionDetails: jest.fn(),
    getSessionStatistics: jest.fn(),
    updateHeartbeat: jest.fn(),
    revokeSession: jest.fn(),
    trackActivity: jest.fn(),
    revokeUserSessions: jest.fn(),
  };

  const mockSession = {
    id: '1',
    jti: 'session-jti-123',
    userId: 'user-123',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000),
    isRevoked: false,
    browser: 'Chrome',
    browserVersion: '96',
    os: 'Windows',
    osVersion: '10',
    deviceType: 'desktop',
    location: 'New York, US',
    isOnline: true,
    lastActivityAt: new Date(),
    activityCount: 42,
    riskScore: 10,
    user: {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
    },
    activities: [
      {
        id: '1',
        sessionId: 'session-1',
        activityType: 'LOGIN',
        timestamp: new Date(),
        metadata: {},
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
      ],
    }).compile();

    controller = module.get<SessionController>(SessionController);

    jest.clearAllMocks();
  });

  describe('getSessions', () => {
    it('should return all sessions with filters', async () => {
      const mockSessions = [mockSession];
      const filter: SessionFilterDto = { userId: 'user-123' };

      mockSessionService.getSessions.mockResolvedValue(mockSessions);

      const result = await controller.getSessions(filter);

      expect(result).toBeDefined();
      expect(mockSessionService.getSessions).toHaveBeenCalledWith(filter);
    });
  });

  describe('getStatistics', () => {
    it('should return session statistics', async () => {
      const mockStats = {
        totalSessions: 10,
        activeSessions: 5,
        averageSessionDuration: 3600,
        sessionsByBrowser: { Chrome: 7, Firefox: 3 },
        sessionsByOS: { Windows: 6, Linux: 4 },
      };

      mockSessionService.getSessionStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStatistics('user-123');

      expect(result).toEqual(mockStats);
      expect(mockSessionService.getSessionStatistics).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getMySessions', () => {
    it('should return sessions for the current user', async () => {
      const mockSessions = [mockSession];
      const req = { user: { userId: 'user-123' } };

      mockSessionService.getSessions.mockResolvedValue(mockSessions);

      const result = await controller.getMySessions(req);

      expect(result).toBeDefined();
      expect(mockSessionService.getSessions).toHaveBeenCalledWith({ userId: 'user-123' });
    });
  });

  describe('getSessionDetails', () => {
    it('should return session details with activities', async () => {
      mockSessionService.getSessionDetails.mockResolvedValue(mockSession);

      const result = await controller.getSessionDetails('session-jti-123');

      expect(result).toBeDefined();
      expect(mockSessionService.getSessionDetails).toHaveBeenCalledWith('session-jti-123');
    });
  });

  describe('updateHeartbeat', () => {
    it('should update session heartbeat', async () => {
      mockSessionService.updateHeartbeat.mockResolvedValue(undefined);

      await controller.updateHeartbeat('session-jti-123');

      expect(mockSessionService.updateHeartbeat).toHaveBeenCalledWith('session-jti-123');
    });
  });

  describe('revokeSession', () => {
    it('should revoke a specific session', async () => {
      mockSessionService.revokeSession.mockResolvedValue(undefined);

      await controller.revokeSession('session-456', 'Security reason');

      expect(mockSessionService.revokeSession).toHaveBeenCalledWith(
        'session-456',
        'Security reason',
      );
    });
  });

  describe('trackActivity', () => {
    it('should track session activity', async () => {
      const activity = {
        activityType: 'API_CALL' as any,
        resource: '/api/users',
        method: 'GET',
        statusCode: 200,
      };
      const mockActivity = {
        id: 'activity-1',
        sessionId: 'session-1',
        timestamp: new Date(),
        ...activity,
      };
      const req = { ip: '192.168.1.1' };

      mockSessionService.trackActivity.mockResolvedValue(mockActivity);

      const result = await controller.trackActivity('session-1', activity, req);

      expect(result).toBeDefined();
      expect(result.id).toBe('activity-1');
      expect(mockSessionService.trackActivity).toHaveBeenCalledWith(
        'session-1',
        activity,
        '192.168.1.1',
      );
    });
  });

  describe('revokeMySession', () => {
    it('should revoke own session if it exists', async () => {
      const req = { user: { userId: 'user-123' } };
      const mockSessions = [mockSession];

      mockSessionService.getSessions.mockResolvedValue(mockSessions);
      mockSessionService.revokeSession.mockResolvedValue(undefined);

      await controller.revokeMySession('1', req);

      expect(mockSessionService.getSessions).toHaveBeenCalledWith({ userId: 'user-123' });
      expect(mockSessionService.revokeSession).toHaveBeenCalledWith('1', 'User initiated');
    });

    it('should not revoke session if it does not belong to user', async () => {
      const req = { user: { userId: 'user-123' } };
      const mockSessions = [{ ...mockSession, id: '2' }]; // Different session ID

      mockSessionService.getSessions.mockResolvedValue(mockSessions);

      await controller.revokeMySession('1', req);

      expect(mockSessionService.getSessions).toHaveBeenCalledWith({ userId: 'user-123' });
      expect(mockSessionService.revokeSession).not.toHaveBeenCalled();
    });
  });

  describe('revokeUserSessions', () => {
    it('should revoke all sessions for a user', async () => {
      mockSessionService.revokeUserSessions.mockResolvedValue(3);

      const result = await controller.revokeUserSessions('user-123', 'Account suspended');

      expect(result).toEqual({ count: 3 });
      expect(mockSessionService.revokeUserSessions).toHaveBeenCalledWith(
        'user-123',
        'Account suspended',
      );
    });
  });

  describe('getStatistics without userId', () => {
    it('should return global session statistics when no userId provided', async () => {
      const mockStats = {
        totalSessions: 100,
        activeSessions: 50,
        averageSessionDuration: 3600,
        sessionsByBrowser: { Chrome: 70, Firefox: 30 },
        sessionsByOS: { Windows: 60, Linux: 40 },
      };

      mockSessionService.getSessionStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStatistics(undefined);

      expect(result).toEqual(mockStats);
      expect(mockSessionService.getSessionStatistics).toHaveBeenCalledWith(undefined);
    });
  });

  describe('private methods', () => {
    describe('mapSessionToDto', () => {
      it('should correctly map session entity to DTO', async () => {
        const mockSessions = [mockSession];
        mockSessionService.getSessions.mockResolvedValue(mockSessions);

        const result = await controller.getSessions({});

        expect(result[0]).toMatchObject({
          id: '1',
          userId: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          browser: 'Chrome',
          browserVersion: '96',
          os: 'Windows',
          osVersion: '10',
          deviceType: 'desktop',
          location: 'New York, US',
          isOnline: true,
          activityCount: 42,
          riskScore: 10,
        });
      });
    });

    describe('mapActivityToDto', () => {
      it('should correctly map activity entity to DTO', async () => {
        mockSessionService.getSessionDetails.mockResolvedValue(mockSession);

        const result = await controller.getSessionDetails('session-jti-123');

        expect(result.activities[0]).toMatchObject({
          id: '1',
          sessionId: 'session-1',
          activityType: 'LOGIN',
          timestamp: expect.any(Date),
          metadata: {},
        });
      });
    });
  });
});
