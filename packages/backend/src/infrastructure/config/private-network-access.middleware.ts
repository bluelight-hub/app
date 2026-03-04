import type { NextFunction, Request, Response } from 'express';

export type OriginAllowPolicy = (origin: string | undefined) => boolean;

const readHeaderValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const isPrivateNetworkPreflight = (req: Request): boolean => {
  if (req.method !== 'OPTIONS') {
    return false;
  }

  const requestPrivateNetworkHeader = readHeaderValue(req.headers['access-control-request-private-network']);
  return requestPrivateNetworkHeader?.toLowerCase() === 'true';
};

/**
 * Setzt PNA-Response-Header nur für gültige PNA-Preflights.
 * Die Origin-Freigabe selbst bleibt vollständig in der zentralen CORS-Policy.
 */
export const createPrivateNetworkAccessMiddleware =
  (isOriginAllowed: OriginAllowPolicy) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!isPrivateNetworkPreflight(req)) {
      next();
      return;
    }

    const origin = readHeaderValue(req.headers.origin);
    if (!isOriginAllowed(origin)) {
      next();
      return;
    }

    res.header('Access-Control-Allow-Private-Network', 'true');
    res.vary('Access-Control-Request-Private-Network');
    next();
  };
