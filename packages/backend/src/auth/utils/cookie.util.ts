import { Response } from 'express';
import { ADMIN_JWT_COOKIE, getAdminCookieOptions } from '../constants/auth.constants';

/**
 * Setzt das Admin-Token als HttpOnly Cookie
 *
 * @param res - Express Response-Objekt
 * @param token - Der Admin JWT-Token
 * @returns void
 */
export function setAdminTokenCookie(res: Response, token: string): void {
  res.cookie(ADMIN_JWT_COOKIE, token, getAdminCookieOptions());
}

/**
 * Löscht das Admin-Token Cookie
 *
 * @param res - Express Response-Objekt
 * @returns void
 */
export function clearAdminTokenCookie(res: Response): void {
  res.clearCookie(ADMIN_JWT_COOKIE);
}
