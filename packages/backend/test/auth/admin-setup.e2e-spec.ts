import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { TestAppFactory } from '../utils/test-app.factory';
import { TestDbUtils } from '../utils/test-db.utils';
import { TestAuthUtils } from '../utils/test-auth.utils';

describe('Admin Setup (e2e)', () => {
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

  describe('POST /auth/admin/setup', () => {
    it('should set admin token as HttpOnly cookie with correct properties', async () => {
      // Registriere ersten Benutzer (wird automatisch SUPER_ADMIN)
      const registerResponse = await TestAuthUtils.register(app, 'admin-user');
      const { accessToken } = TestAuthUtils.extractCookies(registerResponse);

      // Admin-Setup durchführen
      const response = await request(app.getHttpServer())
        .post('/api/auth/admin/setup')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          password: 'SecureAdminPassword123!',
        })
        .expect(201);

      // Prüfe Response-Body
      expect(response.body).toHaveProperty('message', 'Admin-Setup erfolgreich durchgeführt');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('admin-user');
      expect(response.body.user.role).toBe('SUPER_ADMIN');
      expect(response.body).toHaveProperty('token');

      // Prüfe Cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const adminTokenCookie = Array.isArray(cookies)
        ? cookies.find((cookie) => cookie.startsWith('adminToken='))
        : (cookies as string).startsWith('adminToken=')
          ? cookies
          : undefined;
      expect(adminTokenCookie).toBeDefined();

      // Prüfe Cookie-Eigenschaften
      expect(adminTokenCookie).toContain('HttpOnly');
      expect(adminTokenCookie).toContain('Max-Age=900'); // 15 Minuten
      expect(adminTokenCookie).toContain('SameSite=Lax');

      // In Test-Umgebung sollte Secure nicht gesetzt sein
      expect(adminTokenCookie).not.toContain('Secure');
    });

    it('should create admin token with role claim and 15 minute expiry', async () => {
      // Registriere ersten Benutzer
      const registerResponse = await TestAuthUtils.register(app, 'admin-user');
      const { accessToken } = TestAuthUtils.extractCookies(registerResponse);
      const user = registerResponse.body.user;

      // Admin-Setup durchführen
      const response = await request(app.getHttpServer())
        .post('/api/auth/admin/setup')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          password: 'SecureAdminPassword123!',
        })
        .expect(201);

      // Extrahiere Token aus Response
      const adminToken = response.body.token;
      expect(adminToken).toBeDefined();

      // Dekodiere Token ohne Verifikation (für Test-Zwecke)
      const decoded = jwt.decode(adminToken) as any;

      // Prüfe Token-Payload
      expect(decoded).toHaveProperty('sub', user.id);
      expect(decoded).toHaveProperty('role', 'SUPER_ADMIN');
      expect(decoded).toHaveProperty('username', 'admin-user');
      expect(decoded).toHaveProperty('exp');
      expect(decoded).toHaveProperty('iat');

      // Prüfe Ablaufzeit (sollte ~15 Minuten sein)
      const expiresIn = decoded.exp - decoded.iat;
      expect(expiresIn).toBe(900); // 15 Minuten = 900 Sekunden
    });

    it('should verify admin token with ADMIN_JWT_SECRET', async () => {
      // Registriere ersten Benutzer
      const registerResponse = await TestAuthUtils.register(app, 'admin-user');
      const { accessToken } = TestAuthUtils.extractCookies(registerResponse);
      const user = registerResponse.body.user;

      // Admin-Setup durchführen
      const response = await request(app.getHttpServer())
        .post('/api/auth/admin/setup')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          password: 'SecureAdminPassword123!',
        })
        .expect(201);

      const adminToken = response.body.token;

      // Verifiziere Token mit ADMIN_JWT_SECRET
      const adminJwtSecret = process.env.ADMIN_JWT_SECRET || 'test-admin-secret';
      const verified = jwt.verify(adminToken, adminJwtSecret) as any;

      expect(verified).toHaveProperty('sub', user.id);
      expect(verified).toHaveProperty('role', 'SUPER_ADMIN');
      expect(verified).toHaveProperty('username', 'admin-user');
    });

    it('should return 409 if admin already exists', async () => {
      // Registriere ersten Admin
      const firstRegisterResponse = await TestAuthUtils.register(app, 'first-admin');
      const { accessToken: firstToken } = TestAuthUtils.extractCookies(firstRegisterResponse);

      await request(app.getHttpServer())
        .post('/api/auth/admin/setup')
        .set('Cookie', [`accessToken=${firstToken}`])
        .send({
          password: 'FirstAdminPassword123!',
        })
        .expect(201);

      // Registriere zweiten Benutzer
      const secondRegisterResponse = await TestAuthUtils.register(app, 'second-user');
      const { accessToken: secondToken } = TestAuthUtils.extractCookies(secondRegisterResponse);

      // Versuche zweites Admin-Setup
      const response = await request(app.getHttpServer())
        .post('/api/auth/admin/setup')
        .set('Cookie', [`accessToken=${secondToken}`])
        .send({
          password: 'SecondPassword123!',
        })
        .expect(409);

      expect(response.body.message).toBe('Nur Admin-Benutzer können diese Funktion nutzen');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/admin/setup')
        .send({
          password: 'TestPassword123!',
        })
        .expect(401);
    });
  });
});
