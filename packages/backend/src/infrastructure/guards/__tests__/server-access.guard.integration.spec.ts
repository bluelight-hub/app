/**
 * Integration Tests für ServerAccessGuard Multi-Token-Validierung (Story 4.5).
 *
 * Diese Tests validieren die Token-Validierung im ServerAccessGuard:
 * 1. Mehrere Token gleichzeitig aktiv - alle validieren erfolgreich
 * 2. Token-Validierung aktualisiert lastUsedAt asynchron
 * 3. Kein Token-Limit (10+ Tokens möglich)
 * 4. Deaktivierter Token wird abgelehnt (401), aktiver akzeptiert
 *
 * **Test Strategy:**
 * - Real PostgreSQL Database (NICHT mocked, NICHT in-memory)
 * - Given-When-Then BDD Style für maximale Lesbarkeit
 * - E2E HTTP Requests via supertest
 * - Cleanup mit session_replication_role = replica
 *
 * **AC Coverage:**
 * - AC2.1: Mehrere Token gleichzeitig aktiv
 * - AC2.2: lastUsedAt Update asynchron
 * - AC2.3: Kein Token-Limit
 * - AC2.4: Deaktivierter Token abgelehnt
 */

import type { INestApplication } from '@nestjs/common';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { AppModule } from '../../../app.module';
import { skipIfNoDatabase } from '@infrastructure/__tests__/helpers/database-test.helper';
import { BCRYPT_COST_FACTOR_TOKEN, BCRYPT_COST_FACTOR_PASSWORD } from '@infrastructure/config/security.constants';

describe('ServerAccessGuard - Multi-Token-Validierung Integration Tests (Story 4.5)', () => {
  let databaseAvailable = false;
  let app: INestApplication;
  let prisma: PrismaClient;
  let testRunId: number;

  // Test-Secrets für CI-Umgebung
  const TEST_JWT_SECRET = 'test-jwt-secret-for-e2e-tests';
  const TEST_ADMIN_JWT_SECRET = 'test-admin-jwt-secret-for-e2e-tests';

  // Test-User Daten
  let testAdminUser: { id: string; username: string; role: 'ADMIN' | 'SUPER_ADMIN' | 'USER' };

  // Gecachte Tokens
  let cachedAccessTokenAdmin: string;
  let cachedAdminTokenAdmin: string;

  // Tracking für Cleanup
  const createdTokenIds: string[] = [];

  /**
   * Generiert ein gültiges Access-Token (regulärer JWT).
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
   * Generiert ein gültiges Admin-Token.
   */
  const generateAdminToken = (userId: string, username: string, role: 'ADMIN' | 'SUPER_ADMIN' | 'USER'): string => {
    return jwt.sign(
      {
        sub: userId,
        username,
        role,
        isAdmin: role !== 'USER',
      },
      process.env.ADMIN_JWT_SECRET || TEST_ADMIN_JWT_SECRET,
      { expiresIn: '15m' },
    );
  };

  /**
   * Erstellt einen Server-Access-Token in der Datenbank und gibt Klartext-Token zurück.
   *
   * WICHTIG: AccessTokenId muss Format `blh_{cuid2}` mit exakt 28 Zeichen haben.
   */
  const createServerAccessToken = async (options?: {
    name?: string;
    expiresAt?: Date | null;
    isRevoked?: boolean;
    lastUsedAt?: Date | null;
  }): Promise<{ id: string; rawToken: string; tokenHash: string }> => {
    // AccessTokenId Format: blh_ (4 Zeichen) + cuid2 (24 Zeichen) = 28 Zeichen
    const cuid = createId();
    const id = `blh_${cuid}`;
    const rawToken = `blh_test_${createId()}`;
    const tokenHash = await bcrypt.hash(rawToken, BCRYPT_COST_FACTOR_TOKEN);

    await prisma.serverAccessToken.create({
      data: {
        id,
        tokenHash,
        name: options?.name ?? null,
        expiresAt: options?.expiresAt ?? null,
        isRevoked: options?.isRevoked ?? false,
        revokedAt: options?.isRevoked ? new Date() : null,
        lastUsedAt: options?.lastUsedAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    createdTokenIds.push(id);
    return { id, rawToken, tokenHash };
  };

  /**
   * Lädt ein Token aus der Datenbank.
   */
  const getTokenFromDb = async (id: string) => {
    return prisma.serverAccessToken.findUnique({ where: { id } });
  };

  beforeAll(async () => {
    databaseAvailable = await skipIfNoDatabase();
    if (!databaseAvailable) {
      return;
    }

    // Setze Test-Secrets
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = TEST_JWT_SECRET;
    }
    if (!process.env.ADMIN_JWT_SECRET) {
      process.env.ADMIN_JWT_SECRET = TEST_ADMIN_JWT_SECRET;
    }
    // INSECURE_MODE muss FALSE sein für diese Tests - wir testen den Guard
    delete process.env.INSECURE_MODE;

    prisma = new PrismaClient();
    await prisma.$connect();

    // WICHTIG: ServerConfig muss explizit auf insecureMode=false gesetzt werden!
    // Das Repository erstellt standardmäßig insecureMode=true (für Erstinstallation).
    // Für diese Tests brauchen wir aber SECURE Mode um den Guard zu testen.
    await prisma.serverConfig.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        insecureMode: false,
        migratedAt: new Date(),
      },
      update: {
        insecureMode: false,
        migratedAt: new Date(),
      },
    });

    // Bootstrap NestJS-Anwendung
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.enableVersioning({
      type: VersioningType.URI,
      prefix: 'v-',
      defaultVersion: 'alpha',
    });
    app.setGlobalPrefix('api', { exclude: ['/'] });
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    // Cleanup alte Test-Daten
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "server_access_tokens" WHERE name LIKE 'test_guard_%'`);
      await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE username LIKE 'test_guard_user_%'`);
      // Cleanup alle Tokens mit ungültigem Format (nicht blh_ Prefix) - können von anderen Tests stammen
      await prisma.$executeRawUnsafe(`DELETE FROM "server_access_tokens" WHERE id NOT LIKE 'blh_%'`);
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }

    // Erstelle Test-User
    const passwordHash = await bcrypt.hash('password', BCRYPT_COST_FACTOR_PASSWORD);
    testRunId = Date.now();

    // Admin User
    const adminUser = await prisma.user.create({
      data: {
        id: createId(),
        username: `test_guard_user_admin_${testRunId}`,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });
    testAdminUser = { id: adminUser.id, username: adminUser.username, role: adminUser.role };

    // Token Generation
    cachedAccessTokenAdmin = generateAccessToken(testAdminUser.id, testAdminUser.username, testAdminUser.role);
    cachedAdminTokenAdmin = generateAdminToken(testAdminUser.id, testAdminUser.username, testAdminUser.role);
  }, 60000);

  beforeEach(() => {
    if (!databaseAvailable) return;
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (!databaseAvailable) return;

    // Cleanup created tokens
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      for (const tokenId of createdTokenIds) {
        await prisma.serverAccessToken.deleteMany({ where: { id: tokenId } });
      }
      createdTokenIds.length = 0;
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }
  });

  afterAll(async () => {
    if (!databaseAvailable) return;

    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "server_access_tokens" WHERE name LIKE 'test_guard_%'`);
      await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE username LIKE 'test_guard_user_%'`);
      // ServerConfig zurücksetzen auf Default (insecureMode=true) für andere Tests
      await prisma.serverConfig.upsert({
        where: { id: 'singleton' },
        create: {
          id: 'singleton',
          insecureMode: true,
          migratedAt: null,
        },
        update: {
          insecureMode: true,
          migratedAt: null,
        },
      });
    } catch {
      // Ignore cleanup errors
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }

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

  // ========================================
  // Test 2.1: Mehrere Token gleichzeitig aktiv
  // ========================================

  describe('AC2.1: Mehrere Token gleichzeitig aktiv - alle validieren erfolgreich', () => {
    it('sollte 3 aktive Tokens akzeptieren und 200 OK für jeden zurückgeben', async () => {
      if (!databaseAvailable) return;

      // Given: 3 aktive Tokens erstellen
      const token1 = await createServerAccessToken({ name: 'test_guard_token_1' });
      const token2 = await createServerAccessToken({ name: 'test_guard_token_2' });
      const token3 = await createServerAccessToken({ name: 'test_guard_token_3' });

      // When & Then: Mit jedem Token einen Request senden
      // Verwende einen öffentlichen Endpunkt, der ServerAccessGuard verwendet
      // GET /api/v-alpha/admin/tokens ist ein Admin-Endpunkt mit ServerAccessGuard

      // Token 1 sollte funktionieren
      const response1 = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/tokens')
        .set('X-Server-Access-Token', token1.rawToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(200);

      expect(response1.body).toHaveProperty('data');

      // Token 2 sollte funktionieren
      const response2 = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/tokens')
        .set('X-Server-Access-Token', token2.rawToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(200);

      expect(response2.body).toHaveProperty('data');

      // Token 3 sollte funktionieren
      const response3 = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/tokens')
        .set('X-Server-Access-Token', token3.rawToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(200);

      expect(response3.body).toHaveProperty('data');
    });

    it('sollte alle Tokens parallel validieren können', async () => {
      if (!databaseAvailable) return;

      // Given: 3 aktive Tokens erstellen
      const token1 = await createServerAccessToken({ name: 'test_guard_parallel_1' });
      const token2 = await createServerAccessToken({ name: 'test_guard_parallel_2' });
      const token3 = await createServerAccessToken({ name: 'test_guard_parallel_3' });

      // When: Alle 3 Requests parallel senden
      const [response1, response2, response3] = await Promise.all([
        request(app.getHttpServer())
          .get('/api/v-alpha/admin/tokens')
          .set('X-Server-Access-Token', token1.rawToken)
          .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`]),
        request(app.getHttpServer())
          .get('/api/v-alpha/admin/tokens')
          .set('X-Server-Access-Token', token2.rawToken)
          .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`]),
        request(app.getHttpServer())
          .get('/api/v-alpha/admin/tokens')
          .set('X-Server-Access-Token', token3.rawToken)
          .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`]),
      ]);

      // Then: Alle sollten 200 OK zurückgeben
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response3.status).toBe(200);
    });
  });

  // ========================================
  // Test 2.2: lastUsedAt Update asynchron
  // ========================================

  describe('AC2.2: Token-Validierung aktualisiert lastUsedAt asynchron', () => {
    it('sollte lastUsedAt nach Token-Nutzung aktualisieren', async () => {
      if (!databaseAvailable) return;

      // Given: Token ohne lastUsedAt erstellen
      const token = await createServerAccessToken({ name: 'test_guard_lastused' });

      // Verify initial state
      let dbToken = await getTokenFromDb(token.id);
      expect(dbToken?.lastUsedAt).toBeNull();

      // When: Token nutzen
      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/tokens')
        .set('X-Server-Access-Token', token.rawToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(200);

      expect(response.body).toHaveProperty('data');

      // Then: Kurz warten (asynchrones Update via setImmediate)
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify lastUsedAt wurde aktualisiert
      dbToken = await getTokenFromDb(token.id);
      expect(dbToken?.lastUsedAt).not.toBeNull();
      expect(dbToken?.lastUsedAt).toBeInstanceOf(Date);

      // lastUsedAt sollte innerhalb der letzten 5 Sekunden sein
      const now = new Date();
      const diff = now.getTime() - (dbToken?.lastUsedAt?.getTime() ?? 0);
      expect(diff).toBeLessThan(5000);
    });

    it('sollte lastUsedAt bei mehrfacher Nutzung aktualisieren', async () => {
      if (!databaseAvailable) return;

      // Given: Token erstellen
      const token = await createServerAccessToken({ name: 'test_guard_lastused_multi' });

      // When: Token zweimal nutzen mit Pause
      await request(app.getHttpServer())
        .get('/api/v-alpha/admin/tokens')
        .set('X-Server-Access-Token', token.rawToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(200);

      // Warten auf asynchrones Update
      await new Promise((resolve) => setTimeout(resolve, 200));

      const firstUsedAt = (await getTokenFromDb(token.id))?.lastUsedAt;
      expect(firstUsedAt).not.toBeNull();

      // Kurz warten
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Zweite Nutzung
      await request(app.getHttpServer())
        .get('/api/v-alpha/admin/tokens')
        .set('X-Server-Access-Token', token.rawToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(200);

      // Warten auf asynchrones Update
      await new Promise((resolve) => setTimeout(resolve, 200));

      const secondUsedAt = (await getTokenFromDb(token.id))?.lastUsedAt;
      expect(secondUsedAt).not.toBeNull();

      // Then: secondUsedAt sollte >= firstUsedAt sein
      expect(secondUsedAt!.getTime()).toBeGreaterThanOrEqual(firstUsedAt!.getTime());
    });
  });

  // ========================================
  // Test 2.3: Kein Token-Limit
  // ========================================

  describe('AC2.3: Kein Token-Limit (10+ Tokens möglich)', () => {
    it('sollte 15 aktive Tokens erstellen und alle validieren können', async () => {
      if (!databaseAvailable) return;

      // Given: 15 Tokens erstellen
      const tokens: { id: string; rawToken: string }[] = [];
      for (let i = 0; i < 15; i++) {
        const token = await createServerAccessToken({ name: `test_guard_limit_${i}` });
        tokens.push(token);
      }

      // When & Then: Jedes Token sollte funktionieren
      for (const token of tokens) {
        const response = await request(app.getHttpServer())
          .get('/api/v-alpha/admin/tokens')
          .set('X-Server-Access-Token', token.rawToken)
          .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
          .expect(200);

        expect(response.body).toHaveProperty('data');
      }
    }, 60000); // Erhöhtes Timeout für 15 Token-Validierungen

    it('sollte mindestens 10 Tokens parallel validieren können', async () => {
      if (!databaseAvailable) return;

      // Given: 10 Tokens erstellen
      const tokens: { id: string; rawToken: string }[] = [];
      for (let i = 0; i < 10; i++) {
        const token = await createServerAccessToken({ name: `test_guard_parallel_limit_${i}` });
        tokens.push(token);
      }

      // When: Alle 10 Requests parallel senden
      const responses = await Promise.all(
        tokens.map((token) =>
          request(app.getHttpServer())
            .get('/api/v-alpha/admin/tokens')
            .set('X-Server-Access-Token', token.rawToken)
            .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`]),
        ),
      );

      // Then: Alle sollten 200 OK zurückgeben
      for (const response of responses) {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
      }
    }, 30000);
  });

  // ========================================
  // Test 2.4: Deaktivierter Token abgelehnt
  // ========================================

  describe('AC2.4: Deaktivierter Token wird abgelehnt (401), aktiver akzeptiert', () => {
    it('sollte aktiven Token akzeptieren und deaktivierten ablehnen', async () => {
      if (!databaseAvailable) return;

      // Given: 2 Tokens erstellen - einer aktiv, einer revoked
      const activeToken = await createServerAccessToken({ name: 'test_guard_active' });
      const revokedToken = await createServerAccessToken({
        name: 'test_guard_revoked',
        isRevoked: true,
      });

      // When & Then: Aktiver Token sollte funktionieren
      const activeResponse = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/tokens')
        .set('X-Server-Access-Token', activeToken.rawToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(200);

      expect(activeResponse.body).toHaveProperty('data');

      // Deaktivierter Token sollte 401 zurückgeben
      const revokedResponse = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/tokens')
        .set('X-Server-Access-Token', revokedToken.rawToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(401);

      expect(revokedResponse.body).toHaveProperty('statusCode', 401);
      expect(revokedResponse.body.message).toContain('Invalid or revoked');
    });

    it('sollte expired Token ablehnen (401)', async () => {
      if (!databaseAvailable) return;

      // Given: Expired Token erstellen (1 Stunde in der Vergangenheit)
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      const expiredToken = await createServerAccessToken({
        name: 'test_guard_expired',
        expiresAt: pastDate,
      });

      // When & Then: Expired Token sollte 401 zurückgeben
      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/tokens')
        .set('X-Server-Access-Token', expiredToken.rawToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body.message).toContain('Invalid or revoked');
    });

    it('sollte fehlendes Token ablehnen (401)', async () => {
      if (!databaseAvailable) return;

      // When & Then: Request ohne X-Server-Access-Token Header
      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/tokens')
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body.message).toContain('Server access token required');
    });

    it('sollte ungültiges Token ablehnen (401)', async () => {
      if (!databaseAvailable) return;

      // Given: Ungültiges Token (nicht in DB)
      const invalidToken = 'blh_invalid_token_that_does_not_exist';

      // When & Then: Ungültiges Token sollte 401 zurückgeben
      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/tokens')
        .set('X-Server-Access-Token', invalidToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body.message).toContain('Invalid or revoked');
    });

    it('sollte nach Token-Deaktivierung den Token ablehnen', async () => {
      if (!databaseAvailable) return;

      // Given: Aktiven Token erstellen
      const token = await createServerAccessToken({ name: 'test_guard_deactivate' });

      // Debug: Verify token exists in DB
      const dbToken = await prisma.serverAccessToken.findUnique({ where: { id: token.id } });
      expect(dbToken).not.toBeNull();
      expect(dbToken?.isRevoked).toBe(false);

      // Debug: Verify bcrypt hash matches
      const hashMatches = await bcrypt.compare(token.rawToken, dbToken!.tokenHash);
      expect(hashMatches).toBe(true);

      // Verify: Token funktioniert
      const firstResponse = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/tokens')
        .set('X-Server-Access-Token', token.rawToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(200);

      expect(firstResponse.body).toHaveProperty('data');

      // When: Token deaktivieren (revoke)
      await prisma.serverAccessToken.update({
        where: { id: token.id },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Then: Token sollte jetzt abgelehnt werden
      const secondResponse = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/tokens')
        .set('X-Server-Access-Token', token.rawToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(401);

      expect(secondResponse.body).toHaveProperty('statusCode', 401);
      expect(secondResponse.body.message).toContain('Invalid or revoked');
    });

    it('sollte nach Token-Reaktivierung den Token wieder akzeptieren', async () => {
      if (!databaseAvailable) return;

      // Given: Revoked Token erstellen
      const token = await createServerAccessToken({
        name: 'test_guard_reactivate',
        isRevoked: true,
      });

      // Debug: Verify token exists and is revoked
      const dbTokenBefore = await prisma.serverAccessToken.findUnique({ where: { id: token.id } });
      expect(dbTokenBefore).not.toBeNull();
      expect(dbTokenBefore?.isRevoked).toBe(true);

      // Verify: Token wird abgelehnt
      const firstResponse = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/tokens')
        .set('X-Server-Access-Token', token.rawToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(401);

      expect(firstResponse.body).toHaveProperty('statusCode', 401);

      // When: Token reaktivieren
      await prisma.serverAccessToken.update({
        where: { id: token.id },
        data: {
          isRevoked: false,
          revokedAt: null,
          updatedAt: new Date(),
        },
      });

      // Debug: Verify token is now active
      const dbTokenAfter = await prisma.serverAccessToken.findUnique({ where: { id: token.id } });
      expect(dbTokenAfter).not.toBeNull();
      expect(dbTokenAfter?.isRevoked).toBe(false);

      // Then: Token sollte jetzt akzeptiert werden
      const secondResponse = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/tokens')
        .set('X-Server-Access-Token', token.rawToken)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(200);

      expect(secondResponse.body).toHaveProperty('data');
    });
  });
});
