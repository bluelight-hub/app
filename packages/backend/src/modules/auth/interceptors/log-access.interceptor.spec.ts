import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { LogAccessInterceptor } from './log-access.interceptor';
import { SecurityLogService } from '@/security/services/security-log.service';
import { createMockSecurityLogService } from '@/test/mocks/security-log.service.mock';
import { LOG_ACCESS_KEY, LogAccessMetadata } from '../decorators/log-access.decorator';
import { SecurityEventTypeExtended } from '@/security/constants/event-types';

describe('LogAccessInterceptor', () => {
  let interceptor: LogAccessInterceptor;
  let mockSecurityLogService: ReturnType<typeof createMockSecurityLogService>;
  let mockReflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    mockSecurityLogService = createMockSecurityLogService();
    mockReflector = {
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndMerge: jest.fn(),
      getAllAndOverride: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogAccessInterceptor,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: SecurityLogService,
          useValue: mockSecurityLogService,
        },
      ],
    }).compile();

    interceptor = module.get<LogAccessInterceptor>(LogAccessInterceptor);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    const createMockExecutionContext = (overrides = {}): ExecutionContext => {
      const defaultRequest = {
        user: { id: 'user-123', email: 'test@example.com' },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
        path: '/api/test',
        method: 'GET',
        params: {},
        query: {},
        ...overrides,
      };

      return {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(defaultRequest),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
      } as unknown as ExecutionContext;
    };

    const createMockCallHandler = (response = 'test-response'): CallHandler => ({
      handle: jest.fn().mockReturnValue(of(response)),
    });

    it('should not log when no metadata is present', async () => {
      mockReflector.get.mockReturnValue(undefined);
      const context = createMockExecutionContext();
      const mockCallHandler = createMockCallHandler();

      const result = await interceptor.intercept(context, mockCallHandler).toPromise();

      expect(result).toBe('test-response');
      expect(mockSecurityLogService.log).not.toHaveBeenCalled();
    });

    it('should not log when SecurityLogService is not available', async () => {
      const metadata: LogAccessMetadata = {
        resource: 'user-data',
        action: 'read',
        details: 'Reading user profile',
      };
      mockReflector.get.mockReturnValue(metadata);

      // Create interceptor without SecurityLogService
      const interceptorWithoutLogger = new LogAccessInterceptor(mockReflector, null);
      const context = createMockExecutionContext();
      const mockCallHandler = createMockCallHandler();

      const result = await interceptorWithoutLogger.intercept(context, mockCallHandler).toPromise();

      expect(result).toBe('test-response');
    });

    it('should log data access when metadata is present', async () => {
      const metadata: LogAccessMetadata = {
        resource: 'user-data',
        action: 'read',
        details: 'Reading user profile',
      };
      mockReflector.get.mockReturnValue(metadata);
      const context = createMockExecutionContext();
      const mockCallHandler = createMockCallHandler();

      const result = await interceptor.intercept(context, mockCallHandler).toPromise();

      expect(result).toBe('test-response');
      expect(mockReflector.get).toHaveBeenCalledWith(LOG_ACCESS_KEY, context.getHandler());

      // Should log both start and completion
      expect(mockSecurityLogService.log).toHaveBeenCalledTimes(2);

      // Check start log
      expect(mockSecurityLogService.log).toHaveBeenNthCalledWith(
        1,
        SecurityEventTypeExtended.DATA_ACCESS,
        expect.objectContaining({
          action: SecurityEventTypeExtended.DATA_ACCESS,
          userId: 'user-123',
          ip: '127.0.0.1',
          userAgent: 'test-agent',
          metadata: expect.objectContaining({
            resource: 'user-data',
            dataAction: 'read',
            details: 'Reading user profile',
            status: 'started',
            path: '/api/test',
            method: 'GET',
            severity: 'INFO',
          }),
        }),
      );

      // Check completion log
      expect(mockSecurityLogService.log).toHaveBeenNthCalledWith(
        2,
        SecurityEventTypeExtended.DATA_ACCESS,
        expect.objectContaining({
          action: SecurityEventTypeExtended.DATA_ACCESS,
          userId: 'user-123',
          ip: '127.0.0.1',
          userAgent: 'test-agent',
          metadata: expect.objectContaining({
            resource: 'user-data',
            dataAction: 'read',
            details: 'Reading user profile',
            status: 'completed',
            path: '/api/test',
            method: 'GET',
            severity: 'INFO',
            duration: expect.any(Number),
          }),
        }),
      );
    });

    it('should log error when handler throws', async () => {
      const metadata: LogAccessMetadata = {
        resource: 'sensitive-data',
        action: 'write',
        details: 'Updating sensitive information',
      };
      mockReflector.get.mockReturnValue(metadata);
      const context = createMockExecutionContext();

      const error = new Error('Handler error');
      const mockCallHandler: CallHandler = {
        handle: jest.fn().mockReturnValue(throwError(error)),
      };

      await expect(interceptor.intercept(context, mockCallHandler).toPromise()).rejects.toThrow(
        'Handler error',
      );

      // Should log both start and error
      expect(mockSecurityLogService.log).toHaveBeenCalledTimes(2);

      // Check error log
      expect(mockSecurityLogService.log).toHaveBeenNthCalledWith(
        2,
        SecurityEventTypeExtended.DATA_ACCESS,
        expect.objectContaining({
          metadata: expect.objectContaining({
            status: 'failed',
            error: 'Handler error',
            severity: 'WARNING',
            duration: expect.any(Number),
          }),
        }),
      );
    });

    it('should handle missing user gracefully', async () => {
      const metadata: LogAccessMetadata = {
        resource: 'public-data',
        action: 'read',
      };
      mockReflector.get.mockReturnValue(metadata);
      const context = createMockExecutionContext({ user: null });
      const mockCallHandler = createMockCallHandler();

      await interceptor.intercept(context, mockCallHandler).toPromise();

      expect(mockSecurityLogService.log).toHaveBeenCalledWith(
        SecurityEventTypeExtended.DATA_ACCESS,
        expect.objectContaining({
          userId: '',
        }),
      );
    });

    it('should handle missing request properties gracefully', async () => {
      const metadata: LogAccessMetadata = {
        resource: 'data',
        action: 'read',
      };
      mockReflector.get.mockReturnValue(metadata);
      const context = createMockExecutionContext({
        ip: undefined,
        headers: {},
      });
      const mockCallHandler = createMockCallHandler();

      await interceptor.intercept(context, mockCallHandler).toPromise();

      expect(mockSecurityLogService.log).toHaveBeenCalledWith(
        SecurityEventTypeExtended.DATA_ACCESS,
        expect.objectContaining({
          ip: '',
          userAgent: undefined,
        }),
      );
    });

    it('should include request params and query in log', async () => {
      const metadata: LogAccessMetadata = {
        resource: 'user',
        action: 'update',
      };
      mockReflector.get.mockReturnValue(metadata);
      const context = createMockExecutionContext({
        params: { id: '123' },
        query: { include: 'profile' },
      });
      const mockCallHandler = createMockCallHandler();

      await interceptor.intercept(context, mockCallHandler).toPromise();

      expect(mockSecurityLogService.log).toHaveBeenCalledWith(
        SecurityEventTypeExtended.DATA_ACCESS,
        expect.objectContaining({
          metadata: expect.objectContaining({
            params: { id: '123' },
            query: { include: 'profile' },
          }),
        }),
      );
    });

    it('should continue processing even if logging fails', async () => {
      const metadata: LogAccessMetadata = {
        resource: 'data',
        action: 'read',
      };
      mockReflector.get.mockReturnValue(metadata);
      mockSecurityLogService.log.mockRejectedValue(new Error('Logging failed'));
      const context = createMockExecutionContext();
      const mockCallHandler = createMockCallHandler();

      const result = await interceptor.intercept(context, mockCallHandler).toPromise();

      expect(result).toBe('test-response');
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should use connection.remoteAddress as fallback for IP', async () => {
      const metadata: LogAccessMetadata = {
        resource: 'data',
        action: 'read',
      };
      mockReflector.get.mockReturnValue(metadata);
      const context = createMockExecutionContext({
        ip: undefined,
        connection: { remoteAddress: '192.168.1.1' },
      });
      const mockCallHandler = createMockCallHandler();

      await interceptor.intercept(context, mockCallHandler).toPromise();

      expect(mockSecurityLogService.log).toHaveBeenCalledWith(
        SecurityEventTypeExtended.DATA_ACCESS,
        expect.objectContaining({
          ip: '192.168.1.1',
        }),
      );
    });
  });
});
