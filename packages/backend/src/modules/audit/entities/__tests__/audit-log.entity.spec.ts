import { AuditLogEntity } from '../audit-log.entity';
import { AuditActionType, AuditSeverity, UserRole } from '@prisma/generated/prisma/client';
import { plainToInstance } from 'class-transformer';

describe('AuditLogEntity', () => {
  describe('Basic properties', () => {
    it('should create an instance with all required properties', () => {
      const entity = new AuditLogEntity();
      entity.id = 'audit_12345abcdef';
      entity.actionType = AuditActionType.CREATE;
      entity.severity = AuditSeverity.MEDIUM;
      entity.action = 'create-user';
      entity.resource = 'user';
      entity.timestamp = new Date('2024-01-15T10:30:00Z');
      entity.success = true;
      entity.sensitiveData = false;
      entity.requiresReview = false;

      expect(entity.id).toBe('audit_12345abcdef');
      expect(entity.actionType).toBe(AuditActionType.CREATE);
      expect(entity.severity).toBe(AuditSeverity.MEDIUM);
      expect(entity.action).toBe('create-user');
      expect(entity.resource).toBe('user');
      expect(entity.timestamp).toBeInstanceOf(Date);
      expect(entity.success).toBe(true);
      expect(entity.sensitiveData).toBe(false);
      expect(entity.requiresReview).toBe(false);
    });

    it('should create an instance with all optional properties', () => {
      const entity = new AuditLogEntity();
      entity.id = 'audit-123';
      entity.actionType = AuditActionType.UPDATE;
      entity.severity = AuditSeverity.HIGH;
      entity.action = 'update-user';
      entity.resource = 'user';
      entity.resourceId = 'user_12345';
      entity.userId = 'user_67890';
      entity.userEmail = 'admin@bluelight-hub.com';
      entity.userRole = UserRole.ADMIN;
      entity.impersonatedBy = 'superadmin_99999';
      entity.requestId = 'req_abc123def';
      entity.sessionId = 'sess_xyz789';
      entity.ipAddress = '192.168.1.100';
      entity.userAgent = 'Mozilla/5.0';
      entity.endpoint = '/api/v1/users';
      entity.httpMethod = 'POST';
      entity.oldValues = { name: 'Old Name' };
      entity.newValues = { name: 'New Name' };
      entity.affectedFields = ['name'];
      entity.metadata = { bulkOperation: false };
      entity.timestamp = new Date('2024-01-15T10:30:00Z');
      entity.duration = 1250;
      entity.success = true;
      entity.errorMessage = null;
      entity.statusCode = 200;
      entity.compliance = ['GDPR'];
      entity.sensitiveData = false;
      entity.requiresReview = false;
      entity.reviewedBy = null;
      entity.reviewedAt = null;
      entity.retentionPeriod = 365;
      entity.archivedAt = null;

      expect(entity.resourceId).toBe('user_12345');
      expect(entity.userId).toBe('user_67890');
      expect(entity.userEmail).toBe('admin@bluelight-hub.com');
      expect(entity.userRole).toBe(UserRole.ADMIN);
      expect(entity.impersonatedBy).toBe('superadmin_99999');
      expect(entity.retentionPeriod).toBe(365);
    });
  });

  describe('Optional properties', () => {
    it('should handle undefined optional properties', () => {
      const entity = new AuditLogEntity();
      entity.id = 'audit-123';
      entity.actionType = AuditActionType.READ;
      entity.severity = AuditSeverity.LOW;
      entity.action = 'view';
      entity.resource = 'report';
      entity.timestamp = new Date();
      entity.success = true;
      entity.sensitiveData = false;
      entity.requiresReview = false;

      // Optional properties should be undefined
      expect(entity.resourceId).toBeUndefined();
      expect(entity.userId).toBeUndefined();
      expect(entity.userEmail).toBeUndefined();
      expect(entity.userRole).toBeUndefined();
      expect(entity.impersonatedBy).toBeUndefined();
      expect(entity.errorMessage).toBeUndefined();
      expect(entity.reviewedAt).toBeUndefined();
      expect(entity.reviewedBy).toBeUndefined();
      expect(entity.archivedAt).toBeUndefined();
    });
  });

  describe('JSON properties', () => {
    it('should handle complex JSON values', () => {
      const entity = new AuditLogEntity();
      entity.oldValues = {
        name: 'Old Name',
        settings: {
          theme: 'light',
          notifications: true,
        },
        tags: ['tag1', 'tag2'],
      };
      entity.newValues = {
        name: 'New Name',
        settings: {
          theme: 'dark',
          notifications: false,
        },
        tags: ['tag1', 'tag2', 'tag3'],
      };
      entity.metadata = {
        source: 'API',
        version: '1.0',
        nested: {
          deep: {
            value: true,
          },
        },
      };

      expect(entity.oldValues.settings.theme).toBe('light');
      expect(entity.newValues.settings.theme).toBe('dark');
      expect(entity.metadata.nested.deep.value).toBe(true);
    });
  });

  describe('Array properties', () => {
    it('should handle array fields correctly', () => {
      const entity = new AuditLogEntity();
      entity.affectedFields = ['name', 'email', 'role'];
      entity.compliance = ['GDPR', 'HIPAA', 'SOC2'];

      expect(entity.affectedFields).toHaveLength(3);
      expect(entity.affectedFields).toContain('email');
      expect(entity.compliance).toHaveLength(3);
      expect(entity.compliance).toContain('HIPAA');
    });

    it('should handle empty arrays', () => {
      const entity = new AuditLogEntity();
      entity.affectedFields = [];
      entity.compliance = [];

      expect(entity.affectedFields).toHaveLength(0);
      expect(entity.compliance).toHaveLength(0);
    });
  });

  describe('Transformation', () => {
    it('should transform plain object to entity instance', () => {
      const plainObject = {
        id: 'audit-789',
        actionType: 'UPDATE',
        severity: 'HIGH',
        action: 'update-permissions',
        resource: 'user',
        resourceId: 'user-123',
        userId: 'admin-456',
        userEmail: 'admin@example.com',
        userRole: 'ADMIN',
        timestamp: '2024-01-15T10:30:00Z',
        success: true,
        sensitiveData: false,
        requiresReview: true,
        duration: 250,
      };

      const entity = plainToInstance(AuditLogEntity, plainObject);

      expect(entity).toBeInstanceOf(AuditLogEntity);
      expect(entity.id).toBe('audit-789');
      expect(entity.actionType).toBe('UPDATE');
      expect(entity.severity).toBe('HIGH');
      expect(entity.duration).toBe(250);
    });
  });

  describe('Review functionality', () => {
    it('should track review status', () => {
      const entity = new AuditLogEntity();
      entity.requiresReview = true;
      entity.reviewedAt = undefined;
      entity.reviewedBy = undefined;

      expect(entity.requiresReview).toBe(true);
      expect(entity.reviewedAt).toBeUndefined();

      // Simulate review
      entity.reviewedAt = new Date('2024-01-16T12:00:00Z');
      entity.reviewedBy = 'reviewer-123';

      expect(entity.reviewedAt).toBeInstanceOf(Date);
      expect(entity.reviewedBy).toBe('reviewer-123');
    });
  });

  describe('Error handling', () => {
    it('should track failed operations', () => {
      const entity = new AuditLogEntity();
      entity.success = false;
      entity.errorMessage = 'Database connection failed';
      entity.statusCode = 500;

      expect(entity.success).toBe(false);
      expect(entity.errorMessage).toBe('Database connection failed');
      expect(entity.statusCode).toBe(500);
    });
  });

  describe('Retention and archival', () => {
    it('should handle retention period', () => {
      const entity = new AuditLogEntity();
      entity.retentionPeriod = 365; // 1 year

      expect(entity.retentionPeriod).toBe(365);
    });

    it('should track archival status', () => {
      const entity = new AuditLogEntity();
      entity.archivedAt = new Date('2025-01-15T10:30:00Z');

      expect(entity.archivedAt).toBeInstanceOf(Date);
    });

    it('should allow undefined retention period for indefinite storage', () => {
      const entity = new AuditLogEntity();
      entity.retentionPeriod = undefined;

      expect(entity.retentionPeriod).toBeUndefined();
    });
  });

  describe('Compliance features', () => {
    it('should track compliance tags', () => {
      const entity = new AuditLogEntity();
      entity.compliance = ['GDPR', 'HIPAA', 'PCI-DSS'];

      expect(entity.compliance).toHaveLength(3);
      expect(entity.compliance).toContain('GDPR');
      expect(entity.compliance).toContain('HIPAA');
      expect(entity.compliance).toContain('PCI-DSS');
    });

    it('should track sensitive data flag', () => {
      const entity = new AuditLogEntity();
      entity.sensitiveData = true;

      expect(entity.sensitiveData).toBe(true);
    });
  });
});
