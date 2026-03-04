import type { Request, Response } from 'express';
import { createPrivateNetworkAccessMiddleware } from './private-network-access.middleware';

const createRequest = (method: string, headers: Request['headers']): Request =>
  ({
    method,
    headers,
  }) as Request;

const createResponse = (): Response =>
  ({
    header: jest.fn().mockReturnThis(),
    vary: jest.fn().mockReturnThis(),
  }) as unknown as Response;

describe('createPrivateNetworkAccessMiddleware', () => {
  it('sets PNA header for allowed private-network preflight', () => {
    const middleware = createPrivateNetworkAccessMiddleware((origin) => origin === 'http://localhost:5173');
    const req = createRequest('OPTIONS', {
      origin: 'http://localhost:5173',
      'access-control-request-private-network': 'true',
    });
    const res = createResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Private-Network', 'true');
    expect(res.vary).toHaveBeenCalledWith('Access-Control-Request-Private-Network');
    expect(res.header).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.any(String));
    expect(res.header).not.toHaveBeenCalledWith('Access-Control-Allow-Credentials', expect.any(String));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not set PNA header when origin is not allowed', () => {
    const middleware = createPrivateNetworkAccessMiddleware(() => false);
    const req = createRequest('OPTIONS', {
      origin: 'https://evil.example',
      'access-control-request-private-network': 'true',
    });
    const res = createResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.header).not.toHaveBeenCalledWith('Access-Control-Allow-Private-Network', 'true');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('ignores non-preflight requests', () => {
    const middleware = createPrivateNetworkAccessMiddleware(() => true);
    const req = createRequest('GET', {
      origin: 'http://localhost:5173',
      'access-control-request-private-network': 'true',
    });
    const res = createResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.header).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('ignores OPTIONS without private-network request header', () => {
    const middleware = createPrivateNetworkAccessMiddleware(() => true);
    const req = createRequest('OPTIONS', {
      origin: 'http://localhost:5173',
    });
    const res = createResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.header).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
