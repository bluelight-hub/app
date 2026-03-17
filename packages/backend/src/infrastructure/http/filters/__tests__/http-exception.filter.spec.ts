// @ts-nocheck
import { InternalServerErrorException } from '@nestjs/common';
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
});
