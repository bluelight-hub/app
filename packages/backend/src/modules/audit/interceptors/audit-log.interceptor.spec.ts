import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AuditLoggerUtil } from '../utils';
import { AuditActionType, AuditSeverity } from '@prisma/generated/prisma/client';

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;
  let auditLogger: jest.Mocked<AuditLoggerUtil>;

  const mockRequest = {
    method: 'GET',
    path: '/api/users/123',
    body: {},
    query: {},
    params: { id: '123' },
    headers: { 'x-request-id': 'test-request-id' },
  };

  const mockResponse = {
    statusCode: 200,
  };

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
    }),
  } as unknown as ExecutionContext;

  const mockCallHandler: CallHandler = {
    handle: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogInterceptor,
        {
          provide: AuditLoggerUtil,
          useValue: {
            logAction: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    interceptor = module.get<AuditLogInterceptor>(AuditLogInterceptor);
    auditLogger = module.get(AuditLoggerUtil);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('sollte Audit-Log für erfolgreiche Anfragen erstellen', (done) => {
      const mockData = { id: '123', name: 'Test User' };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (data) => {
          expect(data).toEqual(mockData);

          // Warte kurz, damit der async Audit-Log-Aufruf abgeschlossen ist
          setTimeout(() => {
            expect(auditLogger.logAction).toHaveBeenCalledWith(
              mockRequest,
              expect.objectContaining({
                actionType: AuditActionType.READ,
                severity: AuditSeverity.LOW,
                action: 'GET api/users',
                resource: 'api/users',
                resourceId: '123',
                success: true,
                statusCode: 200,
                duration: expect.any(Number),
                metadata: expect.objectContaining({
                  method: 'GET',
                  path: '/api/users/123',
                  requestId: 'test-request-id',
                  responseSize: expect.any(Number),
                }),
              }),
            );
            done();
          }, 10);
        },
      });
    });

    it('sollte Audit-Log für fehlgeschlagene Anfragen erstellen', (done) => {
      const error = new HttpException('Not Found', HttpStatus.NOT_FOUND);
      (mockCallHandler.handle as jest.Mock).mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (err) => {
          expect(err).toBe(error);

          // Warte kurz, damit der async Audit-Log-Aufruf abgeschlossen ist
          setTimeout(() => {
            expect(auditLogger.logAction).toHaveBeenCalledWith(
              mockRequest,
              expect.objectContaining({
                actionType: AuditActionType.READ,
                severity: AuditSeverity.HIGH,
                action: 'GET api/users (failed with 404)',
                resource: 'api/users',
                resourceId: '123',
                success: false,
                statusCode: 404,
                errorMessage: 'Not Found',
                duration: expect.any(Number),
                metadata: expect.objectContaining({
                  method: 'GET',
                  path: '/api/users/123',
                  requestId: 'test-request-id',
                }),
              }),
            );
            done();
          }, 10);
        },
      });
    });

    it('sollte höhere Severity für Admin-Endpoints verwenden', (done) => {
      const adminRequest = {
        ...mockRequest,
        method: 'DELETE',
        path: '/admin/users/123',
      };

      const adminContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(adminRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as unknown as ExecutionContext;

      (mockCallHandler.handle as jest.Mock).mockReturnValue(of({}));

      interceptor.intercept(adminContext, mockCallHandler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogger.logAction).toHaveBeenCalledWith(
              adminRequest,
              expect.objectContaining({
                actionType: AuditActionType.DELETE,
                severity: AuditSeverity.CRITICAL,
                action: 'DELETE admin/users',
                resource: 'admin/users',
              }),
            );
            done();
          }, 10);
        },
      });
    });

    it('sollte sensible Daten im Body sanitisieren', (done) => {
      const sensitiveRequest = {
        ...mockRequest,
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'secret123',
          apiKey: 'key-12345',
        },
      };

      const sensitiveContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(sensitiveRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as unknown as ExecutionContext;

      (mockCallHandler.handle as jest.Mock).mockReturnValue(of({}));

      interceptor.intercept(sensitiveContext, mockCallHandler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogger.logAction).toHaveBeenCalledWith(
              sensitiveRequest,
              expect.objectContaining({
                metadata: expect.objectContaining({
                  body: {
                    username: 'testuser',
                    password: '[REDACTED]',
                    apiKey: '[REDACTED]',
                  },
                }),
              }),
            );
            done();
          }, 10);
        },
      });
    });

    it('sollte bestimmte Pfade vom Audit-Logging überspringen', () => {
      const healthRequest = {
        ...mockRequest,
        path: '/health',
      };

      const healthContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(healthRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as unknown as ExecutionContext;

      (mockCallHandler.handle as jest.Mock).mockReturnValue(of({}));

      interceptor.intercept(healthContext, mockCallHandler).subscribe();

      expect(auditLogger.logAction).not.toHaveBeenCalled();
    });

    it('sollte Nano-ID aus dem Pfad extrahieren', (done) => {
      const nanoIdRequest = {
        ...mockRequest,
        path: '/api/einsatz/xV4vKJH7dQR1nM9pL2sT3',
        params: {}, // Keine params.id, sodass die ID aus dem Pfad extrahiert wird
      };

      const nanoIdContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(nanoIdRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as unknown as ExecutionContext;

      (mockCallHandler.handle as jest.Mock).mockReturnValue(of({}));

      interceptor.intercept(nanoIdContext, mockCallHandler).subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogger.logAction).toHaveBeenCalledWith(
              nanoIdRequest,
              expect.objectContaining({
                resourceId: 'xV4vKJH7dQR1nM9pL2sT3',
              }),
            );
            done();
          }, 10);
        },
      });
    });

    it('sollte Fehler beim Audit-Logging abfangen', (done) => {
      auditLogger.logAction.mockRejectedValue(new Error('Audit logging failed'));

      (mockCallHandler.handle as jest.Mock).mockReturnValue(of({}));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (data) => {
          // Die Anfrage sollte trotz Audit-Log-Fehler erfolgreich sein
          expect(data).toBeDefined();
          done();
        },
      });
    });
  });
});
