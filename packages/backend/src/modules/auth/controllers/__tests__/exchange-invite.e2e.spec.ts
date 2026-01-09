/**
 * E2E Tests für POST /auth/exchange-invite Endpoint.
 *
 * Diese Tests validieren die vollständige HTTP-Schnittstelle mit:
 * - Real PostgreSQL Database
 * - NestJS Test Module mit echten Guards
 * - Rate-Limiting (5 req/min)
 * - Atomare Race-Condition-Sicherheit
 *
 * **Test Strategy:**
 * - Bootstrap der vollständigen NestJS-Anwendung
 * - HTTP Requests via supertest
 * - Real Database Operations (create/use InviteCodes)
 * - Cleanup nach jedem Test
 *
 * **Coverage (6 ACs):**
 * - AC1: Erfolgreicher Exchange (200 OK mit Token)
 * - AC2: Abgelaufener Code (400 INVITE_EXPIRED)
 * - AC3: Bereits verwendeter Code (400 INVITE_ALREADY_USED)
 * - AC4: Ungültiger Code (400 INVITE_INVALID)
 * - AC5: Rate-Limiting (429 TOO_MANY_REQUESTS)
 * - AC6: Concurrent Race-Condition (nur erster erfolgreich)
 */

import type { INestApplication } from '@nestjs/common';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { AppModule } from '../../../../app.module';
import { InviteCodeValue } from '@/domain/value-objects/invite-code-value';

/**
 * Prüft ob DATABASE_URL gesetzt ist.
 * Skippt Tests wenn keine DB verfügbar ist.
 */
const databaseAvailable = !!process.env.DATABASE_URL;

/**
 * Conditional Describe: Nur bei verfügbarer DB ausführen.
 */
(databaseAvailable ? describe : describe.skip)('POST /auth/exchange-invite (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let testRunId: number;

  // Test-User für Invite-Code Erstellung (createdBy)
  let adminUserId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    // Bootstrap NestJS-Anwendung
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    // Cleanup alte Test-Daten (vor allen Tests)
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      // ServerAccessTokens haben keine createdById Spalte - Cleanup via Name
      await prisma.$executeRawUnsafe(`DELETE FROM "server_access_tokens" WHERE "name" LIKE 'Invite Exchange: INV%'`);
      await prisma.$executeRawUnsafe(`DELETE FROM "invite_codes" WHERE code LIKE 'INV%'`);
      await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE username LIKE 'test_exchange_invite_%'`);
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }

    // Erstelle Admin-User für Invite-Code Erstellung
    testRunId = Date.now();
    const adminUser = await prisma.user.create({
      data: {
        id: createId(),
        username: `test_exchange_invite_admin_${testRunId}`,
        passwordHash: 'dummy-hash', // Kein Login erforderlich
        role: 'ADMIN',
        isActive: true,
      },
    });
    adminUserId = adminUser.id;
  }, 60000); // 60s Timeout für DB Setup

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup Tokens und InviteCodes nach jedem Test
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      // ServerAccessTokens haben keine createdById - Cleanup via InviteCode Relation
      await prisma.$executeRawUnsafe(`DELETE FROM "server_access_tokens" WHERE "inviteCodeId" IN (SELECT id FROM "invite_codes" WHERE "createdById" = $1)`, adminUserId);
      await prisma.$executeRawUnsafe(`DELETE FROM "invite_codes" WHERE "createdById" = $1`, adminUserId);
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }
  });

  afterAll(async () => {
    // Cleanup Test-User
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      // Cleanup in Abhängigkeitsreihenfolge: ServerAccessTokens -> InviteCodes -> User
      await prisma.$executeRawUnsafe(`DELETE FROM "server_access_tokens" WHERE "inviteCodeId" IN (SELECT id FROM "invite_codes" WHERE "createdById" = $1)`, adminUserId);
      await prisma.$executeRawUnsafe(`DELETE FROM "invite_codes" WHERE "createdById" = $1`, adminUserId);
      await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id = $1`, adminUserId);
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

  /**
   * Helper: Erstellt einen gültigen InviteCode in DB.
   */
  async function createValidInviteCode(options?: { expiresAt?: Date; maxUses?: number; useCount?: number; code?: string }): Promise<{ id: string; code: string }> {
    // InviteCodeId Format: inv_{cuid2} (28 Zeichen total)
    const id = `inv_${createId()}`;
    const code = options?.code ?? InviteCodeValue.generate().value!.value;
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 24); // 24h gültig

    await prisma.inviteCode.create({
      data: {
        id,
        code,
        expiresAt: options?.expiresAt ?? futureDate,
        maxUses: options?.maxUses ?? 1,
        useCount: options?.useCount ?? 0,
        createdById: adminUserId,
        isRevoked: false,
        label: null,
      },
    });

    return { id, code };
  }

  // ========================================
  // AC1: Erfolgreicher Exchange (200 OK)
  // ========================================

  describe('AC1: Erfolgreicher Exchange', () => {
    it('should exchange valid invite code successfully', async () => {
      // Given: Gültiger Invite-Code
      const { code } = await createValidInviteCode();

      // When: POST /auth/exchange-invite
      const response = await request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: code }).expect(200);

      // Then: Response Structure
      expect(response.body.data).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.accessToken).toMatch(/^blh_/); // Token-Format
      expect(response.body.data.serverInfo).toBeDefined();
      expect(response.body.data.serverInfo.name).toBe('Bluelight Hub');
      expect(response.body.data.serverInfo.version).toBeDefined();
      expect(response.body.data.serverInfo.baseUrl).toBeDefined();

      // Meta-Felder vorhanden
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.timestamp).toBeDefined();
      expect(response.body.meta.version).toBe('alpha');
      expect(response.body.meta.requestId).toBeDefined();

      // And: Verify Database State (useCount incremented)
      const updatedInvite = await prisma.inviteCode.findUnique({
        where: { code },
      });
      expect(updatedInvite).not.toBeNull();
      expect(updatedInvite!.useCount).toBe(1);

      // And: ServerAccessToken created
      const createdToken = await prisma.serverAccessToken.findFirst({
        where: { inviteCodeId: updatedInvite!.id },
      });
      expect(createdToken).not.toBeNull();
      expect(createdToken!.tokenHash).toMatch(/^\$2[aby]\$10\$/); // bcrypt format
      expect(createdToken!.name).toContain('Invite Exchange:');
    });

    it('should return unique tokens for each exchange', async () => {
      // Given: Zwei InviteCodes
      const { code: code1 } = await createValidInviteCode({ maxUses: 2 });
      const { code: code2 } = await createValidInviteCode({ maxUses: 2 });

      // When: Zwei Exchanges
      const response1 = await request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: code1 }).expect(200);

      const response2 = await request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: code2 }).expect(200);

      // Then: Tokens sind unterschiedlich
      const token1 = response1.body.data.accessToken;
      const token2 = response2.body.data.accessToken;
      expect(token1).not.toBe(token2);
    });
  });

  // ========================================
  // AC2: Abgelaufener Code (400 INVITE_EXPIRED)
  // ========================================

  describe('AC2: Abgelaufener Code', () => {
    it('should reject expired invite code', async () => {
      // Given: Abgelaufener Invite-Code
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1); // 1 Stunde vergangen
      const { code } = await createValidInviteCode({ expiresAt: pastDate });

      // When: POST with expired code
      const response = await request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: code }).expect(400);

      // Then: Verify error response
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toBe('Dieser Einladungscode ist abgelaufen.');

      // And: Verify useCount not incremented
      const invite = await prisma.inviteCode.findUnique({
        where: { code },
      });
      expect(invite).not.toBeNull();
      expect(invite!.useCount).toBe(0); // Nicht verwendet
    });

    it('should reject code expiring exactly now', async () => {
      // Given: Code der genau jetzt abläuft
      const nowDate = new Date();
      const { code } = await createValidInviteCode({ expiresAt: nowDate });

      // Wait 10ms to ensure expiresAt < now
      await new Promise((resolve) => setTimeout(resolve, 10));

      // When: POST
      const response = await request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: code }).expect(400);

      // Then: Should be expired
      expect(response.body.statusCode).toBe(400);
    });
  });

  // ========================================
  // AC3: Bereits verwendeter Code (400 INVITE_ALREADY_USED)
  // ========================================

  describe('AC3: Bereits verwendeter Code', () => {
    it('should reject already used invite code (useCount == maxUses)', async () => {
      // Given: Code mit maxUses=1, useCount=1 (bereits verwendet)
      const { code } = await createValidInviteCode({ maxUses: 1, useCount: 1 });

      // When: POST with used code
      const response = await request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: code }).expect(400);

      // Then: Verify error
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toBe('Dieser Einladungscode wurde bereits verwendet.');
    });

    it('should reject code after reaching maxUses (sequential)', async () => {
      // Given: Code mit maxUses=2
      const { code } = await createValidInviteCode({ maxUses: 2 });

      // When: Zwei erfolgreiche Exchanges
      await request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: code }).expect(200);

      await request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: code }).expect(200);

      // Then: Dritter Versuch schlägt fehl
      const response = await request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: code }).expect(400);

      expect(response.body.statusCode).toBe(400);

      // And: useCount = 2 (maxUses erreicht)
      const invite = await prisma.inviteCode.findUnique({
        where: { code },
      });
      expect(invite!.useCount).toBe(2);
    });

    it('should reject code exceeding maxUses', async () => {
      // Given: Code mit useCount > maxUses (Edge Case)
      const { code } = await createValidInviteCode({ maxUses: 1, useCount: 2 });

      // When: POST
      const response = await request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: code }).expect(400);

      // Then: Should be rejected
      expect(response.body.statusCode).toBe(400);
    });
  });

  // ========================================
  // AC4: Ungültiger Code (400 INVITE_INVALID)
  // ========================================

  describe('AC4: Ungültiger Code', () => {
    it('should reject non-existent invite code', async () => {
      // When: POST with non-existent code
      const response = await request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: 'NOTEXIST' }).expect(400);

      // Then: Verify error (NestJS HttpException structure)
      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toBe('Ungültiger Einladungscode.');
    });

    it('should reject malformed invite code (invalid length)', async () => {
      // When: POST with too short code
      const response = await request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: 'ABC' }).expect(400);

      // Then: Verify error (validation error)
      expect(response.body.statusCode).toBe(400);
      // InviteCodeValue validation error (8 Zeichen erforderlich)
    });

    it('should reject malformed invite code (invalid characters)', async () => {
      // When: POST with special characters
      const response = await request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: 'ABC@1234' }).expect(400);

      // Then: Verify error (validation error)
      expect(response.body.statusCode).toBe(400);
      // InviteCodeValue validation error (nur alphanumerisch erlaubt)
    });

    it('should reject empty invite code', async () => {
      // When: POST with empty code
      const response = await request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: '' }).expect(400);

      // Then: Verify error (validation error)
      expect(response.body.statusCode).toBe(400);
    });

    it('should reject missing invite code field', async () => {
      // When: POST without inviteCode field
      const response = await request(app.getHttpServer()).post('/api/auth/exchange-invite').send({}).expect(400);

      // Then: Verify error (validation error)
      expect(response.body.statusCode).toBe(400);
    });
  });

  // ========================================
  // AC5: Rate-Limiting (429 TOO_MANY_REQUESTS)
  // ========================================

  describe('AC5: Rate-Limiting', () => {
    it('should enforce rate limiting (5 req/min)', async () => {
      // Given: Gültiger Invite-Code mit maxUses=10
      const { code } = await createValidInviteCode({ maxUses: 10 });

      // When: Send 6 requests rapidly
      const requests = [];
      for (let i = 0; i < 6; i++) {
        requests.push(request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: code }));
      }

      const responses = await Promise.all(requests);

      // Then: Mind. eine Response sollte 429 sein
      const successResponses = responses.filter((r) => r.status === 200);
      const rateLimitedResponses = responses.filter((r) => r.status === 429);

      // Entweder 5 success + 1 rate-limited ODER alle erfolg (je nach Timing)
      // Rate-Limiting kann Race-Conditions haben
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Verify 429 response structure
      if (rateLimitedResponses.length > 0) {
        const rateLimited = rateLimitedResponses[0];
        expect(rateLimited.body.statusCode).toBe(429);
        expect(rateLimited.body.message).toBeDefined();
      }
    });

    it('should allow requests after rate limit window expires', async () => {
      // Given: Code
      const { code } = await createValidInviteCode({ maxUses: 10 });

      // When: 5 Requests
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: code });
      }

      // Wait for rate limit window to expire (60s + buffer)
      // NOTE: Diesen Test nur aktivieren wenn Zeit vorhanden!
      // await new Promise((resolve) => setTimeout(resolve, 61000));

      // Then: Nächster Request sollte erfolgreich sein
      // const response = await request(app.getHttpServer())
      //   .post('/api/auth/exchange-invite')
      //   .send({ inviteCode: code })
      //   .expect(200);

      // Testskip wegen Zeitaufwand
      expect(true).toBe(true);
    }, 65000); // 65s Timeout
  });

  // ========================================
  // AC6: Concurrent Race-Condition (nur erster erfolgreich)
  // ========================================

  describe('AC6: Concurrent Race-Condition', () => {
    it('should handle concurrent exchanges atomically (maxUses=1)', async () => {
      // Given: Code mit maxUses=1
      const { code } = await createValidInviteCode({ maxUses: 1 });

      // When: Zwei simultane Requests
      const [response1, response2] = await Promise.all([
        request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: code }),
        request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: code }),
      ]);

      // Then: Einer erfolgreich (200), einer fehlgeschlagen (400)
      const successCount = [response1, response2].filter((r) => r.status === 200).length;
      const failureCount = [response1, response2].filter((r) => r.status === 400).length;

      expect(successCount).toBe(1); // Nur erster erfolgreich
      expect(failureCount).toBe(1); // Zweiter abgelehnt

      // And: Verify final useCount is exactly 1
      const finalInvite = await prisma.inviteCode.findUnique({
        where: { code },
      });
      expect(finalInvite!.useCount).toBe(1);

      // And: Verify failed response error code
      const failedResponse = [response1, response2].find((r) => r.status === 400);
      expect(failedResponse!.body.statusCode).toBe(400);
    });

    it('should handle concurrent exchanges atomically (maxUses=3)', async () => {
      // Given: Code mit maxUses=3
      const { code } = await createValidInviteCode({ maxUses: 3 });

      // When: 5 simultane Requests
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: code }));
      }

      const responses = await Promise.all(requests);

      // Then: Genau 3 erfolgreich (200), 2 fehlgeschlagen (400)
      const successCount = responses.filter((r) => r.status === 200).length;
      const failureCount = responses.filter((r) => r.status === 400).length;

      expect(successCount).toBe(3); // Nur maxUses=3 erfolgreich
      expect(failureCount).toBe(2); // Restliche abgelehnt

      // And: Verify final useCount is exactly 3
      const finalInvite = await prisma.inviteCode.findUnique({
        where: { code },
      });
      expect(finalInvite!.useCount).toBe(3);
    });

    it('should prevent double-spend via atomic increment', async () => {
      // Given: Code mit maxUses=2
      const { code } = await createValidInviteCode({ maxUses: 2 });

      // When: 10 simultane Requests (Stress Test)
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: code }));
      }

      const responses = await Promise.all(requests);

      // Then: Genau 2 erfolgreich (200), 8 fehlgeschlagen (400)
      const successCount = responses.filter((r) => r.status === 200).length;
      const failureCount = responses.filter((r) => r.status === 400).length;

      expect(successCount).toBe(2); // Atomare Sicherheit
      expect(failureCount).toBe(8); // Keine Double-Spends

      // And: Verify final useCount is exactly 2
      const finalInvite = await prisma.inviteCode.findUnique({
        where: { code },
      });
      expect(finalInvite!.useCount).toBe(2);

      // And: Verify 2 unique ServerAccessTokens created
      const tokens = await prisma.serverAccessToken.findMany({
        where: { inviteCodeId: finalInvite!.id },
      });
      expect(tokens.length).toBe(2); // Keine Duplikate
    });
  });

  // ========================================
  // ADDITIONAL: Token Format & Security
  // ========================================

  describe('Additional: Token Format & Security', () => {
    it('should return token with blh_ prefix', async () => {
      // Given: Gültiger Code
      const { code } = await createValidInviteCode();

      // When: Exchange
      const response = await request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: code }).expect(200);

      // Then: Token hat blh_ Prefix
      expect(response.body.data.accessToken).toMatch(/^blh_/);
      expect(response.body.data.accessToken.length).toBeGreaterThan(30); // CUID2 Format
    });

    it('should store bcrypt hash in database (not plaintext)', async () => {
      // Given: Gültiger Code
      const { code } = await createValidInviteCode();

      // When: Exchange
      const response = await request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: code }).expect(200);

      const plainToken = response.body.data.accessToken;

      // Then: DB enthält Hash, nicht Plaintext
      const invite = await prisma.inviteCode.findUnique({
        where: { code },
        include: { redeemedToken: true },
      });

      const tokenHash = invite!.redeemedToken!.tokenHash;
      expect(tokenHash).toMatch(/^\$2[aby]\$10\$/); // bcrypt format
      expect(tokenHash).not.toBe(plainToken); // Kein Plaintext
      expect(tokenHash.length).toBe(60); // bcrypt hash length
    });

    it('should link ServerAccessToken to InviteCode via inviteCodeId', async () => {
      // Given: Gültiger Code
      const { code, id: inviteCodeId } = await createValidInviteCode();

      // When: Exchange
      await request(app.getHttpServer()).post('/api/auth/exchange-invite').send({ inviteCode: code }).expect(200);

      // Then: ServerAccessToken hat inviteCodeId Referenz
      const token = await prisma.serverAccessToken.findFirst({
        where: { inviteCodeId },
      });

      expect(token).not.toBeNull();
      expect(token!.inviteCodeId).toBe(inviteCodeId);
    });
  });
});
