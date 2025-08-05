import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import * as cookieParser from 'cookie-parser';

describe('AuthController (e2e) - Admin Verify', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let validAdminToken: string;
  let expiredAdminToken: string;
  let testAdminUser: any;
  const adminSecret = process.env.ADMIN_JWT_SECRET || 'test-admin-secret';

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
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean database
    await prisma.user.deleteMany();

    // Erstelle Test-Admin-Benutzer in der Datenbank
    testAdminUser = await prisma.user.create({
      data: {
        username: 'testadmin',
        role: 'SUPER_ADMIN',
        passwordHash: 'test-hash',
      },
    });

    // Erstelle gültiges Admin-Token
    validAdminToken = jwt.sign(
      {
        sub: testAdminUser.id,
        username: testAdminUser.username,
        role: testAdminUser.role,
      },
      adminSecret,
      { expiresIn: '15m' },
    );

    // Erstelle abgelaufenes Admin-Token
    expiredAdminToken = jwt.sign(
      {
        sub: testAdminUser.id,
        username: testAdminUser.username,
        role: testAdminUser.role,
      },
      adminSecret,
      { expiresIn: '-1h' }, // Bereits abgelaufen
    );
  });

  describe('GET /auth/admin/verify', () => {
    it('sollte 200 zurückgeben, wenn ein gültiges Admin-Token bereitgestellt wird', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/admin/verify')
        .set('Cookie', `adminToken=${validAdminToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({ ok: true });
    });

    it('sollte 401 zurückgeben, wenn kein Token bereitgestellt wird', async () => {
      await request(app.getHttpServer()).get('/auth/admin/verify').expect(HttpStatus.UNAUTHORIZED);
    });

    it('sollte 401 zurückgeben, wenn ein abgelaufenes Token bereitgestellt wird', async () => {
      await request(app.getHttpServer())
        .get('/auth/admin/verify')
        .set('Cookie', `adminToken=${expiredAdminToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('sollte 401 zurückgeben, wenn ein ungültiges Token bereitgestellt wird', async () => {
      const invalidToken = 'invalid.token.here';

      await request(app.getHttpServer())
        .get('/auth/admin/verify')
        .set('Cookie', `adminToken=${invalidToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('sollte 401 zurückgeben, wenn ein Token ohne Admin-Rolle bereitgestellt wird', async () => {
      const nonAdminToken = jwt.sign(
        {
          sub: 'test-user-id',
          username: 'testuser',
          role: 'USER', // Kein Admin
        },
        adminSecret,
        { expiresIn: '15m' },
      );

      await request(app.getHttpServer())
        .get('/auth/admin/verify')
        .set('Cookie', `adminToken=${nonAdminToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('sollte 401 zurückgeben, wenn ein Token mit falschem Secret signiert wurde', async () => {
      const wrongSecretToken = jwt.sign(
        {
          sub: 'test-admin-id',
          username: 'testadmin',
          role: 'SUPER_ADMIN',
        },
        'wrong-secret', // Falsches Secret
        { expiresIn: '15m' },
      );

      await request(app.getHttpServer())
        .get('/auth/admin/verify')
        .set('Cookie', `adminToken=${wrongSecretToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
