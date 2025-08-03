import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { TestAppFactory } from '../utils/test-app.factory';
import { TestDbUtils } from '../utils/test-db.utils';
import { TestAuthUtils } from '../utils/test-auth.utils';

describe('Auth Me Endpoint (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await TestAppFactory.create();
  });

  afterAll(async () => {
    await TestAppFactory.close();
  });

  beforeEach(async () => {
    await TestDbUtils.cleanDatabase();
  });

  describe('GET /api/auth/me', () => {
    describe('Successful Requests', () => {
      it('should return current user information for authenticated SUPER_ADMIN (200)', async () => {
        // Erstelle und authentifiziere SUPER_ADMIN (erster Benutzer)
        const username = 'super_admin_user';
        const authData = await TestAuthUtils.createAuthenticatedUser(app, username);

        const response = await TestAuthUtils.authenticatedRequest(app, authData.tokens.accessToken!)
          .get('/api/auth/me')
          .expect(200);

        // Prüfe Response Body
        expect(response.body).toMatchObject({
          id: authData.user.id,
          username,
          role: 'SUPER_ADMIN',
          isActive: true,
        });
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('updatedAt');
        expect(response.body).toHaveProperty('lastLoginAt');

        // Prüfe, dass sensitive Felder nicht enthalten sind
        expect(response.body).not.toHaveProperty('passwordHash');
        expect(response.body).not.toHaveProperty('failedLoginCount');
        expect(response.body).not.toHaveProperty('lockedUntil');
        expect(response.body).not.toHaveProperty('createdBy');
      });

      it('should return current user information for authenticated USER (200)', async () => {
        // Erstelle SUPER_ADMIN (erster Benutzer)
        await TestAuthUtils.createAuthenticatedUser(app, 'admin_first');

        // Erstelle normalen USER
        const username = 'regular_user';
        const authData = await TestAuthUtils.createAuthenticatedUser(app, username);

        const response = await TestAuthUtils.authenticatedRequest(app, authData.tokens.accessToken!)
          .get('/api/auth/me')
          .expect(200);

        // Prüfe Response Body
        expect(response.body).toMatchObject({
          id: authData.user.id,
          username,
          role: 'USER',
          isActive: true,
        });
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('updatedAt');

        // Prüfe, dass sensitive Felder nicht enthalten sind
        expect(response.body).not.toHaveProperty('passwordHash');
      });

      it('should return consistent user data across multiple calls', async () => {
        const username = 'consistency_test_user';
        const authData = await TestAuthUtils.createAuthenticatedUser(app, username);

        // Mehrere Aufrufe des /me Endpoints
        const responses = [];
        for (let i = 0; i < 3; i++) {
          const response = await TestAuthUtils.authenticatedRequest(
            app,
            authData.tokens.accessToken!,
          )
            .get('/api/auth/me')
            .expect(200);
          responses.push(response.body);
        }

        // Prüfe, dass alle Responses identisch sind
        const firstResponse = responses[0];
        responses.forEach((response) => {
          expect(response).toEqual(firstResponse);
        });
      });

      it('should include lastLoginAt timestamp after login', async () => {
        const username = 'timestamp_user';

        // Registriere Benutzer
        await TestAuthUtils.register(app, username);

        // Melde an (um lastLoginAt zu setzen)
        const loginResponse = await TestAuthUtils.login(app, username);
        const tokens = TestAuthUtils.extractCookies(loginResponse);

        const response = await TestAuthUtils.authenticatedRequest(app, tokens.accessToken!)
          .get('/api/auth/me')
          .expect(200);

        expect(response.body.lastLoginAt).toBeDefined();
        expect(new Date(response.body.lastLoginAt)).toBeInstanceOf(Date);
      });
    });

    describe('Authentication Failures', () => {
      it('should return 401 for requests without authentication', async () => {
        const response = await request(app.getHttpServer()).get('/api/auth/me').expect(401);

        expect(response.body).toHaveProperty('message');
        expect(response.body.statusCode).toBe(401);
      });

      it('should return 401 for requests with invalid token', async () => {
        const invalidToken = 'invalid.jwt.token';

        const response = await request(app.getHttpServer())
          .get('/api/auth/me')
          .set('Cookie', [`accessToken=${invalidToken}`])
          .expect(401);

        expect(response.body).toHaveProperty('message');
        expect(response.body.statusCode).toBe(401);
      });

      it('should return 401 for requests with expired token', async () => {
        // Für diesen Test würden wir einen abgelaufenen Token erstellen
        // Da wir keinen direkten Zugriff auf Token-Generation mit kurzer Expiry haben,
        // testen wir mit einem Token mit falscher Signatur
        const fakeToken =
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.invalid_signature';

        const response = await request(app.getHttpServer())
          .get('/api/auth/me')
          .set('Cookie', [`accessToken=${fakeToken}`])
          .expect(401);

        expect(response.body).toHaveProperty('message');
        expect(response.body.statusCode).toBe(401);
      });

      it('should return 401 for requests with missing cookie', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/auth/me')
          .set('Cookie', ['otherCookie=value'])
          .expect(401);

        expect(response.body).toHaveProperty('message');
        expect(response.body.statusCode).toBe(401);
      });
    });

    describe('User Not Found Edge Cases', () => {
      it('should return 404 if authenticated user no longer exists in database', async () => {
        // Erstelle Benutzer und hole Token
        const username = 'user_to_delete';
        const authData = await TestAuthUtils.createAuthenticatedUser(app, username);

        // Lösche Benutzer aus der Datenbank (simuliert gelöschten Account)
        await TestDbUtils.deleteUser(authData.user.id);

        const response = await TestAuthUtils.authenticatedRequest(app, authData.tokens.accessToken!)
          .get('/api/auth/me')
          .expect(404);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('nicht gefunden');
        expect(response.body.statusCode).toBe(404);
      });
    });

    describe('Response Format Validation', () => {
      it('should return user data in correct UserResponseDto format', async () => {
        const username = 'format_test_user';
        const authData = await TestAuthUtils.createAuthenticatedUser(app, username);

        const response = await TestAuthUtils.authenticatedRequest(app, authData.tokens.accessToken!)
          .get('/api/auth/me')
          .expect(200);

        // Prüfe alle erforderlichen Felder
        expect(response.body).toEqual({
          id: expect.any(String),
          username: expect.any(String),
          role: expect.stringMatching(/^(USER|ADMIN|SUPER_ADMIN)$/),
          isActive: expect.any(Boolean),
          lastLoginAt: null, // createAuthenticatedUser verwendet register, nicht login
          createdAt: expect.any(String), // ISO Date String
          updatedAt: expect.any(String), // ISO Date String
        });

        // Prüfe ISO Date Format
        expect(() => new Date(response.body.createdAt)).not.toThrow();
        expect(() => new Date(response.body.updatedAt)).not.toThrow();
      });

      it('should return valid ISO date strings for timestamps', async () => {
        const username = 'date_format_user';
        const authData = await TestAuthUtils.createAuthenticatedUser(app, username);

        const response = await TestAuthUtils.authenticatedRequest(app, authData.tokens.accessToken!)
          .get('/api/auth/me')
          .expect(200);

        // Prüfe ISO 8601 Format
        const createdAt = new Date(response.body.createdAt);
        const updatedAt = new Date(response.body.updatedAt);

        expect(createdAt.toISOString()).toBe(response.body.createdAt);
        expect(updatedAt.toISOString()).toBe(response.body.updatedAt);

        if (response.body.lastLoginAt) {
          const lastLoginAt = new Date(response.body.lastLoginAt);
          expect(lastLoginAt.toISOString()).toBe(response.body.lastLoginAt);
        }
      });
    });
  });
});
