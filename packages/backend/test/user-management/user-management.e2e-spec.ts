import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import { TestAuthUtils } from '../utils/test-auth.utils';
import { nanoid } from 'nanoid';

describe('UserManagementController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let superAdminId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Configure versioning and global prefix to match main.ts
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

    // Create super admin user with password
    const passwordHash = await bcrypt.hash('SuperSecurePassword123!', 10);
    const superAdmin = await prisma.user.create({
      data: {
        username: 'superadmin',
        role: UserRole.SUPER_ADMIN,
        passwordHash,
      },
    });
    superAdminId = superAdmin.id;

    // First, login as regular user to get JWT token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'superadmin' })
      .expect(200);

    const loginCookies = loginResponse.headers['set-cookie'] as unknown as string[];
    const authToken = loginCookies?.find((cookie) => cookie.startsWith('accessToken='));

    // Then, activate admin rights with password
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/admin/login')
      .set('Cookie', authToken || '')
      .send({
        password: 'SuperSecurePassword123!',
      });

    if (adminLoginResponse.status !== 200) {
      console.error('Admin login failed:', adminLoginResponse.status, adminLoginResponse.body);
    }

    const cookies = adminLoginResponse.headers['set-cookie'] as unknown as string[];
    const adminTokenCookie = cookies.find((cookie) => cookie.startsWith('adminToken='));
    adminCookie = adminTokenCookie ? adminTokenCookie.split(';')[0] : '';
  });

  describe('GET /api/users', () => {
    it('should return all users when authenticated as admin', async () => {
      // Create additional users
      await prisma.user.createMany({
        data: [
          { username: 'user1', role: UserRole.USER },
          { username: 'admin1', role: UserRole.ADMIN },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/users')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body).toContainEqual(
        expect.objectContaining({
          username: 'superadmin',
          role: UserRole.SUPER_ADMIN,
        }),
      );
      expect(response.body).toContainEqual(
        expect.objectContaining({
          username: 'user1',
          role: UserRole.USER,
        }),
      );
      expect(response.body).toContainEqual(
        expect.objectContaining({
          username: 'admin1',
          role: UserRole.ADMIN,
        }),
      );
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer()).get('/api/v-alpha/admin/users').expect(401);
    });

    it('should return 401 when authenticated as regular user', async () => {
      // Create regular user and login
      const passwordHash = await bcrypt.hash('UserPassword123!', 10);
      await prisma.user.create({
        data: {
          username: 'regularuser',
          role: UserRole.USER,
          passwordHash,
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: 'regularuser',
        })
        .expect(200);

      const { accessToken } = TestAuthUtils.extractCookies(loginResponse);
      const userCookie = accessToken ? `accessToken=${accessToken}` : '';

      await request(app.getHttpServer())
        .get('/api/v-alpha/admin/users')
        .set('Cookie', userCookie)
        .expect(401);
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user with default USER role', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v-alpha/admin/users')
        .set('Cookie', adminCookie)
        .send({
          username: 'newuser',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        username: 'newuser',
        role: UserRole.USER,
      });
      expect(response.body).toHaveProperty('id');

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { username: 'newuser' },
      });
      expect(user).toBeTruthy();
      expect(user?.role).toBe(UserRole.USER);
    });

    it('should create a new user with specified role', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v-alpha/admin/users')
        .set('Cookie', adminCookie)
        .send({
          username: 'newadmin',
          role: UserRole.ADMIN,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        username: 'newadmin',
        role: UserRole.ADMIN,
      });
    });

    it('should return 409 when username already exists', async () => {
      // Create user first
      await prisma.user.create({
        data: { username: 'existinguser', role: UserRole.USER },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v-alpha/admin/users')
        .set('Cookie', adminCookie)
        .send({
          username: 'existinguser',
        })
        .expect(409);

      expect(response.body.message).toContain('Benutzername bereits vergeben');
    });

    it('should return 400 for invalid request body', async () => {
      await request(app.getHttpServer())
        .post('/api/v-alpha/admin/users')
        .set('Cookie', adminCookie)
        .send({})
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v-alpha/admin/users')
        .set('Cookie', adminCookie)
        .send({
          username: 'ab', // Too short
        })
        .expect(400);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/v-alpha/admin/users')
        .send({
          username: 'newuser',
        })
        .expect(401);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete a non-admin user successfully', async () => {
      const user = await prisma.user.create({
        data: { username: 'userToDelete', role: UserRole.USER },
      });

      const response = await request(app.getHttpServer())
        .delete(`/api/v-alpha/admin/users/${user.id}`)
        .set('Cookie', adminCookie)
        .expect(200);

      // Check response format
      expect(response.body).toMatchObject({
        id: user.id,
        deleted: true,
      });

      // Verify user was deleted
      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(deletedUser).toBeNull();
    });

    it('should delete an admin user when multiple admins exist', async () => {
      // Create another super admin
      await prisma.user.create({
        data: { username: 'superadmin2', role: UserRole.SUPER_ADMIN },
      });

      // Create admin to delete
      const adminToDelete = await prisma.user.create({
        data: { username: 'adminToDelete', role: UserRole.SUPER_ADMIN },
      });

      await request(app.getHttpServer())
        .delete(`/api/v-alpha/admin/users/${adminToDelete.id}`)
        .set('Cookie', adminCookie)
        .expect(200);

      // Verify admin was deleted
      const deletedAdmin = await prisma.user.findUnique({
        where: { id: adminToDelete.id },
      });
      expect(deletedAdmin).toBeNull();
    });

    it('should return 400 when trying to delete the last super admin', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v-alpha/admin/users/${superAdminId}`)
        .set('Cookie', adminCookie)
        .expect(400);

      expect(response.body.message).toContain('Der letzte SUPER_ADMIN kann nicht gelöscht werden');

      // Verify admin still exists
      const admin = await prisma.user.findUnique({
        where: { id: superAdminId },
      });
      expect(admin).toBeTruthy();
    });

    it('should return 404 when user does not exist', async () => {
      // Use a valid-looking NanoID to pass param validation but miss DB
      const nonExistentId = nanoid();

      await request(app.getHttpServer())
        .delete(`/api/v-alpha/admin/users/${nonExistentId}`)
        .set('Cookie', adminCookie)
        .expect(404);
    });

    it('should return 401 when not authenticated', async () => {
      const user = await prisma.user.create({
        data: { username: 'userToDelete', role: UserRole.USER },
      });

      await request(app.getHttpServer()).delete(`/api/v-alpha/admin/users/${user.id}`).expect(401);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent delete requests properly', async () => {
      const user = await prisma.user.create({
        data: { username: 'concurrentDelete', role: UserRole.USER },
      });

      // Send two delete requests concurrently
      const [response1, response2] = await Promise.all([
        request(app.getHttpServer())
          .delete(`/api/v-alpha/admin/users/${user.id}`)
          .set('Cookie', adminCookie),
        request(app.getHttpServer())
          .delete(`/api/v-alpha/admin/users/${user.id}`)
          .set('Cookie', adminCookie),
      ]);

      // One should succeed, one should fail with 404
      const statuses = [response1.status, response2.status].sort();
      expect(statuses).toEqual([200, 404]);
    });

    it('should maintain transaction integrity when deleting last admin fails', async () => {
      const initialCount = await prisma.user.count();

      await request(app.getHttpServer())
        .delete(`/api/v-alpha/admin/users/${superAdminId}`)
        .set('Cookie', adminCookie)
        .expect(400);

      const finalCount = await prisma.user.count();
      expect(finalCount).toBe(initialCount);
    });
  });
});
