import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';

describe('AuthController (e2e) - Admin Login', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let _adminCookie: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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
        .post('/auth/login')
        .send({ username: 'admin' })
        .expect(200);

      const loginCookies = loginResponse.headers['set-cookie'] as unknown as string[];
      expect(loginCookies).toBeDefined();
      expect(loginCookies.length).toBeGreaterThan(0);

      const authToken = loginCookies?.find((cookie) => cookie.startsWith('accessToken='));
      expect(authToken).toBeDefined();

      // Then, activate admin rights with password
      const response = await request(app.getHttpServer())
        .post('/auth/admin/login')
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
        .post('/auth/login')
        .send({ username: 'admin' })
        .expect(200);

      const authCookie = loginResponse.headers['set-cookie'] as unknown as string[];
      const authToken = authCookie?.find((cookie) => cookie.startsWith('accessToken='));

      expect(authToken).toBeDefined();

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      await request(app.getHttpServer())
        .post('/auth/admin/login')
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
        .post('/auth/login')
        .send({ username: 'admin' })
        .expect(200);

      const authCookie = loginResponse.headers['set-cookie'] as unknown as string[];
      const authToken = authCookie?.find((cookie) => cookie.startsWith('accessToken='));

      expect(authToken).toBeDefined();

      const response = await request(app.getHttpServer())
        .post('/auth/admin/login')
        .set('Cookie', authToken || '')
        .send({
          password: 'WrongPassword',
        })
        .expect(401);

      expect(response.body.message).toEqual('Ungültiges Passwort');

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
        .post('/auth/login')
        .send({ username: 'regularuser' })
        .expect(200);

      const authCookie = loginResponse.headers['set-cookie'] as unknown as string[];
      const authToken = authCookie?.find((cookie) => cookie.startsWith('accessToken='));

      expect(authToken).toBeDefined();

      const response = await request(app.getHttpServer())
        .post('/auth/admin/login')
        .set('Cookie', authToken || '')
        .send({
          password: 'UserPassword123!',
        })
        .expect(403);

      expect(response.body.message).toEqual('Benutzer hat keine Admin-Rechte');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/admin/login')
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
        .post('/auth/login')
        .send({ username: 'admin' })
        .expect(200);

      const authCookie = loginResponse.headers['set-cookie'] as unknown as string[];
      const authToken = authCookie?.find((cookie) => cookie.startsWith('accessToken='));

      expect(authToken).toBeDefined();

      const response = await request(app.getHttpServer())
        .post('/auth/admin/login')
        .set('Cookie', authToken || '')
        .send({
          password: 'SomePassword123!',
        })
        .expect(401);

      expect(response.body.message).toEqual('Ungültiges Passwort');
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
        .post('/auth/login')
        .send({ username: 'admin' })
        .expect(200);

      const authCookie = loginResponse.headers['set-cookie'] as unknown as string[];
      const authToken = authCookie?.find((cookie) => cookie.startsWith('accessToken='));

      expect(authToken).toBeDefined();

      // Missing password
      await request(app.getHttpServer())
        .post('/auth/admin/login')
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
        .post('/auth/login')
        .send({ username: 'admin' })
        .expect(200);

      const authCookie = loginResponse.headers['set-cookie'] as unknown as string[];
      const authToken = authCookie?.find((cookie) => cookie.startsWith('accessToken='));

      expect(authToken).toBeDefined();

      // Password too short
      const response = await request(app.getHttpServer())
        .post('/auth/admin/login')
        .set('Cookie', authToken || '')
        .send({
          password: 'short',
        })
        .expect(400);

      expect(response.body.message).toContain('Das Passwort muss mindestens 8 Zeichen lang sein');
    });
  });
});
