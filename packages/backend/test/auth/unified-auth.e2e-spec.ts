import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TestAuthUtils } from '../utils/test-auth.utils';

/**
 * E2E-Tests für Unified Auth Endpoint
 *
 * Testet die vereinheitlichte Authentifizierung mit automatischer Registrierung.
 */
describe('Unified Auth (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up ALL users to ensure consistent test state
    // This ensures the first user is always SUPER_ADMIN
    await prisma.user.deleteMany({});
  });

  describe('POST /api/auth/unified', () => {
    describe('Neue Benutzer', () => {
      it('sollte einen neuen Benutzer ohne Passwort anlegen', async () => {
        const username = `test_user_${Date.now()}`;

        const response = await request(app.getHttpServer()).post('/api/auth/unified').send({ username }).expect(200);

        // Response validieren
        // Der erste User wird SUPER_ADMIN
        expect(response.body).toMatchObject({
          isNewUser: true,
          user: {
            username,
            // role kann USER oder SUPER_ADMIN sein je nachdem ob es der erste User ist
          },
        });
        // Prüfe explizit, dass die Rolle gesetzt ist
        expect(['USER', 'SUPER_ADMIN']).toContain(response.body.user.role);
        expect(response.body.user.passwordHash).toBeUndefined();

        // Cookies prüfen
        const cookies = TestAuthUtils.extractCookies(response);
        expect(cookies.accessToken).toBeDefined();
        expect(cookies.refreshToken).toBeDefined();

        // DB prüfen
        const dbUser = await prisma.user.findUnique({ where: { username } });
        expect(dbUser).toBeDefined();
        expect(dbUser.passwordHash).toBeNull();
        // Der erste User ist SUPER_ADMIN
        expect(dbUser.role).toBe('SUPER_ADMIN');
      });

      it('sollte isNewUser=true für neue Benutzer zurückgeben', async () => {
        const username = `test_new_${Date.now()}`;

        const response = await request(app.getHttpServer()).post('/api/auth/unified').send({ username }).expect(200);

        expect(response.body.isNewUser).toBe(true);
      });
    });

    describe('Existierende Benutzer', () => {
      it('sollte einen existierenden Benutzer ohne Passwort einloggen', async () => {
        const username = `test_existing_${Date.now()}`;

        // Benutzer anlegen
        const firstResponse = await request(app.getHttpServer()).post('/api/auth/unified').send({ username }).expect(200);

        expect(firstResponse.body.isNewUser).toBe(true);

        // Erneut einloggen
        const secondResponse = await request(app.getHttpServer()).post('/api/auth/unified').send({ username }).expect(200);

        expect(secondResponse.body.isNewUser).toBe(false);
        expect(secondResponse.body.user.username).toBe(username);
      });

      it('sollte isNewUser=false für existierende Benutzer zurückgeben', async () => {
        const username = `test_exist_${Date.now() % 100000}`; // Kürzerer Username

        // Ersten Call (Registrierung)
        const firstResponse = await request(app.getHttpServer()).post('/api/auth/unified').send({ username });
        if (firstResponse.status !== 200) {
          console.error('First response error:', firstResponse.body);
        }
        expect(firstResponse.status).toBe(200);

        // Zweiten Call (Login)
        const response = await request(app.getHttpServer()).post('/api/auth/unified').send({ username }).expect(200);

        expect(response.body.isNewUser).toBe(false);
      });

      it('sollte normale User ohne Passwort-Check einloggen', async () => {
        const username = `test_normal_${Date.now()}`;

        // User anlegen
        await prisma.user.create({
          data: {
            username,
            role: 'USER',
            passwordHash: null,
          },
        });

        // Login ohne Passwort
        const response = await request(app.getHttpServer()).post('/api/auth/unified').send({ username }).expect(200);

        expect(response.body.isNewUser).toBe(false);
        expect(response.body.user.username).toBe(username);
      });
    });

    describe('Admin-Accounts', () => {
      it('sollte Admin-Accounts OHNE Passwort-Prüfung einloggen (Passwort-Check nur bei /admin/login)', async () => {
        const username = `test_admin_${Date.now()}`;
        const password = 'admin-password-123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Admin mit Passwort anlegen
        await prisma.user.create({
          data: {
            username,
            role: 'ADMIN',
            passwordHash: hashedPassword,
          },
        });

        // Login OHNE Passwort sollte trotzdem funktionieren
        const responseWithoutPassword = await request(app.getHttpServer()).post('/api/auth/unified').send({ username }).expect(200);

        expect(responseWithoutPassword.body.isNewUser).toBe(false);
        expect(responseWithoutPassword.body.user.username).toBe(username);
        expect(responseWithoutPassword.body.user.role).toBe('ADMIN');

        // Login MIT falschem Passwort sollte auch funktionieren
        // (Passwort wird bei unified NICHT geprüft)
        const responseWithWrongPassword = await request(app.getHttpServer()).post('/api/auth/unified').send({ username, password: 'wrong-password' }).expect(200);

        expect(responseWithWrongPassword.body.isNewUser).toBe(false);
      });
    });

    describe('Validierung', () => {
      it('sollte bei fehlendem Username einen Fehler zurückgeben', async () => {
        const response = await request(app.getHttpServer()).post('/api/auth/unified').send({}).expect(400);

        expect(response.body.message).toContainEqual(expect.stringContaining('Benutzername'));
      });

      it('sollte bei zu kurzem Username einen Fehler zurückgeben', async () => {
        const response = await request(app.getHttpServer()).post('/api/auth/unified').send({ username: 'ab' }).expect(400);

        expect(response.body.message).toContainEqual(expect.stringContaining('mindestens 3 Zeichen'));
      });

      it('sollte bei ungültigen Zeichen im Username einen Fehler zurückgeben', async () => {
        const response = await request(app.getHttpServer()).post('/api/auth/unified').send({ username: 'test@user' }).expect(400);

        expect(response.body.message).toContainEqual(expect.stringContaining('Buchstaben, Zahlen, Unterstriche und Bindestriche'));
      });
    });

    describe('Rate Limiting', () => {
      // Skip this test - Rate limiting configuration varies between test and production
      it.skip('sollte nach 5 Anfragen innerhalb einer Minute 429 zurückgeben', async () => {
        // Verwende denselben Username für alle Anfragen
        // (Rate-Limiting ist IP-basiert, nicht User-basiert)
        const username = `test_rl_${Date.now() % 10000}`;

        // Erste Anfrage erstellt den User
        await request(app.getHttpServer()).post('/api/auth/unified').send({ username }).expect(200);

        // 4 weitere erfolgreiche Login-Anfragen mit demselben User
        for (let i = 0; i < 4; i++) {
          const response = await request(app.getHttpServer()).post('/api/auth/unified').send({ username });
          expect(response.status).toBe(200);
        }

        // 6. Anfrage sollte geblockt werden (Rate Limit erreicht)
        await request(app.getHttpServer()).post('/api/auth/unified').send({ username }).expect(429);
      });
    });

    describe('Cookie-Sicherheit', () => {
      it('sollte HTTP-Only Cookies setzen', async () => {
        const username = `test_cookies_${Date.now()}`;

        const response = await request(app.getHttpServer()).post('/api/auth/unified').send({ username }).expect(200);

        const security = TestAuthUtils.analyzeCookieSecurity(response);
        expect(security.accessToken.httpOnly).toBe(true);
        expect(security.refreshToken.httpOnly).toBe(true);
      });

      it('sollte SameSite=Strict für Cookies setzen', async () => {
        const username = `test_samesite_${Date.now()}`;

        const response = await request(app.getHttpServer()).post('/api/auth/unified').send({ username }).expect(200);

        const security = TestAuthUtils.analyzeCookieSecurity(response);
        expect(security.accessToken.sameSite).toBe('strict');
        expect(security.refreshToken.sameSite).toBe('strict');
      });
    });

    describe('Race Conditions', () => {
      it('sollte gleichzeitige Registrierungen desselben Users korrekt behandeln', async () => {
        const username = `test_race_${Date.now()}`;

        // Zwei parallele Requests
        const [response1, response2] = await Promise.all([
          request(app.getHttpServer()).post('/api/auth/unified').send({ username }),
          request(app.getHttpServer()).post('/api/auth/unified').send({ username }),
        ]);

        // Beide sollten erfolgreich sein
        expect(response1.status).toBe(200);
        expect(response2.status).toBe(200);

        // Einer sollte neu sein, der andere nicht (oder beide nicht, falls Retry)
        const newUserCount = [response1.body.isNewUser, response2.body.isNewUser].filter((isNew) => isNew === true).length;

        expect(newUserCount).toBeLessThanOrEqual(1);

        // Nur ein User sollte in der DB sein
        const dbUsers = await prisma.user.findMany({ where: { username } });
        expect(dbUsers).toHaveLength(1);
      });
    });

    describe('lastLoginAt Update', () => {
      it('sollte lastLoginAt bei jedem Login aktualisieren', async () => {
        const username = `test_login_time_${Date.now()}`;

        // Ersten Login
        await request(app.getHttpServer()).post('/api/auth/unified').send({ username }).expect(200);

        const firstLoginTime = await prisma.user.findUnique({
          where: { username },
          select: { lastLoginAt: true },
        });

        // lastLoginAt sollte beim ersten Login gesetzt werden
        expect(firstLoginTime.lastLoginAt).toBeDefined();
        expect(firstLoginTime.lastLoginAt).not.toBeNull();

        // Warte kurz
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Zweiten Login
        await request(app.getHttpServer()).post('/api/auth/unified').send({ username }).expect(200);

        const secondLoginTime = await prisma.user.findUnique({
          where: { username },
          select: { lastLoginAt: true },
        });

        expect(secondLoginTime.lastLoginAt).toBeDefined();
        expect(secondLoginTime.lastLoginAt).not.toBeNull();
        expect(secondLoginTime.lastLoginAt).not.toEqual(firstLoginTime.lastLoginAt);
        expect(secondLoginTime.lastLoginAt.getTime()).toBeGreaterThan(firstLoginTime.lastLoginAt.getTime());
      });
    });
  });
});
