import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { TestAuthUtils } from '../utils/test-auth.utils';

describe('AuthController (e2e) - Admin Login', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let _adminCookie: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Configure app to match main.ts
    app.enableVersioning({
      type: VersioningType.URI,
      prefix: 'v-',
      defaultVersion: 'alpha',
    });

    app.setGlobalPrefix('api', {
      exclude: ['/'],
    });

    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database
    await prisma.user.deleteMany();
  });

  describe('POST /auth/admin/login - Success Cases', () => {
    it('should login admin user with valid credentials and return admin cookie', async () => {
      // Create admin user with password
      const passwordHash = await bcrypt.hash('SecureAdminPassword123!', 10);
      const admin = await prisma.user.create({
        data: {
          username: 'admin',
          role: UserRole.SUPER_ADMIN,
          passwordHash,
        },
      });

      // First, login as regular user to get JWT token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/unified')
        .send({ username: 'admin' })
        .expect(200);

      const loginCookies = loginResponse.headers['set-cookie'] as unknown as string[];
      expect(loginCookies).toBeDefined();
      expect(loginCookies.length).toBeGreaterThan(0);

      const { accessToken } = TestAuthUtils.extractCookies(loginResponse);
      expect(accessToken).toBeDefined();
      const authToken = `accessToken=${accessToken}`;

      // Then, activate admin rights with password
      const response = await request(app.getHttpServer())
        .post('/api/auth/admin/login')
        .set('Cookie', authToken || '')
        .send({
          password: 'SecureAdminPassword123!',
        })
        .expect(200);

      // Check response body
      expect(response.body).toEqual({
        user: {
          id: admin.id,
          username: 'admin',
          role: 'SUPER_ADMIN',
        },
      });

      // Check admin cookie
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.length).toBeGreaterThan(0);

      const adminTokenCookie = cookies.find((cookie) => cookie.startsWith('adminToken='));
      expect(adminTokenCookie).toBeDefined();
      expect(adminTokenCookie).toContain('HttpOnly');
      expect(adminTokenCookie).toContain('Max-Age=900'); // 15 minutes = 900 seconds

      // Store cookie for later use
      _adminCookie = cookies[0];
    });

    it('should update lastLoginAt on successful login', async () => {
      // Create admin user with password
      const passwordHash = await bcrypt.hash('SecureAdminPassword123!', 10);
      const admin = await prisma.user.create({
        data: {
          username: 'admin',
          role: UserRole.SUPER_ADMIN,
          passwordHash,
        },
      });

      const originalLastLogin = admin.lastLoginAt;

      // First, login as regular user to get JWT token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/unified')
        .send({ username: 'admin' })
        .expect(200);

      const { accessToken } = TestAuthUtils.extractCookies(loginResponse);
      expect(accessToken).toBeDefined();
      const authToken = `accessToken=${accessToken}`;

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      await request(app.getHttpServer())
        .post('/api/auth/admin/login')
        .set('Cookie', authToken || '')
        .send({
          password: 'SecureAdminPassword123!',
        })
        .expect(200);

      // Check lastLoginAt was updated
      const updatedAdmin = await prisma.user.findUnique({
        where: { id: admin.id },
      });

      expect(updatedAdmin?.lastLoginAt).toBeDefined();
      expect(updatedAdmin?.lastLoginAt?.getTime()).toBeGreaterThan(
        originalLastLogin?.getTime() || 0,
      );
    });
  });

  describe('POST /auth/admin/login - Error Cases', () => {
    it('should return 401 with wrong password', async () => {
      // Create admin user with password
      const passwordHash = await bcrypt.hash('SecureAdminPassword123!', 10);
      await prisma.user.create({
        data: {
          username: 'admin',
          role: UserRole.SUPER_ADMIN,
          passwordHash,
        },
      });

      // First, login as regular user to get JWT token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/unified')
        .send({ username: 'admin' })
        .expect(200);

      const { accessToken } = TestAuthUtils.extractCookies(loginResponse);
      expect(accessToken).toBeDefined();
      const authToken = `accessToken=${accessToken}`;

      const response = await request(app.getHttpServer())
        .post('/api/auth/admin/login')
        .set('Cookie', authToken || '')
        .send({
          password: 'WrongPassword',
        })
        .expect(401);

      expect(response.body.message).toEqual('Ungültige Admin-Zugangsdaten');

      // Check no admin cookie is set
      const cookies = response.headers['set-cookie'] as unknown as string[];
      if (cookies) {
        const adminTokenCookie = cookies.find((cookie) => cookie.startsWith('adminToken='));
        expect(adminTokenCookie).toBeUndefined();
      }
    });

    it('should return 403 for non-admin user', async () => {
      // Create regular user with password
      const passwordHash = await bcrypt.hash('UserPassword123!', 10);
      await prisma.user.create({
        data: {
          username: 'regularuser',
          role: UserRole.USER,
          passwordHash,
        },
      });

      // First, login as regular user to get JWT token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/unified')
        .send({ username: 'regularuser' })
        .expect(200);

      const { accessToken } = TestAuthUtils.extractCookies(loginResponse);
      expect(accessToken).toBeDefined();
      const authToken = `accessToken=${accessToken}`;

      const response = await request(app.getHttpServer())
        .post('/api/auth/admin/login')
        .set('Cookie', authToken || '')
        .send({
          password: 'UserPassword123!',
        })
        .expect(401);

      expect(response.body.message).toEqual('Keine Admin-Berechtigung');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/admin/login')
        .send({
          password: 'SomePassword123!',
        })
        .expect(401);

      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should return 401 for admin without password', async () => {
      // Create admin user without password
      await prisma.user.create({
        data: {
          username: 'admin',
          role: UserRole.SUPER_ADMIN,
          passwordHash: null,
        },
      });

      // First, login as regular user to get JWT token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/unified')
        .send({ username: 'admin' })
        .expect(200);

      const { accessToken } = TestAuthUtils.extractCookies(loginResponse);
      expect(accessToken).toBeDefined();
      const authToken = `accessToken=${accessToken}`;

      const response = await request(app.getHttpServer())
        .post('/api/auth/admin/login')
        .set('Cookie', authToken || '')
        .send({
          password: 'SomePassword123!',
        })
        .expect(401);

      expect(response.body.message).toEqual('Admin-Account nicht korrekt konfiguriert');
    });
  });

  describe('POST /auth/admin/login - Validation', () => {
    it('should validate required fields', async () => {
      // Create admin user for authentication
      await prisma.user.create({
        data: {
          username: 'admin',
          role: UserRole.SUPER_ADMIN,
          passwordHash: await bcrypt.hash('AdminPassword123!', 10),
        },
      });

      // First, login to get JWT token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/unified')
        .send({ username: 'admin' })
        .expect(200);

      const { accessToken } = TestAuthUtils.extractCookies(loginResponse);
      expect(accessToken).toBeDefined();
      const authToken = `accessToken=${accessToken}`;

      // Missing password
      await request(app.getHttpServer())
        .post('/api/auth/admin/login')
        .set('Cookie', authToken || '')
        .send({})
        .expect(400);
    });

    it('should validate field constraints', async () => {
      // Create admin user for authentication
      await prisma.user.create({
        data: {
          username: 'admin',
          role: UserRole.SUPER_ADMIN,
          passwordHash: await bcrypt.hash('AdminPassword123!', 10),
        },
      });

      // First, login to get JWT token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/unified')
        .send({ username: 'admin' })
        .expect(200);

      const { accessToken } = TestAuthUtils.extractCookies(loginResponse);
      expect(accessToken).toBeDefined();
      const authToken = `accessToken=${accessToken}`;

      // Password too short
      const response = await request(app.getHttpServer())
        .post('/api/auth/admin/login')
        .set('Cookie', authToken || '')
        .send({
          password: 'short',
        })
        .expect(400);

      expect(response.body.message).toContain('Das Passwort muss mindestens 8 Zeichen lang sein');
    });
  });
});
