import { Response } from 'express';
import { milliseconds } from 'date-fns';

/**
 * Setzt das Admin-Token als HttpOnly Cookie
 *
 * @param res - Express Response-Objekt
 * @param token - Der Admin JWT-Token
 * @returns void
 */
export function setAdminTokenCookie(res: Response, token: string): void {
  res.cookie('adminToken', token, {
    httpOnly: true,
    maxAge: milliseconds({ minutes: 15 }),
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
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
