import { AuditLogStatisticsResponse } from '../audit-log-statistics.dto';
import { plainToInstance } from 'class-transformer';

describe('AuditLogStatisticsResponse', () => {
  describe('Constructor and properties', () => {
    it('should create instance with all properties', () => {
      const dto = new AuditLogStatisticsResponse();
      dto.totalLogs = 1234;
      dto.actionTypes = {
        CREATE: 100,
        READ: 500,
        UPDATE: 200,
        DELETE: 50,
      };
      dto.severities = {
        LOW: 300,
        MEDIUM: 200,
        HIGH: 100,
        CRITICAL: 50,
      };
      dto.successRate = {
        success: 900,
        failed: 100,
      };
      dto.topUsers = [
        { userId: '123', userEmail: 'user1@example.com', count: 50 },
        { userId: '456', userEmail: 'user2@example.com', count: 30 },
      ];
      dto.topResources = [
        { resource: 'users', count: 100 },
        { resource: 'organizations', count: 80 },
      ];

      expect(dto.totalLogs).toBe(1234);
      expect(dto.actionTypes.CREATE).toBe(100);
      expect(dto.severities.HIGH).toBe(100);
      expect(dto.successRate.success).toBe(900);
      expect(dto.topUsers).toHaveLength(2);
      expect(dto.topResources).toHaveLength(2);
    });
  });

  describe('Transformation', () => {
    it('should transform plain object to class instance', () => {
      const plainObject = {
        totalLogs: 500,
        actionTypes: {
          CREATE: 50,
          READ: 200,
          UPDATE: 150,
          DELETE: 100,
        },
        severities: {
          LOW: 200,
          MEDIUM: 150,
          HIGH: 100,
          CRITICAL: 50,
        },
        successRate: {
          success: 450,
          failed: 50,
        },
        topUsers: [
          { userId: 'admin-1', userEmail: 'admin1@example.com', count: 100 },
          { userId: 'admin-2', userEmail: 'admin2@example.com', count: 80 },
        ],
        topResources: [
          { resource: 'users', count: 200 },
          { resource: 'organizations', count: 150 },
        ],
      };

      const dto = plainToInstance(AuditLogStatisticsResponse, plainObject);

      expect(dto).toBeInstanceOf(AuditLogStatisticsResponse);
      expect(dto.totalLogs).toBe(500);
      expect(dto.actionTypes).toEqual(plainObject.actionTypes);
      expect(dto.severities).toEqual(plainObject.severities);
      expect(dto.successRate).toEqual(plainObject.successRate);
      expect(dto.topUsers).toEqual(plainObject.topUsers);
      expect(dto.topResources).toEqual(plainObject.topResources);
    });
  });

  describe('Data integrity', () => {
    it('should calculate correct total from action types', () => {
      const dto = new AuditLogStatisticsResponse();
      dto.actionTypes = {
        CREATE: 100,
        READ: 200,
        UPDATE: 150,
        DELETE: 50,
      };
      dto.totalLogs = 500;

      const sumActionTypes = Object.values(dto.actionTypes).reduce((sum, count) => sum + count, 0);
      expect(sumActionTypes).toBe(dto.totalLogs);
    });

    it('should calculate correct total from success/failed', () => {
      const dto = new AuditLogStatisticsResponse();
      dto.successRate = {
        success: 900,
        failed: 100,
      };
      dto.totalLogs = 1000;

      const sumSuccessRate = dto.successRate.success + dto.successRate.failed;
      expect(sumSuccessRate).toBe(dto.totalLogs);
    });
  });

  describe('Top lists', () => {
    it('should handle empty top users list', () => {
      const dto = new AuditLogStatisticsResponse();
      dto.topUsers = [];

      expect(dto.topUsers).toHaveLength(0);
    });

    it('should handle empty top resources list', () => {
      const dto = new AuditLogStatisticsResponse();
      dto.topResources = [];

      expect(dto.topResources).toHaveLength(0);
    });

    it('should handle top 10 users', () => {
      const dto = new AuditLogStatisticsResponse();
      dto.topUsers = Array.from({ length: 10 }, (_, i) => ({
        userId: `user-${i}`,
        userEmail: `user${i}@example.com`,
        count: 100 - i * 10,
      }));

      expect(dto.topUsers).toHaveLength(10);
      expect(dto.topUsers[0].count).toBe(100);
      expect(dto.topUsers[9].count).toBe(10);
    });

    it('should handle top 10 resources', () => {
      const dto = new AuditLogStatisticsResponse();
      dto.topResources = Array.from({ length: 10 }, (_, i) => ({
        resource: `resource-${i}`,
        count: 200 - i * 20,
      }));

      expect(dto.topResources).toHaveLength(10);
      expect(dto.topResources[0].count).toBe(200);
      expect(dto.topResources[9].count).toBe(20);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero statistics', () => {
      const dto = new AuditLogStatisticsResponse();
      dto.totalLogs = 0;
      dto.actionTypes = {};
      dto.severities = {};
      dto.successRate = { success: 0, failed: 0 };
      dto.topUsers = [];
      dto.topResources = [];

      expect(dto.totalLogs).toBe(0);
      expect(Object.keys(dto.actionTypes)).toHaveLength(0);
      expect(Object.keys(dto.severities)).toHaveLength(0);
      expect(dto.successRate.success).toBe(0);
      expect(dto.successRate.failed).toBe(0);
    });

    it('should handle large numbers', () => {
      const dto = new AuditLogStatisticsResponse();
      dto.totalLogs = 1000000;
      dto.actionTypes = {
        CREATE: 250000,
        READ: 500000,
        UPDATE: 200000,
        DELETE: 50000,
      };

      expect(dto.totalLogs).toBe(1000000);
      expect(dto.actionTypes.READ).toBe(500000);
    });
  });
});
