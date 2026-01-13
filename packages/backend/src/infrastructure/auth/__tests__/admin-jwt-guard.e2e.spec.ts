import type { INestApplication } from '@nestjs/common';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../../../app.module';
import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import * as bcryptLib from 'bcrypt';
import { skipIfNoDatabase } from '@infrastructure/__tests__/helpers/database-test.helper';
import { BCRYPT_COST_FACTOR_PASSWORD, BCRYPT_COST_FACTOR_TOKEN } from '@infrastructure/config/security.constants';

/**
 * AdminJwtAuthGuard HTTP Integration Tests.
 *
 * Testet die HTTP-Schnittstelle der Admin-Endpoints mit AdminJwtAuthGuard:
 * - 401 Unauthorized ohne accessToken/adminToken
 * - 403 Forbidden mit USER-Rolle
 * - 200 Success mit ADMIN-Rolle
 * - 200 Success mit SUPER_ADMIN-Rolle
 *
 * @remarks
 * Diese Tests validieren das 3-Token-Architektur-Verhalten:
 * - accessToken (regulärer User-Token) + adminToken (Admin-Token) erforderlich
 * - AdminJwtAuthGuard prüft beide Tokens
 * - Rollenbasierte Zugriffskontrolle (USER vs. ADMIN vs. SUPER_ADMIN)
 *
 * **Test-Strategie:**
 * - Real PostgreSQL Database (NICHT mocked)
 * - Bootstrap der vollständigen NestJS-Anwendung
 * - HTTP Requests via supertest
 * - User-Management Controller als Beispiel-Admin-Endpoint
 */
describe('AdminJwtAuthGuard HTTP Integration Tests (AC5.3)', () => {
  let databaseAvailable = false;
  let app: INestApplication;
  let prisma: PrismaClient;
  let testRunId: number;

  // Test-Secrets für CI-Umgebung (werden in beforeAll gesetzt wenn nicht vorhanden)
  const TEST_JWT_SECRET = 'test-jwt-secret-for-e2e-tests';
  const TEST_ADMIN_JWT_SECRET = 'test-admin-jwt-secret-for-e2e-tests';

  // Test-User Daten (werden in beforeAll gesetzt, wiederverwendbar für alle Tests)
  let testUserRegular: { id: string; username: string; role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' };
  let testUserAdmin: { id: string; username: string; role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' };
  let testUserSuperAdmin: { id: string; username: string; role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' };

  // Gecachte Tokens (werden in beforeAll einmal generiert, wiederverwendbar für alle Tests)
  let cachedAccessTokenRegular: string;
  let cachedAdminTokenRegular: string;
  let cachedAccessTokenAdmin: string;
  let cachedAdminTokenAdmin: string;
  let cachedAccessTokenSuperAdmin: string;
  let cachedAdminTokenSuperAdmin: string;
  /** Server Access Token fuer X-Server-Access-Token Header (SetupPendingGuard) */
  let serverAccessToken: string;
  /** Server Access Token ID (fuer Cleanup) */
  let serverAccessTokenId: string;

  /**
   * Generiert ein gültiges Access-Token (regulärer JWT)
   *
   * Verwendet die JWT_SECRET aus der Umgebung oder Test-Fallback.
   * WICHTIG: Muss das gleiche Secret wie die Strategy verwenden.
   */
  const generateAccessToken = (userId: string, username: string, role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'): string => {
    return jwt.sign(
      {
        sub: userId,
        username,
        role,
      },
      process.env.JWT_SECRET || TEST_JWT_SECRET,
      { expiresIn: '15m' },
    );
  };

  /**
   * Generiert ein gültiges Admin-Token
   *
   * Verwendet die ADMIN_JWT_SECRET aus der Umgebung oder Test-Fallback.
   * WICHTIG: Muss das gleiche Secret wie die AdminJwtStrategy verwenden.
   * Setzt isAdmin=true für neue Token-Format-Validierung.
   */
  const generateAdminToken = (userId: string, username: string, role: 'ADMIN' | 'SUPER_ADMIN' | 'USER'): string => {
    return jwt.sign(
      {
        sub: userId,
        username,
        role,
        isAdmin: role !== 'USER', // isAdmin Feld für neue Token-Format-Validierung
      },
      process.env.ADMIN_JWT_SECRET || TEST_ADMIN_JWT_SECRET,
      { expiresIn: '15m' },
    );
  };

  /**
   * Generiert eine Test-ID im CUID2-Format
   */
  const generateTestId = (): string => {
    return createId();
  };

  beforeAll(async () => {
    // CR-3 Fix: Prüfe DB-Verfügbarkeit mit skipIfNoDatabase() statt nur !!DATABASE_URL
    databaseAvailable = await skipIfNoDatabase();
    if (!databaseAvailable) {
      return; // Skip all tests if DB not available
    }

    // Setze Test-Secrets für CI-Umgebung wenn nicht vorhanden
    // Notwendig damit AdminJwtStrategy und JwtStrategy initialisiert werden können
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = TEST_JWT_SECRET;
    }
    if (!process.env.ADMIN_JWT_SECRET) {
      process.env.ADMIN_JWT_SECRET = TEST_ADMIN_JWT_SECRET;
    }

    // Prisma Client für User Setup
    prisma = new PrismaClient();
    await prisma.$connect();

    // Bootstrap der vollständigen NestJS-Anwendung
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // App-Konfiguration wie in main.ts
    app.enableVersioning({
      type: VersioningType.URI,
      prefix: 'v-',
      defaultVersion: 'alpha',
    });
    app.setGlobalPrefix('api', { exclude: ['/'] });
    app.use(cookieParser());

    // Enable validation pipes globally (wie in main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    // Cleanup alte Test-Users und User mit ungültigen Daten vor Test-Suite
    // (Triggers deaktivieren für DELETE)
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      // Cleanup alte Test-Users
      await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE username LIKE 'test_admin_guard_%'`);

      // Cleanup User mit ungültigen Benutzernamen die das Username Value Object nicht akzeptiert
      // Username Value Object erlaubt nur: [a-zA-Z0-9_]{3,50}
      // Lösche User mit ungültigen Zeichen (Punkte, Bindestriche, etc.) oder falscher Länge
      await prisma.$executeRawUnsafe(`
        DELETE FROM "User"
        WHERE username ~ '[^a-zA-Z0-9_]'
           OR length(username) < 3
           OR length(username) > 50
      `);

      // Cleanup User mit ungültigen IDs die kein CUID-Format haben
      // CUID Format: 25 Zeichen, beginnt mit 'c', nur Kleinbuchstaben und Zahlen
      // z.B. User mit ID="SYSTEM" brechen das UserId Value Object
      await prisma.$executeRawUnsafe(`
        DELETE FROM "User"
        WHERE length(id) != 25
           OR id !~ '^[a-z0-9]+$'
      `);
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }

    // Erstelle Test-Users EINMAL für alle Tests
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('password', BCRYPT_COST_FACTOR_PASSWORD);

    testRunId = Date.now();

    // User mit USER Rolle
    const userRegular = await prisma.user.create({
      data: {
        id: generateTestId(),
        username: `test_admin_guard_user_${testRunId}`,
        passwordHash,
        role: 'USER',
        isActive: true,
      },
    });
    testUserRegular = {
      id: userRegular.id,
      username: userRegular.username,
      role: userRegular.role,
    };

    // User mit ADMIN Rolle
    const userAdmin = await prisma.user.create({
      data: {
        id: generateTestId(),
        username: `test_admin_guard_admin_${testRunId}`,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });
    testUserAdmin = {
      id: userAdmin.id,
      username: userAdmin.username,
      role: userAdmin.role,
    };

    // User mit SUPER_ADMIN Rolle
    const userSuperAdmin = await prisma.user.create({
      data: {
        id: generateTestId(),
        username: `test_admin_guard_super_${testRunId}`,
        passwordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
    testUserSuperAdmin = {
      id: userSuperAdmin.id,
      username: userSuperAdmin.username,
      role: userSuperAdmin.role,
    };

    // Token-Generation EINMAL für alle Tests (Performance-Optimierung)
    cachedAccessTokenRegular = generateAccessToken(testUserRegular.id, testUserRegular.username, testUserRegular.role);
    cachedAdminTokenRegular = generateAdminToken(testUserRegular.id, testUserRegular.username, testUserRegular.role);

    cachedAccessTokenAdmin = generateAccessToken(testUserAdmin.id, testUserAdmin.username, testUserAdmin.role);
    cachedAdminTokenAdmin = generateAdminToken(testUserAdmin.id, testUserAdmin.username, testUserAdmin.role);

    cachedAccessTokenSuperAdmin = generateAccessToken(testUserSuperAdmin.id, testUserSuperAdmin.username, testUserSuperAdmin.role);
    cachedAdminTokenSuperAdmin = generateAdminToken(testUserSuperAdmin.id, testUserSuperAdmin.username, testUserSuperAdmin.role);

    // ServerAccessToken erstellen (erforderlich fuer SetupPendingGuard)
    // Der Guard prueft: hasAdmin && hasActiveToken
    serverAccessTokenId = `blh_${createId()}`;
    serverAccessToken = `blh_test_${createId()}`;
    const tokenHash = await bcryptLib.hash(serverAccessToken, BCRYPT_COST_FACTOR_TOKEN);
    await prisma.serverAccessToken.create({
      data: {
        id: serverAccessTokenId,
        tokenHash,
        name: `test_admin_guard_token_${testRunId}`,
        isRevoked: false,
      },
    });
  }, 60000);

  beforeEach(() => {
    // CR-3 Fix: Skip Tests wenn DB nicht verfügbar
    if (!databaseAvailable) {
      return;
    }

    // Mock-Resets vor jedem Test
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (!databaseAvailable) return; // Skip cleanup if DB not available

    // Cleanup Test-Users und ServerAccessToken nach Test-Suite (Triggers deaktivieren für DELETE)
    try {
      await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
      await prisma.$executeRawUnsafe(`DELETE FROM "server_access_tokens" WHERE name LIKE 'test_admin_guard_%'`);
      await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE username LIKE 'test_admin_guard_%'`);
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    } catch {
      // Ignore cleanup errors
    }

    // Close connections in correct order (App first, dann Prisma)
    try {
      await app?.close();
    } catch {
      // Ignore app close errors
    }

    try {
      await prisma?.$disconnect();
    } catch {
      // Ignore prisma disconnect errors
    }
  });

  describe('POST /api/v-alpha/admin/users - 401 Unauthorized Tests', () => {
    /**
     * Testet 401 bei fehlendem accessToken UND adminToken.
     *
     * @remarks
     * AdminJwtAuthGuard erwartet BEIDE Tokens:
     * - accessToken (regulärer User-Token)
     * - adminToken (Admin-Token)
     *
     * Ohne beide Tokens muss 401 Unauthorized zurückgegeben werden.
     */
    it('should return 401 without accessToken and adminToken', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v-alpha/admin/users')
        .set('X-Server-Access-Token', serverAccessToken)
        .send({
          username: 'newuser',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body.message).toContain('Unauthorized');
    });

    /**
     * Testet 401 bei fehlendem adminToken (aber vorhandenem accessToken).
     *
     * @remarks
     * AdminJwtAuthGuard prüft zuerst adminToken, dann accessToken.
     * Wenn adminToken fehlt, schlägt die Guard-Validierung fehl.
     */
    it('should return 401 with accessToken but without adminToken', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v-alpha/admin/users')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`])
        .send({
          username: 'newuser',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    /**
     * Testet 401 bei fehlendem accessToken (aber vorhandenem adminToken).
     *
     * @remarks
     * AdminJwtStrategy prüft in validate() explizit ob accessToken vorhanden ist.
     * Wenn accessToken fehlt, wird UnauthorizedException geworfen.
     */
    it('should return 401 with adminToken but without accessToken', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v-alpha/admin/users')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`adminToken=${cachedAdminTokenAdmin}`])
        .send({
          username: 'newuser',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body.message).toContain('Unauthorized');
    });

    /**
     * Testet 401 bei ungültigem adminToken (falsche Signatur).
     *
     * @remarks
     * AdminJwtStrategy validiert adminToken mit ADMIN_JWT_SECRET.
     * Bei ungültiger Signatur wird UnauthorizedException geworfen.
     */
    it('should return 401 with invalid adminToken', async () => {
      const invalidAdminToken = 'invalid.jwt.token';

      const response = await request(app.getHttpServer())
        .post('/api/v-alpha/admin/users')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${invalidAdminToken}`])
        .send({
          username: 'newuser',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    /**
     * Testet 401 bei abgelaufenem adminToken.
     *
     * @remarks
     * AdminToken haben eine Ablaufzeit (15min im Produktionscode).
     * Abgelaufene Tokens müssen mit 401 abgelehnt werden.
     */
    it('should return 401 with expired adminToken', async () => {
      // Expired adminToken (exp in der Vergangenheit)
      const expiredAdminToken = jwt.sign(
        {
          sub: testUserAdmin.id,
          username: testUserAdmin.username,
          role: testUserAdmin.role,
          isAdmin: true,
        },
        process.env.ADMIN_JWT_SECRET || TEST_ADMIN_JWT_SECRET,
        { expiresIn: '-1h' }, // Abgelaufen vor 1 Stunde
      );

      const response = await request(app.getHttpServer())
        .post('/api/v-alpha/admin/users')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${expiredAdminToken}`])
        .send({
          username: 'newuser',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });
  });

  describe('POST /api/v-alpha/admin/users - 403 Forbidden Tests', () => {
    /**
     * Testet 403 bei USER-Rolle (nicht Admin).
     *
     * @remarks
     * AdminJwtStrategy prüft in validate() ob isAdmin=true gesetzt ist
     * oder ob die Rolle ADMIN/SUPER_ADMIN ist. USER-Rolle wird explizit
     * mit ForbiddenException abgelehnt, was als 403 behandelt wird.
     *
     * **WICHTIG:** Die aktuelle Implementierung wirft ForbiddenException
     * (-> 403), nicht UnauthorizedException (-> 401). Das ist semantisch korrekter,
     * da der USER authentifiziert ist, aber keine Admin-Rechte hat (kein isAdmin=true).
     */
    it('should return 403 when USER accesses admin endpoint (AC6)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v-alpha/admin/users')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenRegular}`, `adminToken=${cachedAdminTokenRegular}`])
        .send({
          username: 'newuser',
        });

      // AdminJwtStrategy wirft ForbiddenException → 403
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('statusCode', 403);
      expect(response.body.message).toContain('admin token');
    });
  });

  describe('POST /api/v-alpha/admin/users - 200/201 Success Tests', () => {
    /**
     * Testet erfolgreichen Zugriff mit ADMIN-Rolle.
     *
     * @remarks
     * ADMIN-Rolle hat isAdmin=true und darf auf Admin-Endpoints zugreifen.
     * UserManagementController.create() gibt 201 Created zurück.
     */
    it('should return 201 when ADMIN creates user', async () => {
      const newUsername = `tcreate_${testRunId}`;
      const response = await request(app.getHttpServer())
        .post('/api/v-alpha/admin/users')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .send({
          username: newUsername,
        })
        .expect(201);

      // Response wrapped in { data: {...}, meta: {...} }
      const user = response.body.data || response.body;
      expect(user).toHaveProperty('id');
      expect(user.username).toBe(newUsername);

      // Cleanup created user (Triggers deaktivieren für DELETE)
      await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
      try {
        await prisma.user.delete({
          where: { username: newUsername },
        });
      } finally {
        await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
      }
    });

    /**
     * Testet erfolgreichen Zugriff mit SUPER_ADMIN-Rolle.
     *
     * @remarks
     * SUPER_ADMIN-Rolle hat isAdmin=true und darf auf Admin-Endpoints zugreifen.
     * SUPER_ADMIN hat die höchsten Berechtigungen im System.
     */
    it('should return 201 when SUPER_ADMIN creates user', async () => {
      const newUsername = `tsuper_${testRunId}`;
      const response = await request(app.getHttpServer())
        .post('/api/v-alpha/admin/users')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenSuperAdmin}`, `adminToken=${cachedAdminTokenSuperAdmin}`])
        .send({
          username: newUsername,
        })
        .expect(201);

      // Response wrapped in { data: {...}, meta: {...} }
      const user = response.body.data || response.body;
      expect(user).toHaveProperty('id');
      expect(user.username).toBe(newUsername);

      // Cleanup created user (Triggers deaktivieren für DELETE)
      await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
      try {
        await prisma.user.delete({
          where: { username: newUsername },
        });
      } finally {
        await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
      }
    });

    /**
     * Testet GET Request mit ADMIN-Rolle (Liste aller User).
     *
     * @remarks
     * UserManagementController.findAll() gibt 200 OK mit User-Liste zurück.
     */
    it('should return 200 when ADMIN lists users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/users')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(200);

      // NestJS wrapped Array in einem Object mit "data" property
      // (durch OpenAPI Response DTOs)
      const users = Array.isArray(response.body) ? response.body : response.body.data;
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0); // Mind. 3 Test-Users vorhanden
    });
  });

  describe('Token Validation Edge Cases', () => {
    /**
     * Testet 401 wenn User in adminToken nicht mehr existiert.
     *
     * @remarks
     * AdminJwtStrategy prüft in validate() ob User noch in DB existiert.
     * Bei gelöschtem User wird UnauthorizedException geworfen.
     *
     * **HINWEIS:** Die JwtStrategy vom regulären accessToken prüft ebenfalls
     * ob der User existiert. Wenn dieser Check zuerst fehlschlägt, kann
     * auch 404 zurückgegeben werden. Beide Status Codes sind akzeptabel.
     */
    it('should return 401 when user in adminToken no longer exists', async () => {
      // Erstelle temporären User
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash('password', BCRYPT_COST_FACTOR_PASSWORD);
      const tempUserId = generateTestId();
      const tempUsername = `temp_admin_${Date.now()}`;

      await prisma.user.create({
        data: {
          id: tempUserId,
          username: tempUsername,
          passwordHash,
          role: 'ADMIN',
          isActive: true,
        },
      });

      const accessToken = generateAccessToken(tempUserId, tempUsername, 'ADMIN');
      const adminToken = generateAdminToken(tempUserId, tempUsername, 'ADMIN');

      // Lösche User (simuliert gelöschten Account) - Triggers deaktivieren
      await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
      try {
        await prisma.user.delete({
          where: { id: tempUserId },
        });
      } finally {
        await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
      }

      // GET Request statt POST, um Controller-Logik zu umgehen
      // AdminJwtAuthGuard prüft Token bereits vor Controller-Ausführung
      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/users')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${accessToken}`, `adminToken=${adminToken}`]);

      // Erwarte 401 (von AdminJwtStrategy) oder 404 (von JwtStrategy auf accessToken)
      // Beide sind akzeptabel da der User nicht mehr existiert
      expect([401, 404]).toContain(response.status);
      expect(response.body).toHaveProperty('statusCode');
    });

    /**
     * Testet 403 wenn User in DB nicht mehr Admin ist (Role downgrade).
     *
     * @remarks
     * AdminJwtStrategy prüft in validate() ob User immer noch Admin-Rechte hat.
     * Bei Role Downgrade wird ForbiddenException geworfen (semantisch korrekter als 401).
     */
    it('should return 403 when user was downgraded from ADMIN to USER', async () => {
      // Downgrade User zu USER-Rolle
      await prisma.user.update({
        where: { id: testUserAdmin.id },
        data: { role: 'USER' },
      });

      try {
        const response = await request(app.getHttpServer())
          .post('/api/v-alpha/admin/users')
          .set('X-Server-Access-Token', serverAccessToken)
          .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
          .send({
            username: 'newuser',
          })
          .expect(403);

        expect(response.body).toHaveProperty('statusCode', 403);
        expect(response.body.message).toContain('no longer an admin');
      } finally {
        // Restore original role nach Test (wichtig für nachfolgende Tests!)
        await prisma.user.update({
          where: { id: testUserAdmin.id },
          data: { role: 'ADMIN' },
        });
      }
    });

    it('should return 401 when accessToken is empty string', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v-alpha/admin/users')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=`, `adminToken=${cachedAdminTokenAdmin}`])
        .send({ username: 'newuser' })
        .expect(401);
      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body.message).toContain('Unauthorized');
    });

    it('should return 401 when accessToken is whitespace-only', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v-alpha/admin/users')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=   `, `adminToken=${cachedAdminTokenAdmin}`])
        .send({ username: 'newuser' })
        .expect(401);
      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body.message).toContain('Unauthorized');
    });

    it('should return 401 when adminToken is empty string', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v-alpha/admin/users')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=`])
        .send({ username: 'newuser' })
        .expect(401);
      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body.message).toContain('Unauthorized');
    });

    it('should return 401 when adminToken is whitespace-only', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v-alpha/admin/users')
        .set('X-Server-Access-Token', serverAccessToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=   `])
        .send({ username: 'newuser' })
        .expect(401);
      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body.message).toContain('Unauthorized');
    });
  });
});
