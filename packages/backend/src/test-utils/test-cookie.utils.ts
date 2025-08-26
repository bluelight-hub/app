import { milliseconds } from 'date-fns';
import type { Response } from 'express';

/**
 * Setzt das Admin-Token als HttpOnly Cookie
 *
 * @param res - Express Response-Objekt
 * @param token - Der Admin JWT-Token
 * @param isProduction - Ob die App in Produktion läuft
 * @returns void
 */
export function setAdminTokenCookie(
  res: Response,
  token: string,
  isProduction: boolean = false,
): void {
  res.cookie('adminToken', token, {
    httpOnly: true,
    maxAge: milliseconds({ minutes: 15 }),
    sameSite: 'lax' as const,
    secure: isProduction,
  });
}

/**
 * Löscht das Admin-Token Cookie
 *
 * @param res - Express Response-Objekt
 * @returns void
 */
export function clearAdminTokenCookie(res: Response): void {
  res.clearCookie('adminToken');
}
