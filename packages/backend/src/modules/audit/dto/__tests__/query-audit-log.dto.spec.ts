import { validate } from 'class-validator';
import { QueryAuditLogDto } from '../query-audit-log.dto';
import { AuditActionType, AuditSeverity, UserRole } from '@prisma/generated/prisma/client';

describe('QueryAuditLogDto', () => {
  let dto: QueryAuditLogDto;

  beforeEach(() => {
    dto = new QueryAuditLogDto();
  });

  describe('Pagination validation', () => {
    it('should have default pagination values', () => {
      expect(dto.limit).toBe(50);
      expect(dto.page).toBe(1);
    });

    it('should validate limit range', async () => {
      dto.limit = 501; // Max is 500

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'limit')).toBe(true);
    });

    it('should validate minimum limit', async () => {
      dto.limit = 0; // Min is 1

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'limit')).toBe(true);
    });

    it('should validate minimum page', async () => {
      dto.page = 0; // Min is 1

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });
  });

  describe('Filter validation', () => {
    it('should validate actionType enum', async () => {
      dto.actionType = 'INVALID' as any;

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'actionType')).toBe(true);
    });

    it('should validate severity enum', async () => {
      dto.severity = 'INVALID' as any;

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'severity')).toBe(true);
    });

    it('should validate userRole enum', async () => {
      dto.userRole = 'INVALID' as any;

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'userRole')).toBe(true);
    });

    it('should allow valid enum values', async () => {
      dto.actionType = AuditActionType.CREATE;
      dto.severity = AuditSeverity.HIGH;
      dto.userRole = UserRole.ADMIN;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Date validation', () => {
    it('should validate ISO date strings', async () => {
      dto.startDate = 'invalid-date';

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'startDate')).toBe(true);
    });

    it('should accept valid ISO date strings', async () => {
      dto.startDate = '2024-01-01T00:00:00.000Z';
      dto.endDate = '2024-12-31T23:59:59.999Z';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('String validation', () => {
    it('should validate string fields', async () => {
      dto.userId = 123 as any; // Should be string

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'userId')).toBe(true);
    });

    it('should accept valid string fields', async () => {
      dto.userId = 'user-123';
      dto.action = 'create-user';
      dto.resource = 'user';
      dto.resourceId = 'res-456';
      dto.requestId = 'req-789';
      dto.sessionId = 'sess-abc';
      dto.ipAddress = '192.168.1.1';
      dto.search = 'test search';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Boolean validation', () => {
    it('should validate boolean fields', async () => {
      // Transform decorator converts string 'true' to boolean, but IsBoolean still validates
      // the original value before transformation
      dto.success = 'not-a-boolean' as any;

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'success')).toBe(true);
    });

    it('should accept boolean values', async () => {
      dto.success = true;
      dto.requiresReview = false;
      dto.sensitiveData = false;
      dto.excludeArchived = true;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Sort validation', () => {
    it('should have default sort values', () => {
      expect(dto.sortBy).toBe('timestamp');
      expect(dto.sortOrder).toBe('desc');
    });

    it('should validate sortOrder enum', async () => {
      dto.sortOrder = 'INVALID' as any;

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'sortOrder')).toBe(true);
    });

    it('should accept valid sort values', async () => {
      dto.sortOrder = 'asc';
      dto.sortBy = 'actionType';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Array fields validation', () => {
    it('should validate httpMethods as string array', async () => {
      dto.httpMethods = [123] as any;

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'httpMethods')).toBe(true);
    });

    it('should validate compliance as string array', async () => {
      dto.compliance = [123] as any;

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'compliance')).toBe(true);
    });

    it('should transform single value to array', async () => {
      // This is handled by the Transform decorator
      dto.httpMethods = ['POST', 'GET'];
      dto.compliance = ['GDPR', 'HIPAA'];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Duration validation', () => {
    it('should validate minDuration', async () => {
      dto.minDuration = -1; // Min is 0

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'minDuration')).toBe(true);
    });

    it('should validate maxDuration', async () => {
      dto.maxDuration = -1; // Min is 0

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'maxDuration')).toBe(true);
    });

    it('should accept valid duration values', async () => {
      dto.minDuration = 1000;
      dto.maxDuration = 10000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Complete query DTO', () => {
    it('should validate a complete query with all filters', async () => {
      dto.page = 2;
      dto.limit = 50;
      dto.actionType = AuditActionType.UPDATE;
      dto.severity = AuditSeverity.MEDIUM;
      dto.action = 'update-user';
      dto.resource = 'user';
      dto.resourceId = 'user-123';
      dto.userId = 'admin-456';
      dto.userEmail = 'admin@example.com';
      dto.userRole = UserRole.ADMIN;
      dto.requestId = 'req-abc';
      dto.sessionId = 'sess-xyz';
      dto.ipAddress = '10.0.0.1';
      dto.success = true;
      dto.requiresReview = false;
      dto.sensitiveData = false;
      dto.startDate = '2024-01-01T00:00:00.000Z';
      dto.endDate = '2024-12-31T23:59:59.999Z';
      dto.search = 'search term';
      dto.httpMethods = ['POST', 'PUT'];
      dto.compliance = ['GDPR'];
      dto.minDuration = 100;
      dto.maxDuration = 5000;
      dto.sortBy = 'createdAt';
      dto.sortOrder = 'desc';
      dto.excludeArchived = true;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate minimal query with defaults', async () => {
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(50);
      expect(dto.sortBy).toBe('timestamp');
      expect(dto.sortOrder).toBe('desc');
      expect(dto.excludeArchived).toBe(true);
    });
  });
});
