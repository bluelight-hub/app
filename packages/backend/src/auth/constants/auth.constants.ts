/**
 * Auth Konstanten
 */

/**
 * Name des Admin JWT Cookies
 */
export const ADMIN_JWT_COOKIE = 'adminToken';

/**
 * Gibt Cookie-Optionen für Admin-Token zurück
 * @returns Cookie-Optionen mit dynamischem secure-Flag
 */
export const getAdminCookieOptions = () => ({
  httpOnly: true,
  maxAge: 15 * 60 * 1000, // 15 Minuten
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
});
