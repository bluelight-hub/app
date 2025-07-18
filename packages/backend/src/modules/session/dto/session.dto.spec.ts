import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  SessionDto,
  SessionActivityDto,
  CreateSessionActivityDto,
  SessionFilterDto,
  SessionStatisticsDto,
  DeviceType,
  LoginMethod,
  ActivityType,
} from './session.dto';

describe('Session DTOs', () => {
  describe('SessionDto', () => {
    const validSessionData = {
      id: 'session-123',
      userId: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      location: 'Berlin, Germany',
      deviceType: DeviceType.DESKTOP,
      browser: 'Chrome',
      browserVersion: '96.0',
      os: 'Windows',
      osVersion: '10',
      loginMethod: LoginMethod.PASSWORD,
      isOnline: true,
      lastHeartbeat: new Date(),
      lastActivityAt: new Date(),
      activityCount: 5,
      riskScore: 2.5,
      suspiciousFlags: ['multiple_locations'],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      isRevoked: false,
      revokedAt: null,
      revokedReason: null,
    };

    it('should validate valid session data', async () => {
      const dto = plainToClass(SessionDto, validSessionData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with minimal required fields', async () => {
      const minimalData = {
        id: 'session-123',
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        isOnline: true,
        lastActivityAt: new Date(),
        activityCount: 0,
        riskScore: 0,
        suspiciousFlags: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        isRevoked: false,
      };

      const dto = plainToClass(SessionDto, minimalData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with missing required fields', async () => {
      const incompleteData = {
        id: 'session-123',
        // missing userId, username, email, etc.
      };

      const dto = plainToClass(SessionDto, incompleteData);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with invalid data types', async () => {
      const invalidData = {
        ...validSessionData,
        isOnline: 'not a boolean',
        activityCount: 'not a number',
        riskScore: 'not a number',
      };

      const dto = plainToClass(SessionDto, invalidData);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate with all optional fields present', async () => {
      const dto = plainToClass(SessionDto, {
        ...validSessionData,
        revokedAt: new Date(),
        revokedReason: 'Security violation',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate different device types', async () => {
      const deviceTypes = [DeviceType.MOBILE, DeviceType.TABLET, DeviceType.UNKNOWN];

      for (const deviceType of deviceTypes) {
        const dto = plainToClass(SessionDto, {
          ...validSessionData,
          deviceType,
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should validate different login methods', async () => {
      const loginMethods = [LoginMethod.OAUTH, LoginMethod.SSO, LoginMethod.BIOMETRIC];

      for (const loginMethod of loginMethods) {
        const dto = plainToClass(SessionDto, {
          ...validSessionData,
          loginMethod,
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should fail validation with invalid enum values', async () => {
      const invalidData = {
        ...validSessionData,
        deviceType: 'invalid_device',
        loginMethod: 'invalid_method',
      };

      const dto = plainToClass(SessionDto, invalidData);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('SessionActivityDto', () => {
    const validActivityData = {
      id: 'activity-123',
      sessionId: 'session-123',
      timestamp: new Date(),
      activityType: ActivityType.LOGIN,
      resource: '/api/login',
      method: 'POST',
      statusCode: 200,
      duration: 150,
      ipAddress: '192.168.1.1',
      metadata: { userAgent: 'Chrome' },
    };

    it('should validate valid activity data', async () => {
      const dto = plainToClass(SessionActivityDto, validActivityData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with minimal required fields', async () => {
      const minimalData = {
        id: 'activity-123',
        sessionId: 'session-123',
        timestamp: new Date(),
        activityType: ActivityType.API_CALL,
      };

      const dto = plainToClass(SessionActivityDto, minimalData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate different activity types', async () => {
      const activityTypes = [
        ActivityType.LOGOUT,
        ActivityType.PAGE_VIEW,
        ActivityType.DATA_ACCESS,
        ActivityType.DATA_MODIFICATION,
        ActivityType.SECURITY_EVENT,
      ];

      for (const activityType of activityTypes) {
        const dto = plainToClass(SessionActivityDto, {
          ...validActivityData,
          activityType,
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should fail validation with missing required fields', async () => {
      const incompleteData = {
        id: 'activity-123',
        // missing sessionId, timestamp, activityType
      };

      const dto = plainToClass(SessionActivityDto, incompleteData);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with invalid activity type', async () => {
      const invalidData = {
        ...validActivityData,
        activityType: 'invalid_activity',
      };

      const dto = plainToClass(SessionActivityDto, invalidData);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('CreateSessionActivityDto', () => {
    const validCreateData = {
      activityType: ActivityType.API_CALL,
      resource: '/api/users',
      method: 'GET',
      statusCode: 200,
      duration: 100,
      metadata: { query: 'test' },
    };

    it('should validate valid create activity data', async () => {
      const dto = plainToClass(CreateSessionActivityDto, validCreateData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with minimal required fields', async () => {
      const minimalData = {
        activityType: ActivityType.PAGE_VIEW,
      };

      const dto = plainToClass(CreateSessionActivityDto, minimalData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with missing required activityType', async () => {
      const incompleteData = {
        resource: '/api/test',
        method: 'GET',
      };

      const dto = plainToClass(CreateSessionActivityDto, incompleteData);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate different activity types', async () => {
      const activityTypes = [ActivityType.LOGIN, ActivityType.LOGOUT, ActivityType.SECURITY_EVENT];

      for (const activityType of activityTypes) {
        const dto = plainToClass(CreateSessionActivityDto, {
          ...validCreateData,
          activityType,
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('SessionFilterDto', () => {
    const validFilterData = {
      userId: 'user-123',
      isOnline: true,
      isRevoked: false,
      minRiskScore: 0,
      maxRiskScore: 10,
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-12-31'),
      deviceType: DeviceType.DESKTOP,
      location: 'Berlin',
      suspiciousFlags: ['multiple_locations', 'unusual_activity'],
    };

    it('should validate valid filter data', async () => {
      const dto = plainToClass(SessionFilterDto, validFilterData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with no filters (empty object)', async () => {
      const dto = plainToClass(SessionFilterDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with partial filters', async () => {
      const partialData = {
        userId: 'user-123',
        isOnline: true,
        deviceType: DeviceType.MOBILE,
      };

      const dto = plainToClass(SessionFilterDto, partialData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate different device types in filter', async () => {
      const deviceTypes = [DeviceType.TABLET, DeviceType.UNKNOWN];

      for (const deviceType of deviceTypes) {
        const dto = plainToClass(SessionFilterDto, {
          ...validFilterData,
          deviceType,
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should validate boolean filters', async () => {
      const booleanVariations = [
        { isOnline: true, isRevoked: false },
        { isOnline: false, isRevoked: true },
        { isOnline: true, isRevoked: true },
        { isOnline: false, isRevoked: false },
      ];

      for (const variation of booleanVariations) {
        const dto = plainToClass(SessionFilterDto, {
          ...validFilterData,
          ...variation,
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should fail validation with invalid data types', async () => {
      const invalidData = {
        ...validFilterData,
        isOnline: 'not a boolean',
        minRiskScore: 'not a number',
      };

      const dto = plainToClass(SessionFilterDto, invalidData);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('SessionStatisticsDto', () => {
    const validStatsData = {
      totalSessions: 100,
      activeSessions: 50,
      revokedSessions: 10,
      highRiskSessions: 5,
      deviceTypeDistribution: {
        [DeviceType.DESKTOP]: 60,
        [DeviceType.MOBILE]: 30,
        [DeviceType.TABLET]: 8,
        [DeviceType.UNKNOWN]: 2,
      },
      locationDistribution: {
        'Berlin, Germany': 40,
        'New York, USA': 35,
        'London, UK': 25,
      },
      browserDistribution: {
        Chrome: 70,
        Firefox: 20,
        Safari: 10,
      },
      osDistribution: {
        Windows: 60,
        macOS: 25,
        Linux: 15,
      },
      recentActivities: [
        {
          id: 'activity-1',
          sessionId: 'session-1',
          timestamp: new Date(),
          activityType: ActivityType.LOGIN,
        },
      ],
    };

    it('should validate valid statistics data', async () => {
      const dto = plainToClass(SessionStatisticsDto, validStatsData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with empty distributions', async () => {
      const emptyDistData = {
        ...validStatsData,
        deviceTypeDistribution: {},
        locationDistribution: {},
        browserDistribution: {},
        osDistribution: {},
        recentActivities: [],
      };

      const dto = plainToClass(SessionStatisticsDto, emptyDistData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with zero counts', async () => {
      const zeroCountData = {
        ...validStatsData,
        totalSessions: 0,
        activeSessions: 0,
        revokedSessions: 0,
        highRiskSessions: 0,
      };

      const dto = plainToClass(SessionStatisticsDto, zeroCountData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with missing required fields', async () => {
      const incompleteData = {
        totalSessions: 100,
        // missing other required fields
      };

      const dto = plainToClass(SessionStatisticsDto, incompleteData);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with invalid data types', async () => {
      const invalidData = {
        ...validStatsData,
        totalSessions: 'not a number',
        deviceTypeDistribution: 'not an object',
        recentActivities: 'not an array',
      };

      const dto = plainToClass(SessionStatisticsDto, invalidData);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Enum Values', () => {
    it('should have correct DeviceType enum values', () => {
      expect(DeviceType.MOBILE).toBe('mobile');
      expect(DeviceType.DESKTOP).toBe('desktop');
      expect(DeviceType.TABLET).toBe('tablet');
      expect(DeviceType.UNKNOWN).toBe('unknown');
    });

    it('should have correct LoginMethod enum values', () => {
      expect(LoginMethod.PASSWORD).toBe('password');
      expect(LoginMethod.OAUTH).toBe('oauth');
      expect(LoginMethod.SSO).toBe('sso');
      expect(LoginMethod.BIOMETRIC).toBe('biometric');
    });

    it('should have correct ActivityType enum values', () => {
      expect(ActivityType.LOGIN).toBe('login');
      expect(ActivityType.LOGOUT).toBe('logout');
      expect(ActivityType.PAGE_VIEW).toBe('page_view');
      expect(ActivityType.API_CALL).toBe('api_call');
      expect(ActivityType.DATA_ACCESS).toBe('data_access');
      expect(ActivityType.DATA_MODIFICATION).toBe('data_modification');
      expect(ActivityType.SECURITY_EVENT).toBe('security_event');
    });
  });
});
