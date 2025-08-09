import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

/**
 * Auth-Test-Utilities
 *
 * Hilfsfunktionen für Authentifizierung und Autorisierung in E2E-Tests.
 */
export class TestAuthUtils {
  /**
   * Registriert einen neuen Benutzer
   *
   * @param app NestJS Test-Applikation
   * @param username Benutzername für die Registrierung
   * @returns Response-Objekt mit User-Daten und Tokens
   */
  static async register(app: INestApplication, username: string) {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ username })
      .expect((res) => {
        if (res.status !== 201 && res.status !== 409) {
          throw new Error(`Expected 201 or 409, got ${res.status}`);
        }
      });
  }

  /**
   * Meldet einen Benutzer an
   *
   * @param app NestJS Test-Applikation
   * @param username Benutzername für die Anmeldung
   * @returns Response-Objekt mit User-Daten und Tokens
   */
  static async login(app: INestApplication, username: string) {
    return request(app.getHttpServer()).post('/api/auth/login').send({ username }).expect(200);
  }

  /**
   * Extrahiert Cookies aus der Response
   *
   * @param response Supertest Response-Objekt
   * @returns Objekt mit accessToken und refreshToken Cookies
   */
  static extractCookies(response: request.Response): {
    accessToken?: string;
    refreshToken?: string;
  } {
    const cookies = response.headers['set-cookie'] as unknown as string[];
    const result: { accessToken?: string; refreshToken?: string } = {};

    if (!cookies) {
      return result;
    }

    cookies.forEach((cookie) => {
      if (cookie.startsWith('accessToken=')) {
        result.accessToken = cookie.split(';')[0].split('=')[1];
      } else if (cookie.startsWith('refreshToken=')) {
        result.refreshToken = cookie.split(';')[0].split('=')[1];
      }
    });

    return result;
  }

  /**
   * Erstellt einen authentifizierten Request
   *
   * @param app NestJS Test-Applikation
   * @param accessToken Access-Token für die Authentifizierung
   * @returns Supertest Request-Builder mit gesetzten Cookies
   */
  static authenticatedRequest(app: INestApplication, accessToken: string) {
    return {
      get: (url: string) =>
        request(app.getHttpServer())
          .get(url)
          .set('Cookie', [`accessToken=${accessToken}`]),
      post: (url: string) =>
        request(app.getHttpServer())
          .post(url)
          .set('Cookie', [`accessToken=${accessToken}`]),
      put: (url: string) =>
        request(app.getHttpServer())
          .put(url)
          .set('Cookie', [`accessToken=${accessToken}`]),
      patch: (url: string) =>
        request(app.getHttpServer())
          .patch(url)
          .set('Cookie', [`accessToken=${accessToken}`]),
      delete: (url: string) =>
        request(app.getHttpServer())
          .delete(url)
          .set('Cookie', [`accessToken=${accessToken}`]),
    };
  }

  /**
   * Verifiziert ein JWT-Token
   *
   * @param token JWT-Token zum Verifizieren
   * @param secret Secret für die Verifizierung
   * @returns Decoded Token Payload
   */
  static verifyToken(token: string, secret: string = process.env.JWT_SECRET) {
    return jwt.verify(token, secret);
  }

  /**
   * Dekodiert ein JWT-Token ohne Verifizierung
   *
   * @param token JWT-Token zum Dekodieren
   * @returns Decoded Token Payload
   */
  static decodeToken(token: string) {
    return jwt.decode(token);
  }

  /**
   * Erstellt einen Test-Benutzer und gibt die Auth-Tokens zurück
   *
   * @param app NestJS Test-Applikation
   * @param username Benutzername (optional, default: zufällig)
   * @returns Objekt mit User-Daten und Tokens
   */
  static async createAuthenticatedUser(
    app: INestApplication,
    username: string = `test_user_${Date.now()}`,
  ) {
    const response = await this.register(app, username);

    if (response.status === 409) {
      // Benutzer existiert bereits, versuche Login
      const loginResponse = await this.login(app, username);
      return {
        user: loginResponse.body, // Response body IS the user (UserResponseDto)
        tokens: this.extractCookies(loginResponse),
        response: loginResponse,
      };
    }

    return {
      user: response.body, // Response body IS the user (UserResponseDto)
      tokens: this.extractCookies(response),
      response,
    };
  }

  /**
   * Prüft, ob die Response gültige Auth-Cookies enthält
   *
   * @param response Supertest Response-Objekt
   * @returns True wenn beide Cookies vorhanden sind
   */
  static hasValidAuthCookies(response: request.Response): boolean {
    const cookies = this.extractCookies(response);
    return !!(cookies.accessToken && cookies.refreshToken);
  }

  /**
   * Extrahiert HttpOnly-Flag aus Cookie-Header
   *
   * @param cookieHeader Cookie-Header-String
   * @returns True wenn HttpOnly gesetzt ist
   */
  static isHttpOnlyCookie(cookieHeader: string): boolean {
    return cookieHeader.toLowerCase().includes('httponly');
  }

  /**
   * Prüft Cookie-Security-Einstellungen
   *
   * @param response Supertest Response-Objekt
   * @returns Objekt mit Security-Eigenschaften der Cookies
   */
  static analyzeCookieSecurity(response: request.Response) {
    const cookies = response.headers['set-cookie'] as unknown as string[];
    if (!cookies) {
      return null;
    }

    const result = {
      accessToken: {
        httpOnly: false,
        secure: false,
        sameSite: null as string | null,
      },
      refreshToken: {
        httpOnly: false,
        secure: false,
        sameSite: null as string | null,
      },
    };

    cookies.forEach((cookie) => {
      const isAccessToken = cookie.startsWith('accessToken=');
      const isRefreshToken = cookie.startsWith('refreshToken=');

      if (isAccessToken || isRefreshToken) {
        const target = isAccessToken ? result.accessToken : result.refreshToken;

        if (cookie.toLowerCase().includes('httponly')) {
          target.httpOnly = true;
        }
        if (cookie.toLowerCase().includes('secure')) {
          target.secure = true;
        }

        const sameSiteMatch = cookie.match(/samesite=(\w+)/i);
        if (sameSiteMatch) {
          target.sameSite = sameSiteMatch[1].toLowerCase();
        }
      }
    });

    return result;
  }
}
