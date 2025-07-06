import { validate } from 'class-validator';
import { CreateAuditLogDto } from '../create-audit-log.dto';
import { AuditActionType, AuditSeverity, UserRole } from '@prisma/generated/prisma/client';

describe('CreateAuditLogDto', () => {
  let dto: CreateAuditLogDto;

  beforeEach(() => {
    dto = new CreateAuditLogDto();
  });

  describe('Required fields validation', () => {
    it('should fail validation when required fields are missing', async () => {
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'actionType')).toBe(true);
      expect(errors.some((e) => e.property === 'action')).toBe(true);
      expect(errors.some((e) => e.property === 'resource')).toBe(true);
    });

    it('should pass validation with required fields', async () => {
      dto.actionType = AuditActionType.CREATE;
      dto.action = 'create-user';
      dto.resource = 'user';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Enum validation', () => {
    it('should validate actionType enum', async () => {
      dto.action = 'test';
      dto.resource = 'test';
      dto.actionType = 'INVALID' as any;

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'actionType')).toBe(true);
    });

    it('should validate severity enum', async () => {
      dto.actionType = AuditActionType.CREATE;
      dto.action = 'test';
      dto.resource = 'test';
      dto.severity = 'INVALID' as any;

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'severity')).toBe(true);
    });

    it('should validate userRole enum', async () => {
      dto.actionType = AuditActionType.CREATE;
      dto.action = 'test';
      dto.resource = 'test';
      dto.userRole = 'INVALID' as any;

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'userRole')).toBe(true);
    });
  });

  describe('Default values', () => {
    it('should have default severity as MEDIUM', () => {
      expect(dto.severity).toBe(AuditSeverity.MEDIUM);
    });

    it('should have default success as true', () => {
      expect(dto.success).toBe(true);
    });

    it('should have default sensitiveData as false', () => {
      expect(dto.sensitiveData).toBe(false);
    });

    it('should have default requiresReview as false', () => {
      expect(dto.requiresReview).toBe(false);
    });
  });

  describe('String field validation', () => {
    it('should validate string fields', async () => {
      dto.actionType = AuditActionType.CREATE;
      dto.action = 'test';
      dto.resource = 'test';
      dto.userId = 123 as any; // Should be string

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'userId')).toBe(true);
    });
  });

  describe('Number field validation', () => {
    it('should validate duration range', async () => {
      dto.actionType = AuditActionType.CREATE;
      dto.action = 'test';
      dto.resource = 'test';
      dto.duration = 300001; // Max is 300000

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'duration')).toBe(true);
    });

    it('should validate statusCode range', async () => {
      dto.actionType = AuditActionType.CREATE;
      dto.action = 'test';
      dto.resource = 'test';
      dto.statusCode = 600; // Max is 599

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'statusCode')).toBe(true);
    });

    it('should validate retentionPeriod range', async () => {
      dto.actionType = AuditActionType.CREATE;
      dto.action = 'test';
      dto.resource = 'test';
      dto.retentionPeriod = 3651; // Max is 3650

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'retentionPeriod')).toBe(true);
    });
  });

  describe('Array field validation', () => {
    it('should validate affectedFields as string array', async () => {
      dto.actionType = AuditActionType.CREATE;
      dto.action = 'test';
      dto.resource = 'test';
      dto.affectedFields = [123, 456] as any;

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'affectedFields')).toBe(true);
    });

    it('should validate compliance as string array', async () => {
      dto.actionType = AuditActionType.CREATE;
      dto.action = 'test';
      dto.resource = 'test';
      dto.compliance = ['GDPR', 123] as any;

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'compliance')).toBe(true);
    });
  });

  describe('Object field validation', () => {
    it('should allow valid objects for metadata', async () => {
      dto.actionType = AuditActionType.CREATE;
      dto.action = 'test';
      dto.resource = 'test';
      dto.metadata = { key: 'value', nested: { data: true } };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should allow valid objects for oldValues and newValues', async () => {
      dto.actionType = AuditActionType.UPDATE;
      dto.action = 'update';
      dto.resource = 'test';
      dto.oldValues = { name: 'Old' };
      dto.newValues = { name: 'New' };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Valid complete DTO', () => {
    it('should validate a complete audit log DTO', async () => {
      dto.actionType = AuditActionType.CREATE;
      dto.severity = AuditSeverity.HIGH;
      dto.action = 'create-user';
      dto.resource = 'user';
      dto.resourceId = 'user-123';
      dto.userId = 'admin-456';
      dto.userEmail = 'admin@example.com';
      dto.userRole = UserRole.ADMIN;
      dto.impersonatedBy = 'superadmin-789';
      dto.requestId = 'req_abc123';
      dto.sessionId = 'sess_xyz789';
      dto.ipAddress = '192.168.1.1';
      dto.userAgent = 'Mozilla/5.0';
      dto.endpoint = '/api/users';
      dto.httpMethod = 'POST';
      dto.oldValues = { status: 'inactive' };
      dto.newValues = { status: 'active' };
      dto.affectedFields = ['status'];
      dto.metadata = { bulkOperation: false };
      dto.duration = 150;
      dto.success = true;
      dto.errorMessage = undefined;
      dto.statusCode = 201;
      dto.compliance = ['GDPR', 'HIPAA'];
      dto.sensitiveData = true;
      dto.requiresReview = false;
      dto.retentionPeriod = 365;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
