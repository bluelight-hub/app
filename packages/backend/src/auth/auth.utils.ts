import { Response } from 'express';
import { milliseconds } from 'date-fns';

/**
 * Cookie-Konfigurationsoptionen für Authentifizierungs-Cookies
 */
export interface AuthCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  maxAge: number;
  path: string;
}

/**
 * Gibt die Standard-Cookie-Optionen für Access-Tokens zurück
 *
 * @param isProduction - Ob die Anwendung in Produktion läuft
 * @returns Cookie-Optionen für Access-Tokens
 */
export function getAccessTokenCookieOptions(isProduction: boolean): AuthCookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: milliseconds({ minutes: 15 }),
    path: '/',
  };
}

/**
 * Gibt die Standard-Cookie-Optionen für Refresh-Tokens zurück
 *
 * @param isProduction - Ob die Anwendung in Produktion läuft
 * @returns Cookie-Optionen für Refresh-Tokens
 */
export function getRefreshTokenCookieOptions(isProduction: boolean): AuthCookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: milliseconds({ days: 7 }),
    path: '/',
  };
}

/**
 * Setzt Authentifizierungs-Cookies in der Response
 *
 * @param res - Express Response-Objekt
 * @param accessToken - Das Access-Token
 * @param refreshToken - Das Refresh-Token
 * @param isProduction - Ob die Anwendung in Produktion läuft
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  isProduction: boolean = false,
): void {
  res.cookie('accessToken', accessToken, getAccessTokenCookieOptions(isProduction));
  res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions(isProduction));
}

/**
 * Löscht Authentifizierungs-Cookies aus der Response
 *
 * @param res - Express Response-Objekt
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
}

/**
 * Gibt die Standard-Cookie-Optionen für Admin-Tokens zurück
 *
 * @param isProduction - Ob die Anwendung in Produktion läuft
 * @returns Cookie-Optionen für Admin-Tokens
 */
export function getAdminTokenCookieOptions(isProduction: boolean): AuthCookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: milliseconds({ minutes: 15 }),
    path: '/',
  };
}

/**
 * Setzt ein Admin-Token als HttpOnly-Cookie
 *
 * @param res - Express Response-Objekt
 * @param adminToken - Das Admin-Token
 * @param isProduction - Ob die Anwendung in Produktion läuft
 */
export function setAdminCookie(
  res: Response,
  adminToken: string,
  isProduction: boolean = false,
): void {
  res.cookie('adminToken', adminToken, getAdminTokenCookieOptions(isProduction));
}
