import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { TestAppFactory } from '../utils/test-app.factory';
import { TestDbUtils } from '../utils/test-db.utils';
import { TestAuthUtils } from '../utils/test-auth.utils';

describe('Auth Register Endpoint (e2e)', () => {
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

  describe('POST /api/auth/register', () => {
    describe('Successful Registration', () => {
      it('should register a new user successfully (201)', async () => {
        const username = 'test_user_123';

        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({ username })
          .expect(201);

        // Prüfe Response Body (Response IS the user directly - UserResponseDto)
        expect(response.body).toMatchObject({
          username,
          role: 'SUPER_ADMIN', // Erster Benutzer ist SUPER_ADMIN
        });
        expect(response.body).toHaveProperty('id');
        expect(response.body).not.toHaveProperty('passwordHash');
        expect(response.body).not.toHaveProperty('accessToken'); // Tokens are now in cookies only
      });

      it('should set HTTP-only cookies for tokens', async () => {
        const username = 'cookie_test_user';

        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({ username })
          .expect(201);

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

      it('should set second user as USER role (not admin)', async () => {
        // Erstelle ersten Benutzer (wird SUPER_ADMIN)
        await TestAuthUtils.register(app, 'first_user');

        // Erstelle zweiten Benutzer
        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({ username: 'second_user' })
          .expect(201);

        expect(response.body.role).toBe('USER');
      });

      it('should return valid JWT tokens', async () => {
        const username = 'jwt_test_user';

        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({ username })
          .expect(201);

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
    });

    describe('Username Conflicts', () => {
      it('should return 409 for duplicate username', async () => {
        const username = 'duplicate_user';

        await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({ username })
          .expect(201);

        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({ username })
          .expect(409);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('bereits vergeben');
      });

      it('should handle concurrent registrations correctly', async () => {
        const username = 'concurrent_user';

        const promises = Array(5)
          .fill(null)
          .map(() => request(app.getHttpServer()).post('/api/auth/register').send({ username }));

        const results = await Promise.allSettled(promises);

        const successfulRegistrations = results.filter(
          (r) => r.status === 'fulfilled' && r.value.status === 201,
        );
        const conflicts = results.filter((r) => r.status === 'fulfilled' && r.value.status === 409);

        expect(successfulRegistrations).toHaveLength(1);
        expect(conflicts).toHaveLength(4);
      });
    });
  });
});
