/**
 * E2E Tests fuer AdminInviteController.
 *
 * Diese Tests validieren die vollstaendige HTTP-Schnittstelle mit:
 * - Real PostgreSQL Database
 * - NestJS Test Module mit echten Guards
 * - JWT-Token basierte Authentifizierung
 * - AdminJwtAuthGuard fuer Rollenvalidierung
 *
 * **Test Strategy:**
 * - Bootstrap der vollstaendigen NestJS-Anwendung
 * - HTTP Requests via supertest
 * - Real Database Operations (create/delete InviteCodes)
 * - Cleanup nach jedem Test
 *
 * **Coverage:**
 * - GET /admin/invites - Liste aller Invite-Codes
 * - DELETE /admin/invites/:id - Invite-Code widerrufen
 * - Auth-Tests (401/403)
 * - Validation-Tests (400)
 */

import type { INestApplication } from '@nestjs/common';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { AppModule } from '../../../../app.module';
import { skipIfNoDatabase } from '@infrastructure/__tests__/helpers/database-test.helper';
import { InviteCodeStatus } from '@domain/value-objects/invite-code-status';
import { InviteCodeValue } from '@domain/value-objects/invite-code-value';
import { BCRYPT_COST_FACTOR_PASSWORD, BCRYPT_COST_FACTOR_TOKEN } from '@infrastructure/config/security.constants';
import * as bcryptLib from 'bcrypt';

describe('AdminInviteController (e2e)', () => {
  let databaseAvailable = false;
  let app: INestApplication;
  let prisma: PrismaClient;
  let testRunId: number;

  // Test-Secrets fuer CI-Umgebung
  const TEST_JWT_SECRET = 'test-jwt-secret-for-e2e-tests';
  const TEST_ADMIN_JWT_SECRET = 'test-admin-jwt-secret-for-e2e-tests';

  // Test-User Daten
  let testAdminUser: { id: string; username: string; role: 'ADMIN' | 'SUPER_ADMIN' | 'USER' };
  let testRegularUser: { id: string; username: string; role: 'ADMIN' | 'SUPER_ADMIN' | 'USER' };

  // Gecachte Tokens
  let cachedAccessTokenAdmin: string;
  let cachedAdminTokenAdmin: string;
  let cachedAccessTokenRegular: string;
  let cachedAdminTokenRegular: string;
  /** Server Access Token ID (fuer Cleanup) */
  let serverAccessTokenId: string;

  /**
   * Generiert ein gueltiges Access-Token (regulaerer JWT).
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
   * Generiert ein gueltiges Admin-Token.
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
   * Erstellt einen InviteCode direkt in der Datenbank.
   */
  const createInviteCodeInDb = async (options: {
    createdById: string;
    expiresAt?: Date;
    maxUses?: number;
    useCount?: number;
    isRevoked?: boolean;
    label?: string;
  }): Promise<{ id: string; code: string }> => {
    const id = `inv_${createId().substring(0, 24)}`; // inv_ (4) + 24 = 28 Zeichen
    const code = InviteCodeValue.generate().value!.value;
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 24);

    await prisma.inviteCode.create({
      data: {
        id,
        code,
        expiresAt: options.expiresAt ?? futureDate,
        maxUses: options.maxUses ?? 10,
        useCount: options.useCount ?? 0,
        createdById: options.createdById,
        label: options.label ?? null,
        isRevoked: options.isRevoked ?? false,
        revokedAt: options.isRevoked ? new Date() : null,
      },
    });

    return { id, code };
  };

  /**
   * Erstellt einen abgelaufenen InviteCode.
   */
  const createExpiredInviteCodeInDb = async (createdById: string): Promise<{ id: string; code: string }> => {
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 1); // 1 Stunde in der Vergangenheit
    return createInviteCodeInDb({ createdById, expiresAt: pastDate });
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
    // Enable INSECURE_MODE to bypass ServerAccessGuard in E2E tests
    process.env.INSECURE_MODE = 'true';

    prisma = new PrismaClient();
    await prisma.$connect();

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
      await prisma.$executeRawUnsafe(`DELETE FROM "invite_codes" WHERE id LIKE 'inv_test%'`);
      await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE username LIKE 'test_admin_invite_%'`);
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }

    // Erstelle Test-Users
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('password', BCRYPT_COST_FACTOR_PASSWORD);
    testRunId = Date.now();

    // Admin User
    const adminUser = await prisma.user.create({
      data: {
        id: createId(),
        username: `test_admin_invite_admin_${testRunId}`,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });
    testAdminUser = { id: adminUser.id, username: adminUser.username, role: adminUser.role };

    // Regular User
    const regularUser = await prisma.user.create({
      data: {
        id: createId(),
        username: `test_admin_invite_user_${testRunId}`,
        passwordHash,
        role: 'USER',
        isActive: true,
      },
    });
    testRegularUser = { id: regularUser.id, username: regularUser.username, role: regularUser.role };

    // Token Generation
    cachedAccessTokenAdmin = generateAccessToken(testAdminUser.id, testAdminUser.username, testAdminUser.role);
    cachedAdminTokenAdmin = generateAdminToken(testAdminUser.id, testAdminUser.username, testAdminUser.role);
    cachedAccessTokenRegular = generateAccessToken(testRegularUser.id, testRegularUser.username, testRegularUser.role);
    cachedAdminTokenRegular = generateAdminToken(testRegularUser.id, testRegularUser.username, testRegularUser.role);

    // ServerAccessToken erstellen (erforderlich fuer SetupPendingGuard)
    // INSECURE_MODE umgeht nur ServerAccessGuard, NICHT SetupPendingGuard!
    serverAccessTokenId = `blh_${createId()}`;
    const serverAccessTokenRaw = `blh_test_${createId()}`;
    const tokenHash = await bcryptLib.hash(serverAccessTokenRaw, BCRYPT_COST_FACTOR_TOKEN);
    await prisma.serverAccessToken.create({
      data: {
        id: serverAccessTokenId,
        tokenHash,
        name: `test_admin_invite_token_${testRunId}`,
        isRevoked: false,
      },
    });
  }, 60000);

  beforeEach(async () => {
    if (!databaseAvailable) return;
    jest.clearAllMocks();

    // Cleanup ALLE InviteCodes vor jedem Test um Test-Isolation zu garantieren
    // Dies verhindert, dass Codes aus anderen Tests die Ergebnisse beeinflussen
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "invite_codes"`);
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }
  });

  afterEach(async () => {
    // Cleanup wird jetzt im beforeEach gemacht, um Test-Isolation zu garantieren
    // afterEach bleibt leer, da beforeEach bereits alle Codes loescht
    if (!databaseAvailable) return;
  });

  afterAll(async () => {
    if (!databaseAvailable) return;

    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "invite_codes" WHERE "createdById" IN ($1, $2)`, testAdminUser?.id, testRegularUser?.id);
      await prisma.$executeRawUnsafe(`DELETE FROM "server_access_tokens" WHERE name LIKE 'test_admin_invite_%'`);
      await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE username LIKE 'test_admin_invite_%'`);
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

    // Reset INSECURE_MODE
    delete process.env.INSECURE_MODE;
  });

  // ========================================
  // GET /admin/invites TESTS
  // ========================================

  describe('GET /api/v-alpha/admin/invites', () => {
    it('should return 401 without auth', async () => {
      if (!databaseAvailable) return;

      const response = await request(app.getHttpServer()).get('/api/v-alpha/admin/invites').expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      // With INSECURE_MODE=true, ServerAccessGuard bypasses, so AdminJwtAuthGuard throws 401
      expect(response.body.message).toBeTruthy();
    });

    it('should return 401 with only accessToken (missing adminToken)', async () => {
      if (!databaseAvailable) return;

      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/invites')
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`])
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 403 for regular user (non-admin)', async () => {
      if (!databaseAvailable) return;

      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/invites')
        .set('Cookie', [`accessToken=${cachedAccessTokenRegular}`, `adminToken=${cachedAdminTokenRegular}`])
        .expect(403);

      expect(response.body).toHaveProperty('statusCode', 403);
    });

    it('should return paginated list for admin', async () => {
      if (!databaseAvailable) return;

      // Given: 3 InviteCodes
      await createInviteCodeInDb({ createdById: testAdminUser.id, label: 'Code 1' });
      await createInviteCodeInDb({ createdById: testAdminUser.id, label: 'Code 2' });
      await createInviteCodeInDb({ createdById: testAdminUser.id, label: 'Code 3' });

      // When: Admin lists invites
      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/invites')
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(200);

      // Then: Wrapped response with data array
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(3);

      // Verify codes are masked
      for (const item of response.body.data) {
        expect(item.code).toMatch(/^[A-Z0-9]{4}\*{4}$/);
        // Code is present but masked (e.g. "ABC1****")
        expect(item.code).toBeDefined();
      }
    });

    it('should filter by status', async () => {
      if (!databaseAvailable) return;

      // Given: Different status codes
      await createInviteCodeInDb({ createdById: testAdminUser.id }); // ACTIVE
      await createInviteCodeInDb({ createdById: testAdminUser.id, isRevoked: true }); // REVOKED
      await createExpiredInviteCodeInDb(testAdminUser.id); // EXPIRED

      // When: Filter by ACTIVE
      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/invites')
        .query({ status: InviteCodeStatus.ACTIVE })
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(200);

      // Then: Only active codes
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe(InviteCodeStatus.ACTIVE);
    });

    it('should filter by createdBy', async () => {
      if (!databaseAvailable) return;

      // Given: Codes from different users (using admin as creator for both for simplicity)
      await createInviteCodeInDb({ createdById: testAdminUser.id, label: 'Admin Code' });

      // When: Filter by createdBy
      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/invites')
        .query({ createdBy: testAdminUser.id })
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(200);

      // Then: Only codes from that user
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].createdBy.id).toBe(testAdminUser.id);
    });

    it('should sort by expiresAt', async () => {
      if (!databaseAvailable) return;

      // Given: Codes with different expiry
      const now = new Date();
      await createInviteCodeInDb({
        createdById: testAdminUser.id,
        expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        label: 'Later',
      });
      await createInviteCodeInDb({
        createdById: testAdminUser.id,
        expiresAt: new Date(now.getTime() + 1 * 60 * 60 * 1000),
        label: 'Earlier',
      });

      // When: Sort by expiresAt asc
      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/invites')
        .query({ sort: 'expiresAt:asc' })
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(200);

      // Then: Earlier first
      expect(response.body.data[0].label).toBe('Earlier');
      expect(response.body.data[1].label).toBe('Later');
    });

    it('should return 400 for invalid status', async () => {
      if (!databaseAvailable) return;

      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/invites')
        .query({ status: 'invalid_status' })
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('Status');
    });

    it('should return 400 for invalid sort field', async () => {
      if (!databaseAvailable) return;

      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/invites')
        .query({ sort: 'invalidField:asc' })
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('Sortierfeld');
    });

    it('should support pagination parameters', async () => {
      if (!databaseAvailable) return;

      // Given: 5 codes
      for (let i = 0; i < 5; i++) {
        await createInviteCodeInDb({ createdById: testAdminUser.id, label: `Code ${i}` });
      }

      // When: Request page 1 with pageSize 2
      const response = await request(app.getHttpServer())
        .get('/api/v-alpha/admin/invites')
        .query({ page: 1, pageSize: 2 })
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(200);

      // Then: Only 2 items returned
      expect(response.body.data.length).toBe(2);
    });
  });

  // ========================================
  // DELETE /admin/invites/:id TESTS
  // ========================================

  describe('DELETE /api/v-alpha/admin/invites/:id', () => {
    it('should return 401 without auth', async () => {
      if (!databaseAvailable) return;

      const { id } = await createInviteCodeInDb({ createdById: testAdminUser.id });

      const response = await request(app.getHttpServer()).delete(`/api/v-alpha/admin/invites/${id}`).expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 403 for regular user', async () => {
      if (!databaseAvailable) return;

      const { id } = await createInviteCodeInDb({ createdById: testAdminUser.id });

      const response = await request(app.getHttpServer())
        .delete(`/api/v-alpha/admin/invites/${id}`)
        .set('Cookie', [`accessToken=${cachedAccessTokenRegular}`, `adminToken=${cachedAdminTokenRegular}`])
        .expect(403);

      expect(response.body).toHaveProperty('statusCode', 403);
    });

    it('should return 400 for non-existent id', async () => {
      if (!databaseAvailable) return;

      // Valid format but non-existent ID (inv_ + 24 chars = 28 total)
      const fakeId = `inv_${createId().substring(0, 24)}`;

      const response = await request(app.getHttpServer())
        .delete(`/api/v-alpha/admin/invites/${fakeId}`)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('nicht gefunden');
    });

    it('should revoke and return 200 with status revoked', async () => {
      if (!databaseAvailable) return;

      // Given: Active InviteCode
      const { id } = await createInviteCodeInDb({ createdById: testAdminUser.id });

      // When: Revoke
      const response = await request(app.getHttpServer())
        .delete(`/api/v-alpha/admin/invites/${id}`)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(200);

      // Then: Response shows revoked status
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.status).toBe(InviteCodeStatus.REVOKED);
      expect(response.body.data.revokedAt).toBeTruthy();

      // Verify in DB
      const dbRecord = await prisma.inviteCode.findUnique({ where: { id } });
      expect(dbRecord?.isRevoked).toBe(true);
      expect(dbRecord?.revokedAt).not.toBeNull();
    });

    it('should be idempotent (already revoked returns 200)', async () => {
      if (!databaseAvailable) return;

      // Given: Already revoked InviteCode
      const { id } = await createInviteCodeInDb({ createdById: testAdminUser.id, isRevoked: true });

      // When: Revoke again
      const response = await request(app.getHttpServer())
        .delete(`/api/v-alpha/admin/invites/${id}`)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(200);

      // Then: Still returns success with revoked status
      expect(response.body.data.status).toBe(InviteCodeStatus.REVOKED);
      expect(response.body.data.revokedAt).toBeTruthy();
    });

    it('should not change used codes to revoked (keep USED status)', async () => {
      if (!databaseAvailable) return;

      // Given: Fully used InviteCode (usedCount >= maxUses)
      const { id } = await createInviteCodeInDb({
        createdById: testAdminUser.id,
        maxUses: 1,
        useCount: 1,
      });

      // When: Try to revoke
      const response = await request(app.getHttpServer())
        .delete(`/api/v-alpha/admin/invites/${id}`)
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(200);

      // Then: Status remains USED (idempotent behavior)
      expect(response.body.data.status).toBe(InviteCodeStatus.USED);

      // Verify in DB: isRevoked should not be set
      const dbRecord = await prisma.inviteCode.findUnique({ where: { id } });
      expect(dbRecord?.isRevoked).toBe(false);
    });

    it('should return 400 for invalid invite code id format', async () => {
      if (!databaseAvailable) return;

      const response = await request(app.getHttpServer())
        .delete('/api/v-alpha/admin/invites/invalid-format')
        .set('Cookie', [`accessToken=${cachedAccessTokenAdmin}`, `adminToken=${cachedAdminTokenAdmin}`])
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });
  });
});
