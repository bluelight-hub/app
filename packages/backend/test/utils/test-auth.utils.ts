import type { INestApplication } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';

/**
 * Auth-Test-Utilities
 *
 * Hilfsfunktionen für Authentifizierung und Autorisierung in E2E-Tests.
 */

/**
 * Unified Auth - Login oder automatische Registrierung
 *
 * @param app NestJS Test-Applikation
 * @param username Benutzername für Auth
 * @param password Optionales Passwort (für Admin-Accounts)
 * @returns Response-Objekt mit User-Daten und Tokens
 */
export async function unifiedAuth(app: INestApplication, username: string, password?: string) {
  const payload: { username: string; password?: string } = { username };
  if (password) {
    payload.password = password;
  }

  return request(app.getHttpServer()).post('/api/auth/unified').send(payload).expect(200);
}

/**
 * @deprecated Use unifiedAuth instead
 * Legacy-Wrapper für Kompatibilität
 */
export async function register(app: INestApplication, username: string) {
  return unifiedAuth(app, username);
}

/**
 * @deprecated Use unifiedAuth instead
 * Legacy-Wrapper für Kompatibilität
 */
export async function login(app: INestApplication, username: string) {
  return unifiedAuth(app, username);
}

/**
 * Extrahiert Cookies aus der Response
 *
 * @param response Supertest Response-Objekt
 * @returns Objekt mit accessToken und refreshToken Cookies
 */
export function extractCookies(response: request.Response): {
  accessToken?: string;
  refreshToken?: string;
} {
  const cookies = response.headers['set-cookie'] as unknown as string[];
  const result: { accessToken?: string; refreshToken?: string } = {};

  if (!cookies) {
    return result;
  }

  for (const cookie of cookies) {
    if (cookie.startsWith('accessToken=')) {
      result.accessToken = cookie.split(';')[0].split('=')[1];
    }
    if (cookie.startsWith('refreshToken=')) {
      result.refreshToken = cookie.split(';')[0].split('=')[1];
    }
  }

  return result;
}

/**
 * Extrahiert Admin-Token aus der Response
 *
 * @param response Supertest Response-Objekt
 * @returns Admin-Token oder undefined
 */
export function extractAdminToken(response: request.Response): string | undefined {
  const cookies = response.headers['set-cookie'] as unknown as string[];

  if (!cookies) {
    return undefined;
  }

  for (const cookie of cookies) {
    if (cookie.startsWith('adminToken=')) {
      return cookie.split(';')[0].split('=')[1];
    }
  }

  return undefined;
}

/**
 * Erstellt Cookie-Header aus Tokens
 *
 * @param accessToken Access Token
 * @param refreshToken Refresh Token (optional)
 * @returns Cookie-Header-String
 */
export function createCookieHeader(accessToken: string, refreshToken?: string): string {
  let cookie = `accessToken=${accessToken}`;
  if (refreshToken) {
    cookie += `; refreshToken=${refreshToken}`;
  }
  return cookie;
}

/**
 * Dekodiert ein JWT-Token ohne Verifizierung
 *
 * @param token JWT-Token
 * @returns Dekodiertes Token-Payload
 */
export function decodeToken(token: string): unknown {
  return jwt.decode(token);
}

/**
 * Extrahiert User-ID aus einem Access-Token
 *
 * @param token Access-Token
 * @returns User-ID oder null
 */
export function getUserIdFromToken(token: string): string | null {
  const decoded = decodeToken(token) as { userId?: string } | null;
  return decoded?.userId || null;
}

/**
 * Registriert mehrere Test-Benutzer
 *
 * @param app NestJS Test-Applikation
 * @param usernames Array von Benutzernamen
 * @returns Array von Response-Objekten
 */
export async function registerMultipleUsers(app: INestApplication, usernames: string[]): Promise<request.Response[]> {
  return Promise.all(usernames.map((username) => unifiedAuth(app, username)));
}

/**
 * Admin-Login
 *
 * @param app NestJS Test-Applikation
 * @param username Admin-Benutzername
 * @param password Admin-Passwort
 * @returns Response-Objekt mit Admin-Token
 */
export async function adminLogin(app: INestApplication, username: string, password: string) {
  return request(app.getHttpServer()).post('/api/auth/admin/login').send({ username, password }).expect(200);
}

/**
 * Admin-Setup durchführen
 *
 * @param app NestJS Test-Applikation
 * @param setupData Setup-Daten für Admin
 * @param userCookie Cookie eines authentifizierten Users (erster User wird Admin)
 * @returns Response-Objekt
 */
export async function adminSetup(app: INestApplication, setupData: { username: string; password: string; role?: string }, userCookie: string) {
  return request(app.getHttpServer()).post('/api/auth/admin/setup').set('Cookie', userCookie).send(setupData).expect(201);
}

/**
 * Verifiziert ein Admin-Token
 *
 * @param app NestJS Test-Applikation
 * @param adminToken Admin-Token-Cookie
 * @returns Response-Objekt
 */
export async function verifyAdminToken(app: INestApplication, adminToken: string) {
  return request(app.getHttpServer()).get('/api/auth/admin/verify').set('Cookie', `adminToken=${adminToken}`).expect(200);
}

/**
 * Prüft den Admin-Status
 *
 * @param app NestJS Test-Applikation
 * @returns Response-Objekt mit Admin-Status
 */
export async function checkAdminStatus(app: INestApplication) {
  return request(app.getHttpServer()).get('/api/auth/admin/status').expect(200);
}

/**
 * Meldet einen Admin ab
 *
 * @param app NestJS Test-Applikation
 * @param adminToken Admin-Token (optional für Cookie)
 * @returns Response-Objekt
 */
export async function adminLogout(app: INestApplication, adminToken?: string) {
  const req = request(app.getHttpServer()).post('/api/auth/admin/logout');

  if (adminToken) {
    req.set('Cookie', `adminToken=${adminToken}`);
  }

  return req.expect(200);
}

/**
 * Meldet einen User ab
 *
 * @param app NestJS Test-Applikation
 * @param accessToken Access-Token (optional für Cookie)
 * @returns Response-Objekt
 */
export async function logout(app: INestApplication, accessToken?: string) {
  const req = request(app.getHttpServer()).post('/api/auth/logout');

  if (accessToken) {
    req.set('Cookie', `accessToken=${accessToken}`);
  }

  return req.expect(200);
}

/**
 * Prüft den Auth-Status
 *
 * @param app NestJS Test-Applikation
 * @param cookies Optionale Cookies (access + admin tokens)
 * @returns Response-Objekt mit Auth-Status
 */
export async function checkAuthStatus(app: INestApplication, cookies?: { accessToken?: string; adminToken?: string }) {
  const req = request(app.getHttpServer()).get('/api/auth/check');

  if (cookies) {
    const cookieArray = [];
    if (cookies.accessToken) cookieArray.push(`accessToken=${cookies.accessToken}`);
    if (cookies.adminToken) cookieArray.push(`adminToken=${cookies.adminToken}`);
    if (cookieArray.length > 0) {
      req.set('Cookie', cookieArray.join('; '));
    }
  }

  const result = await req;
  return result;
}

// Export für Backward Compatibility
export const TestAuthUtils = {
  unifiedAuth,
  register,
  login,
  extractCookies,
  extractAdminToken,
  createCookieHeader,
  decodeToken,
  getUserIdFromToken,
  registerMultipleUsers,
  adminLogin,
  adminSetup,
  verifyAdminToken,
  checkAdminStatus,
  adminLogout,
  logout,
  checkAuthStatus,
};
