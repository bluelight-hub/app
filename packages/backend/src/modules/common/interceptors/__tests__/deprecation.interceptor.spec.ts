import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { DeprecationInterceptor } from '../deprecation.interceptor';
import { DEPRECATION_KEY, DeprecationInfo } from '../../decorators/deprecated.decorator';

describe('DeprecationInterceptor', () => {
  let interceptor: DeprecationInterceptor;
  let reflector: Reflector;

  const mockNext: CallHandler = {
    handle: jest.fn().mockReturnValue(of('test-response')),
  };

  /**
   * Erstellt einen Mock-ExecutionContext fuer HTTP-Requests.
   */
  function createHttpContext(overrides?: { originalUrl?: string; handler?: () => void; classRef?: new () => unknown }): ExecutionContext {
    const handler = overrides?.handler ?? (() => {});
    const classRef = overrides?.classRef ?? class TestController {};
    const headers: Record<string, string> = {};

    const response = {
      setHeader: jest.fn((key: string, value: string) => {
        headers[key] = value;
      }),
      _headers: headers,
    };

    const request = {
      originalUrl: overrides?.originalUrl ?? '/api/v-alpha/einsatz',
    };

    return {
      getType: () => 'http',
      getHandler: () => handler,
      getClass: () => classRef,
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  /**
   * Erstellt einen Mock-ExecutionContext fuer WebSocket-Verbindungen.
   */
  function createWsContext(): ExecutionContext {
    return {
      getType: () => 'ws',
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new DeprecationInterceptor(reflector);
    jest.clearAllMocks();
  });

  it('sollte den Interceptor erstellen', () => {
    expect(interceptor).toBeDefined();
  });

  describe('Handler OHNE @Deprecated', () => {
    it('sollte keine Deprecation-Headers setzen', (done) => {
      const context = createHttpContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      interceptor.intercept(context, mockNext).subscribe({
        next: (value) => {
          const response = context.switchToHttp().getResponse() as { setHeader: jest.Mock };
          expect(response.setHeader).not.toHaveBeenCalled();
          expect(value).toBe('test-response');
          done();
        },
      });
    });

    it('sollte next.handle() aufrufen', (done) => {
      const context = createHttpContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      interceptor.intercept(context, mockNext).subscribe({
        next: () => {
          expect(mockNext.handle).toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('Handler MIT @Deprecated', () => {
    const deprecationInfo: DeprecationInfo = {
      sunsetDate: '2026-06-01',
      successorVersion: '1',
    };

    it('sollte Deprecation: true Header setzen', (done) => {
      const context = createHttpContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(deprecationInfo);

      interceptor.intercept(context, mockNext).subscribe({
        next: () => {
          const response = context.switchToHttp().getResponse() as { setHeader: jest.Mock };
          expect(response.setHeader).toHaveBeenCalledWith('Deprecation', 'true');
          done();
        },
      });
    });

    it('sollte Sunset Header mit sunsetDate setzen', (done) => {
      const context = createHttpContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(deprecationInfo);

      interceptor.intercept(context, mockNext).subscribe({
        next: () => {
          const response = context.switchToHttp().getResponse() as { setHeader: jest.Mock };
          expect(response.setHeader).toHaveBeenCalledWith('Sunset', '2026-06-01');
          done();
        },
      });
    });

    it('sollte Link Header mit successor-version setzen', (done) => {
      const context = createHttpContext({ originalUrl: '/api/v-alpha/einsatz' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(deprecationInfo);

      interceptor.intercept(context, mockNext).subscribe({
        next: () => {
          const response = context.switchToHttp().getResponse() as { setHeader: jest.Mock };
          expect(response.setHeader).toHaveBeenCalledWith('Link', '</api/v-1/einsatz>; rel="successor-version"');
          done();
        },
      });
    });

    it('sollte next.handle() trotz Deprecation aufrufen', (done) => {
      const context = createHttpContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(deprecationInfo);

      interceptor.intercept(context, mockNext).subscribe({
        next: (value) => {
          expect(mockNext.handle).toHaveBeenCalled();
          expect(value).toBe('test-response');
          done();
        },
      });
    });
  });

  describe('Class-level @Deprecated', () => {
    it('sollte Deprecation-Metadata auch auf Class-Level erkennen', (done) => {
      const classDeprecation: DeprecationInfo = {
        sunsetDate: '2026-12-31',
        successorVersion: '2',
      };

      const context = createHttpContext({ originalUrl: '/api/v-alpha/befehl/123' });
      const getAllAndOverrideSpy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(classDeprecation);

      interceptor.intercept(context, mockNext).subscribe({
        next: () => {
          // Reflector wird mit Handler UND Class aufgerufen
          expect(getAllAndOverrideSpy).toHaveBeenCalledWith(DEPRECATION_KEY, [context.getHandler(), context.getClass()]);
          const response = context.switchToHttp().getResponse() as { setHeader: jest.Mock };
          expect(response.setHeader).toHaveBeenCalledWith('Deprecation', 'true');
          expect(response.setHeader).toHaveBeenCalledWith('Sunset', '2026-12-31');
          expect(response.setHeader).toHaveBeenCalledWith('Link', '</api/v-2/befehl/123>; rel="successor-version"');
          done();
        },
      });
    });
  });

  describe('Link Header URL-Transformation', () => {
    it('sollte v-alpha korrekt durch successorVersion ersetzen', (done) => {
      const deprecation: DeprecationInfo = {
        sunsetDate: '2026-06-01',
        successorVersion: '1',
      };
      const context = createHttpContext({ originalUrl: '/api/v-alpha/einsatz/abc123/details' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(deprecation);

      interceptor.intercept(context, mockNext).subscribe({
        next: () => {
          const response = context.switchToHttp().getResponse() as { setHeader: jest.Mock };
          expect(response.setHeader).toHaveBeenCalledWith('Link', '</api/v-1/einsatz/abc123/details>; rel="successor-version"');
          done();
        },
      });
    });

    it('sollte v-beta korrekt durch successorVersion ersetzen', (done) => {
      const deprecation: DeprecationInfo = {
        sunsetDate: '2026-06-01',
        successorVersion: '2',
      };
      const context = createHttpContext({ originalUrl: '/api/v-beta/befehl' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(deprecation);

      interceptor.intercept(context, mockNext).subscribe({
        next: () => {
          const response = context.switchToHttp().getResponse() as { setHeader: jest.Mock };
          expect(response.setHeader).toHaveBeenCalledWith('Link', '</api/v-2/befehl>; rel="successor-version"');
          done();
        },
      });
    });

    it('sollte bei URL ohne Versionsprefix keinen Link-Header setzen', (done) => {
      const deprecation: DeprecationInfo = {
        sunsetDate: '2026-06-01',
        successorVersion: '1',
      };
      const context = createHttpContext({ originalUrl: '/health' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(deprecation);

      interceptor.intercept(context, mockNext).subscribe({
        next: () => {
          const response = context.switchToHttp().getResponse() as { setHeader: jest.Mock };
          // Deprecation + Sunset werden gesetzt, aber Link nicht (kein Version-Prefix zum Ersetzen)
          expect(response.setHeader).toHaveBeenCalledWith('Deprecation', 'true');
          expect(response.setHeader).toHaveBeenCalledWith('Sunset', '2026-06-01');
          expect(response.setHeader).not.toHaveBeenCalledWith('Link', expect.anything());
          done();
        },
      });
    });

    it('sollte mit undefined originalUrl graceful umgehen', (done) => {
      const deprecation: DeprecationInfo = {
        sunsetDate: '2026-06-01',
        successorVersion: '1',
      };
      const context = createHttpContext();
      // originalUrl manuell auf undefined setzen
      const request = context.switchToHttp().getRequest() as { originalUrl?: string };
      request.originalUrl = undefined;
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(deprecation);

      interceptor.intercept(context, mockNext).subscribe({
        next: () => {
          const response = context.switchToHttp().getResponse() as { setHeader: jest.Mock };
          expect(response.setHeader).toHaveBeenCalledWith('Deprecation', 'true');
          expect(response.setHeader).toHaveBeenCalledWith('Sunset', '2026-06-01');
          // Kein Link-Header bei leerem originalUrl
          expect(response.setHeader).not.toHaveBeenCalledWith('Link', expect.anything());
          done();
        },
      });
    });
  });

  describe('Nicht-HTTP-Kontexte', () => {
    it('sollte WebSocket-Kontexte ueberspringen', (done) => {
      const wsContext = createWsContext();
      jest.spyOn(reflector, 'getAllAndOverride');

      interceptor.intercept(wsContext, mockNext).subscribe({
        next: () => {
          // Reflector sollte nicht aufgerufen werden bei non-HTTP
          expect(reflector.getAllAndOverride).not.toHaveBeenCalled();
          expect(mockNext.handle).toHaveBeenCalled();
          done();
        },
      });
    });
  });
});
