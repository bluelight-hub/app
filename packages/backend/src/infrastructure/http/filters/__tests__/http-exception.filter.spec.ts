// @ts-nocheck
import { ConflictException, InternalServerErrorException, UnprocessableEntityException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from '../http-exception.filter';

describe('HttpExceptionFilter', () => {
  function createHost() {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const setHeader = jest.fn();
    const request = {
      headers: {},
      method: 'POST',
      url: '/api/v-alpha/admin/setup',
      startTime: Date.now(),
    };
    const response = {
      locals: {},
      setHeader,
      status,
    };

    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ArgumentsHost;

    return { host, json, status, setHeader };
  }

  it('reicht whitelisted 5xx-Fehlercodes für den Setup-Flow an den Client weiter', () => {
    const logger = {
      error: jest.fn(),
    };
    const filter = new HttpExceptionFilter(logger);
    const { host, json, status, setHeader } = createHost();

    const exception = new InternalServerErrorException({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'SETUP_EXECUTION_FAILED',
      code: 'DATABASE_ERROR',
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(500);
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String));
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
        code: 'DATABASE_ERROR',
      }),
    );
  });

  it('reicht den `context`-Block aus 409-Bodies an den Client durch (Story 3.2 AC5/AC6)', () => {
    const logger = { error: jest.fn() };
    const filter = new HttpExceptionFilter(logger);
    const { host, json } = createHost();

    const exception = new ConflictException({
      statusCode: 409,
      error: 'Conflict',
      message: 'ConflictDetected:PsaProfilZuweisung',
      context: { rule: 'OCC', einheitId: 'cuid2-einheit', profil: 'BASIS', currentVersion: 4, attemptedVersion: 3 },
    });

    filter.catch(exception, host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: 'ConflictDetected:PsaProfilZuweisung',
        context: { rule: 'OCC', einheitId: 'cuid2-einheit', profil: 'BASIS', currentVersion: 4, attemptedVersion: 3 },
      }),
    );
  });

  it('reicht `context` auch bei 422 durch und fehlt bei 5xx-Bodies', () => {
    const logger = { error: jest.fn() };
    const filter = new HttpExceptionFilter(logger);

    const { host: host422, json: json422 } = createHost();
    filter.catch(
      new UnprocessableEntityException({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: 'BusinessRule:Foo',
        context: { rule: 'Foo' },
      }),
      host422,
    );
    expect(json422).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 422, context: { rule: 'Foo' } }));

    const { host: host500, json: json500 } = createHost();
    filter.catch(
      new InternalServerErrorException({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Boom',
        context: { layer: 'infrastructure' },
      }),
      host500,
    );
    const body500 = json500.mock.calls[0]?.[0];
    expect(body500).toBeDefined();
    expect(body500.statusCode).toBe(500);
    expect(body500.context).toBeUndefined();
  });
});
