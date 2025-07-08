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
});
