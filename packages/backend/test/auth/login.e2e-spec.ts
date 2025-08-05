import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { TestAppFactory } from '../utils/test-app.factory';
import { TestDbUtils } from '../utils/test-db.utils';
import { TestAuthUtils } from '../utils/test-auth.utils';

describe('Auth Login Endpoint (e2e)', () => {
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

  describe('POST /api/auth/login', () => {
    describe('Successful Login', () => {
      it('should login an existing user successfully (200)', async () => {
        // Erstelle Testbenutzer
        const username = 'existing_user';
        await TestAuthUtils.register(app, username);

        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ username })
          .expect(200);

        // Prüfe Response Body (Response IS the user directly - UserResponseDto)
        expect(response.body).toMatchObject({
          username,
          role: 'SUPER_ADMIN', // Erster Benutzer ist SUPER_ADMIN
        });
        expect(response.body).toHaveProperty('id');
        expect(response.body).not.toHaveProperty('passwordHash');
        expect(response.body).not.toHaveProperty('accessToken'); // Tokens are now in cookies only
        // lastLoginAt sollte nicht in der Response sein
      });

      it('should set HTTP-only cookies for tokens', async () => {
        const username = 'cookie_login_user';
        await TestAuthUtils.register(app, username);

        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ username })
          .expect(200);

        // Prüfe Set-Cookie Headers
        expect(response.headers).toHaveProperty('set-cookie');
        const cookies = response.headers['set-cookie'] as unknown as string[];
        expect(cookies).toHaveLength(2); // accessToken und refreshToken

        // Prüfe Cookie-Eigenschaften
        const cookieSecurity = TestAuthUtils.analyzeCookieSecurity(response);
        expect(cookieSecurity).not.toBeNull();
        expect(cookieSecurity.accessToken.httpOnly).toBe(true);
        expect(cookieSecurity.refreshToken.httpOnly).toBe(true);
        expect(cookieSecurity.accessToken.sameSite).toBe('lax');
        expect(cookieSecurity.refreshToken.sameSite).toBe('lax');
      });

      it('should return valid JWT tokens', async () => {
        const username = 'jwt_login_user';
        await TestAuthUtils.register(app, username);

        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ username })
          .expect(200);

        // Verifiziere Access Token aus Cookies
        const cookies = TestAuthUtils.extractCookies(response);
        expect(cookies.accessToken).toBeDefined();

        const decoded = TestAuthUtils.decodeToken(cookies.accessToken!) as any;
        expect(decoded).toHaveProperty('sub');
        expect(decoded.sub).toBeTruthy();

        // Verifiziere Token mit Secret
        const verified = TestAuthUtils.verifyToken(cookies.accessToken!);
        expect(verified).toBeDefined();
      });

      it('should update lastLoginAt timestamp', async () => {
        const username = 'timestamp_test_user';
        await TestAuthUtils.register(app, username);

        // Warte kurz, damit Zeitstempel unterschiedlich sind
        await new Promise((resolve) => setTimeout(resolve, 100));

        await request(app.getHttpServer()).post('/api/auth/login').send({ username }).expect(200);

        // Prüfe, ob lastLoginAt aktualisiert wurde
        const user = await TestDbUtils.findUserByUsername(username);
        expect(user?.lastLoginAt).toBeDefined();
        expect(user?.lastLoginAt).toBeInstanceOf(Date);
      });
    });

    describe('Failed Login', () => {
      it('should return 404 for non-existent user', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ username: 'non_existent_user' })
          .expect(404);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('nicht gefunden');
      });

      it('should return 400 for empty username', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ username: '' })
          .expect(400);

        expect(response.body).toHaveProperty('message');
        const message = Array.isArray(response.body.message)
          ? response.body.message[0]
          : response.body.message;
        expect(message).toContain('darf nicht leer sein');
      });

      it('should return 400 for missing username field', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('message');
        const messages = Array.isArray(response.body.message)
          ? response.body.message
          : [response.body.message];
        expect(messages.some((msg) => msg.includes('darf nicht leer sein'))).toBe(true);
      });
    });

    describe('User Roles', () => {
      it('should login SUPER_ADMIN user correctly', async () => {
        // Erster Benutzer ist SUPER_ADMIN
        const username = 'admin_user';
        await TestAuthUtils.register(app, username);

        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ username })
          .expect(200);

        expect(response.body.role).toBe('SUPER_ADMIN');
      });

      it('should login regular USER correctly', async () => {
        // Erstelle SUPER_ADMIN (erster Benutzer)
        await TestAuthUtils.register(app, 'first_admin');

        // Erstelle normalen Benutzer
        const username = 'regular_user';
        await TestAuthUtils.register(app, username);

        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ username })
          .expect(200);

        expect(response.body.role).toBe('USER');
      });
    });

    describe('Multiple Login Attempts', () => {
      it('should handle multiple login attempts from same user', async () => {
        const username = 'multi_login_user';
        await TestAuthUtils.register(app, username);

        // Mehrere Login-Versuche
        for (let i = 0; i < 3; i++) {
          const response = await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({ username })
            .expect(200);

          expect(response.body.username).toBe(username);
          const cookies = TestAuthUtils.extractCookies(response);
          expect(cookies.accessToken).toBeDefined();
        }
      });

      it('should issue valid tokens for each login', async () => {
        const username = 'token_validity_user';
        await TestAuthUtils.register(app, username);

        const tokens: string[] = [];

        // Sammle Tokens von mehreren Logins
        for (let i = 0; i < 3; i++) {
          const response = await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({ username })
            .expect(200);

          const cookies = TestAuthUtils.extractCookies(response);
          tokens.push(cookies.accessToken!);
        }

        // Prüfe, dass alle Tokens gültig sind
        for (const token of tokens) {
          expect(token).toBeDefined();
          const decoded = TestAuthUtils.decodeToken(token!) as any;
          expect(decoded).toHaveProperty('sub');
          expect(decoded.sub).toBeTruthy();

          // Verifiziere Token mit Secret
          const verified = TestAuthUtils.verifyToken(token!);
          expect(verified).toBeDefined();
        }
      });
    });
  });
});
