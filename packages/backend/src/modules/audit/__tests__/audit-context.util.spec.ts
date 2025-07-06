import { Request } from 'express';
import { AuditContextUtil } from '../utils/audit-context.util';
import { UserRole } from '@prisma/generated/prisma/enums';

// Extend Request interface for testing
interface TestRequest extends Request {
  user?: any;
}

describe('AuditContextUtil', () => {
  let mockRequest: Partial<TestRequest>;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      originalUrl: '/api/v1/users',
      method: 'POST',
      user: undefined,
      cookies: {},
      connection: { remoteAddress: '127.0.0.1' } as any,
      socket: { remoteAddress: '127.0.0.1' } as any,
    };
  });

  describe('extractRequestContext', () => {
    it('should extract basic request context', () => {
      mockRequest.headers = {
        'user-agent': 'Mozilla/5.0 Test Browser',
      };

      const context = AuditContextUtil.extractRequestContext(mockRequest as TestRequest);

      expect(context).toEqual({
        requestId: expect.any(String),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 Test Browser',
        endpoint: '/api/v1/users',
        httpMethod: 'POST',
        sessionId: undefined,
      });
      expect(context.requestId).toHaveLength(10);
    });

    it('should use custom request ID from header', () => {
      mockRequest.headers = {
        'x-request-id': 'custom-req-123',
      };

      const context = AuditContextUtil.extractRequestContext(mockRequest as TestRequest);

      expect(context.requestId).toBe('custom-req-123');
    });

    it('should extract IP from X-Forwarded-For header', () => {
      mockRequest.headers = {
        'x-forwarded-for': '192.168.1.100, 10.0.0.1',
      };

      const context = AuditContextUtil.extractRequestContext(mockRequest as TestRequest);

      expect(context.ipAddress).toBe('192.168.1.100');
    });

    it('should extract IP from X-Real-IP header', () => {
      mockRequest.headers = {
        'x-real-ip': '192.168.1.200',
      };

      const context = AuditContextUtil.extractRequestContext(mockRequest as TestRequest);

      expect(context.ipAddress).toBe('192.168.1.200');
    });

    it('should extract session ID from custom header', () => {
      mockRequest.headers = {
        'x-session-id': 'sess_abc123',
      };

      const context = AuditContextUtil.extractRequestContext(mockRequest as TestRequest);

      expect(context.sessionId).toBe('sess_abc123');
    });

    it('should extract session ID from cookie', () => {
      mockRequest.cookies = {
        'session-id': 'sess_cookie456',
      };

      const context = AuditContextUtil.extractRequestContext(mockRequest as TestRequest);

      expect(context.sessionId).toBe('sess_cookie456');
    });
  });

  describe('extractUserContext', () => {
    it('should extract user context from request user', () => {
      mockRequest.user = {
        id: 'user_123',
        email: 'test@example.com',
        role: UserRole.ADMIN,
        jti: 'session_789',
      };

      const userContext = AuditContextUtil.extractUserContext(mockRequest as TestRequest);

      expect(userContext).toEqual({
        id: 'user_123',
        email: 'test@example.com',
        role: UserRole.ADMIN,
        sessionId: 'session_789',
      });
    });

    it('should use sub as fallback for user ID', () => {
      mockRequest.user = {
        sub: 'user_sub_456',
        email: 'test@example.com',
        role: UserRole.USER,
      };

      const userContext = AuditContextUtil.extractUserContext(mockRequest as TestRequest);

      expect(userContext?.id).toBe('user_sub_456');
    });

    it('should return undefined when no user in request', () => {
      mockRequest.user = undefined;

      const userContext = AuditContextUtil.extractUserContext(mockRequest as TestRequest);

      expect(userContext).toBeUndefined();
    });
  });

  describe('createBulkOperationMetadata', () => {
    it('should create bulk operation metadata with all parameters', () => {
      const metadata = AuditContextUtil.createBulkOperationMetadata(150, 'batch_abc123', {
        department: 'IT',
      });

      expect(metadata).toEqual({
        bulkOperation: true,
        recordCount: 150,
        batchId: 'batch_abc123',
        timestamp: expect.any(String),
        department: 'IT',
      });
    });

    it('should generate batch ID when not provided', () => {
      const metadata = AuditContextUtil.createBulkOperationMetadata(50);

      expect(metadata.batchId).toHaveLength(8);
      expect(metadata.recordCount).toBe(50);
    });
  });

  describe('createSystemConfigMetadata', () => {
    it('should create system config metadata', () => {
      const metadata = AuditContextUtil.createSystemConfigMetadata(
        'max_upload_size',
        'production',
        { changedBy: 'admin_123' },
      );

      expect(metadata).toEqual({
        systemConfig: true,
        configKey: 'max_upload_size',
        environment: 'production',
        timestamp: expect.any(String),
        changedBy: 'admin_123',
      });
    });
  });

  describe('sanitizeSensitiveData', () => {
    it('should redact default sensitive fields', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'secret123',
        passwordHash: 'hashed_password',
        token: 'jwt_token_here',
        publicInfo: 'This is safe',
      };

      const sanitized = AuditContextUtil.sanitizeSensitiveData(data);

      expect(sanitized).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        password: '[REDACTED]',
        passwordHash: '[REDACTED]',
        token: '[REDACTED]',
        publicInfo: 'This is safe',
      });
    });

    it('should redact custom sensitive fields', () => {
      const data = {
        name: 'John Doe',
        ssn: '123-45-6789',
        creditCard: '4111-1111-1111-1111',
      };

      const sanitized = AuditContextUtil.sanitizeSensitiveData(data, ['ssn', 'creditCard']);

      expect(sanitized).toEqual({
        name: 'John Doe',
        ssn: '[REDACTED]',
        creditCard: '[REDACTED]',
      });
    });

    it('should handle non-object data gracefully', () => {
      expect(AuditContextUtil.sanitizeSensitiveData(null as any)).toBeNull();
      expect(AuditContextUtil.sanitizeSensitiveData('string' as any)).toBe('string');
      expect(AuditContextUtil.sanitizeSensitiveData(123 as any)).toBe(123);
    });
  });

  describe('determineComplianceTags', () => {
    it('should detect GDPR compliance for personal data', () => {
      const data = {
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const tags = AuditContextUtil.determineComplianceTags(data, 'user');

      expect(tags).toContain('GDPR');
      expect(tags).toContain('AUDIT');
    });

    it('should detect HIPAA compliance for health data', () => {
      const data = {
        name: 'John Doe',
        medicalData: 'Patient has diabetes',
        diagnosis: 'Type 2 Diabetes',
      };

      const tags = AuditContextUtil.determineComplianceTags(data, 'patient');

      expect(tags).toContain('HIPAA');
    });

    it('should detect PCI-DSS compliance for financial data', () => {
      const data = {
        name: 'John Doe',
        creditCard: '4111-1111-1111-1111',
        payment: { amount: 100, currency: 'USD' },
      };

      const tags = AuditContextUtil.determineComplianceTags(data, 'payment');

      expect(tags).toContain('PCI-DSS');
    });

    it('should add audit tag for admin resources', () => {
      const data = { name: 'Admin User' };

      expect(AuditContextUtil.determineComplianceTags(data, 'user')).toContain('AUDIT');
      expect(AuditContextUtil.determineComplianceTags(data, 'role')).toContain('AUDIT');
      expect(AuditContextUtil.determineComplianceTags(data, 'permission')).toContain('AUDIT');
    });

    it('should return empty array for non-sensitive data', () => {
      const data = { name: 'Public Data', category: 'general' };

      const tags = AuditContextUtil.determineComplianceTags(data, 'general');

      expect(tags).toEqual([]);
    });

    it('should combine multiple compliance tags', () => {
      const data = {
        email: 'patient@example.com', // GDPR
        medicalData: 'Sensitive health info', // HIPAA
        creditCard: '4111-1111-1111-1111', // PCI-DSS
      };

      const tags = AuditContextUtil.determineComplianceTags(data, 'user');

      expect(tags).toContain('GDPR');
      expect(tags).toContain('HIPAA');
      expect(tags).toContain('PCI-DSS');
      expect(tags).toContain('AUDIT');
    });
  });
});
