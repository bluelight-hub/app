/**
 * Integration Tests für PrismaServerAccessTokenRepository mit Real PostgreSQL Database.
 *
 * Diese Tests validieren den Prisma Adapter für IServerAccessTokenRepository:
 * 1. save() - Upsert Pattern (CREATE + UPDATE idempotency)
 * 2. findById() - Token laden mit Result Pattern
 * 3. findByTokenHash() - Token anhand Hash finden
 * 4. findAllActive() - Gefilterte Liste (nicht revoked, nicht expired)
 * 5. existsByTokenHash() - Efficient Existenz-Check
 * 6. countActive() - Aktive Token zählen
 * 7. delete() - Hard Delete für DSGVO
 * 8. Transaction Support - Internal und External Transactions
 *
 * **Test Strategy:**
 * - Real PostgreSQL Database (NICHT mocked, NICHT in-memory)
 * - Given-When-Then BDD Style für maximale Lesbarkeit
 * - Cleanup mit session_replication_role = replica
 * - afterEach() cleanup aller Test-Tokens
 *
 * **AC Coverage:**
 * - AC3: Repository implements IServerAccessTokenRepository Interface
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaServerAccessTokenRepository } from '../prisma-server-access-token.repository';
import { ServerAccessToken } from '@domain/aggregates/server-access-token.aggregate';
import { AccessTokenId } from '@domain/value-objects/access-token-id';
import { TokenHash } from '@domain/value-objects/token-hash';
import type { PrismaService } from '@/infrastructure/database/prisma.service';
import type { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { skipIfNoDatabase } from '@/infrastructure/__tests__/helpers/database-test.helper';

/**
 * Mock Logger für Integration Tests.
 * Implementiert ILogger Interface ohne externe Dependencies.
 */
const createMockLogger = (): ILogger => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

/**
 * Generiert einen validen bcrypt Hash für Tests.
 * Cost Factor = 10 (Minimum gemäß NFR-S1).
 */
async function generateTestHash(value = 'test-token'): Promise<string> {
  return bcrypt.hash(value, 10);
}

describe('PrismaServerAccessTokenRepository - Integration Tests', () => {
  let prisma: PrismaClient;
  let repository: PrismaServerAccessTokenRepository;
  let databaseAvailable = false;
  const createdTokenIds: string[] = []; // Track für Cleanup

  // ========================================
  // SETUP & TEARDOWN
  // ========================================

  beforeAll(async () => {
    databaseAvailable = await skipIfNoDatabase();
    if (!databaseAvailable) {
      return;
    }
    prisma = new PrismaClient();

    // Initialize Repository
    const prismaService = prisma as unknown as PrismaService;
    const mockLogger = createMockLogger();
    repository = new PrismaServerAccessTokenRepository(prismaService, mockLogger);
  });

  afterEach(async () => {
    if (!databaseAvailable) return;

    // Cleanup all created tokens
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
    await prisma.$disconnect();
  });

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  /**
   * Erstellt ein Test-Token und tracked es für Cleanup.
   */
  async function createTestToken(options?: { name?: string; expiresAt?: Date }): Promise<ServerAccessToken> {
    const hash = await generateTestHash(`token-${Date.now()}-${Math.random()}`);
    const tokenHashResult = TokenHash.create(hash);
    expect(tokenHashResult.isSuccess).toBe(true);

    const tokenResult = ServerAccessToken.create({
      tokenHash: tokenHashResult.value!,
      name: options?.name,
      expiresAt: options?.expiresAt,
    });
    expect(tokenResult.isSuccess).toBe(true);

    const token = tokenResult.value!;
    createdTokenIds.push(token.id.value);
    return token;
  }

  // ========================================
  // AC1: INTERFACE IMPLEMENTATION
  // ========================================

  describe('AC1: Repository implements IServerAccessTokenRepository Interface', () => {
    it('should implement all IServerAccessTokenRepository interface methods', () => {
      if (!databaseAvailable) return;

      // Given: PrismaServerAccessTokenRepository instance
      const repo: IServerAccessTokenRepository = repository;

      // Then: All interface methods exist and are functions
      expect(typeof repo.save).toBe('function');
      expect(typeof repo.findById).toBe('function');
      expect(typeof repo.findByTokenHash).toBe('function');
      expect(typeof repo.findAllActive).toBe('function');
      expect(typeof repo.delete).toBe('function');
      expect(typeof repo.existsByTokenHash).toBe('function');
      expect(typeof repo.countActive).toBe('function');
    });
  });

  // ========================================
  // AC2: SAVE() METHOD
  // ========================================

  describe('AC2: save() Method', () => {
    it('should create new ServerAccessToken (INSERT operation)', async () => {
      if (!databaseAvailable) return;

      // Given: Fresh aggregate
      const token = await createTestToken({ name: 'Test Token 1' });

      // When: Save aggregate
      const saveResult = await repository.save(token);

      // Then: Save was successful
      expect(saveResult.isSuccess).toBe(true);

      // And: Database has 1 token row
      const tokenCount = await prisma.serverAccessToken.count({ where: { id: token.id.value } });
      expect(tokenCount).toBe(1);

      // And: All fields are correctly persisted
      const dbToken = await prisma.serverAccessToken.findUnique({ where: { id: token.id.value } });
      expect(dbToken?.name).toBe('Test Token 1');
      expect(dbToken?.isRevoked).toBe(false);
    });

    it('should update existing ServerAccessToken (UPSERT idempotency)', async () => {
      if (!databaseAvailable) return;

      // Given: Token saved once
      const token = await createTestToken({ name: 'Original Name' });
      await repository.save(token);

      // When: Modify and save again
      token.updateName('Updated Name');
      await repository.save(token);

      // Then: Still only 1 token row (no duplicate)
      const tokenCount = await prisma.serverAccessToken.count({ where: { id: token.id.value } });
      expect(tokenCount).toBe(1);

      // And: Name is updated
      const dbToken = await prisma.serverAccessToken.findUnique({ where: { id: token.id.value } });
      expect(dbToken?.name).toBe('Updated Name');
    });

    it('should persist revoked state correctly', async () => {
      if (!databaseAvailable) return;

      // Given: Active token
      const token = await createTestToken({ name: 'To Be Revoked' });
      await repository.save(token);

      // When: Revoke and save
      token.revoke();
      await repository.save(token);

      // Then: isRevoked is true in database
      const dbToken = await prisma.serverAccessToken.findUnique({ where: { id: token.id.value } });
      expect(dbToken?.isRevoked).toBe(true);
      expect(dbToken?.revokedAt).not.toBeNull();
    });

    it('should persist lastUsedAt correctly', async () => {
      if (!databaseAvailable) return;

      // Given: Token without lastUsedAt
      const token = await createTestToken();
      await repository.save(token);

      // Verify initial state
      let dbToken = await prisma.serverAccessToken.findUnique({ where: { id: token.id.value } });
      expect(dbToken?.lastUsedAt).toBeNull();

      // When: Record usage and save
      token.recordUsage();
      await repository.save(token);

      // Then: lastUsedAt is set
      dbToken = await prisma.serverAccessToken.findUnique({ where: { id: token.id.value } });
      expect(dbToken?.lastUsedAt).not.toBeNull();
    });
  });

  // ========================================
  // AC3: FINDBYID() METHOD
  // ========================================

  describe('AC3: findById() Method', () => {
    it('should return aggregate with correct data', async () => {
      if (!databaseAvailable) return;

      // Given: Saved token
      const token = await createTestToken({ name: 'Find Me Token' });
      await repository.save(token);

      // When: Find by ID
      const result = await repository.findById(token.id);

      // Then: Returns correct aggregate
      expect(result.isSuccess).toBe(true);
      const found = result.value;
      expect(found).not.toBeNull();
      expect(found!.id.value).toBe(token.id.value);
      expect(found!.name).toBe('Find Me Token');
    });

    it('should return null when not found', async () => {
      if (!databaseAvailable) return;

      // Given: Non-existing ID
      const fakeIdResult = AccessTokenId.create();
      expect(fakeIdResult.isSuccess).toBe(true);
      const fakeId = fakeIdResult.value!;

      // When: Find by ID
      const result = await repository.findById(fakeId);

      // Then: Returns success with null (NOT error!)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
    });
  });

  // ========================================
  // AC4: FINDBYTOKENHASH() METHOD
  // ========================================

  describe('AC4: findByTokenHash() Method', () => {
    it('should return aggregate when hash matches', async () => {
      if (!databaseAvailable) return;

      // Given: Saved token
      const token = await createTestToken({ name: 'Hash Search Token' });
      await repository.save(token);

      // When: Find by token hash
      const result = await repository.findByTokenHash(token.tokenHash);

      // Then: Returns correct aggregate
      expect(result.isSuccess).toBe(true);
      const found = result.value;
      expect(found).not.toBeNull();
      expect(found!.id.value).toBe(token.id.value);
      expect(found!.name).toBe('Hash Search Token');
    });

    it('should return null when hash not found', async () => {
      if (!databaseAvailable) return;

      // Given: Non-existing hash
      const randomHash = await generateTestHash('non-existent-token');
      const tokenHashResult = TokenHash.create(randomHash);
      expect(tokenHashResult.isSuccess).toBe(true);

      // When: Find by hash
      const result = await repository.findByTokenHash(tokenHashResult.value!);

      // Then: Returns success with null
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
    });
  });

  // ========================================
  // AC5: FINDALLACTIVE() METHOD
  // ========================================

  describe('AC5: findAllActive() Method', () => {
    it('should return only non-revoked tokens', async () => {
      if (!databaseAvailable) return;

      // Given: 2 active tokens + 1 revoked
      const activeToken1 = await createTestToken({ name: 'Active 1' });
      const activeToken2 = await createTestToken({ name: 'Active 2' });
      const revokedToken = await createTestToken({ name: 'Revoked' });
      revokedToken.revoke();

      await repository.save(activeToken1);
      await repository.save(activeToken2);
      await repository.save(revokedToken);

      // When: Find all active
      const result = await repository.findAllActive();

      // Then: Returns only 2 active tokens
      expect(result.isSuccess).toBe(true);
      const active = result.value!;
      expect(active.length).toBe(2);
      expect(active.some((t) => t.id.value === activeToken1.id.value)).toBe(true);
      expect(active.some((t) => t.id.value === activeToken2.id.value)).toBe(true);
      expect(active.some((t) => t.id.value === revokedToken.id.value)).toBe(false);
    });

    it('should exclude expired tokens', async () => {
      if (!databaseAvailable) return;

      // Given: 1 active token + 1 expired token
      const activeToken = await createTestToken({ name: 'Active' });
      const expiredToken = await createTestToken({
        name: 'Expired',
        expiresAt: new Date(Date.now() - 1000), // 1 second in the past
      });

      await repository.save(activeToken);
      await repository.save(expiredToken);

      // When: Find all active
      const result = await repository.findAllActive();

      // Then: Returns only 1 active token
      expect(result.isSuccess).toBe(true);
      const active = result.value!;
      expect(active.length).toBe(1);
      expect(active[0].id.value).toBe(activeToken.id.value);
    });

    it('should return empty array when no active tokens', async () => {
      if (!databaseAvailable) return;

      // Given: No tokens (cleanup in afterEach)

      // When: Find all active
      const result = await repository.findAllActive();

      // Then: Returns success with empty array
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
    });
  });

  // ========================================
  // AC6: EXISTSBYTOKENHASH() METHOD
  // ========================================

  describe('AC6: existsByTokenHash() Method', () => {
    it('should return true for existing hash', async () => {
      if (!databaseAvailable) return;

      // Given: Saved token
      const token = await createTestToken();
      await repository.save(token);

      // When: Check existence
      const result = await repository.existsByTokenHash(token.tokenHash);

      // Then: Returns true
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should return false for non-existing hash', async () => {
      if (!databaseAvailable) return;

      // Given: Non-existing hash
      const randomHash = await generateTestHash('non-existent');
      const tokenHashResult = TokenHash.create(randomHash);
      expect(tokenHashResult.isSuccess).toBe(true);

      // When: Check existence
      const result = await repository.existsByTokenHash(tokenHashResult.value!);

      // Then: Returns false
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(false);
    });
  });

  // ========================================
  // AC7: COUNTACTIVE() METHOD
  // ========================================

  describe('AC7: countActive() Method', () => {
    it('should count only active tokens', async () => {
      if (!databaseAvailable) return;

      // Given: 2 active + 1 revoked
      const token1 = await createTestToken();
      const token2 = await createTestToken();
      const revokedToken = await createTestToken();
      revokedToken.revoke();

      await repository.save(token1);
      await repository.save(token2);
      await repository.save(revokedToken);

      // When: Count active
      const result = await repository.countActive();

      // Then: Returns 2
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(2);
    });

    it('should return 0 when no active tokens', async () => {
      if (!databaseAvailable) return;

      // Given: No tokens

      // When: Count active
      const result = await repository.countActive();

      // Then: Returns 0
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(0);
    });
  });

  // ========================================
  // AC8: DELETE() METHOD
  // ========================================

  describe('AC8: delete() Method', () => {
    it('should delete token permanently', async () => {
      if (!databaseAvailable) return;

      // Given: Saved token
      const token = await createTestToken();
      await repository.save(token);

      // Verify it exists
      let count = await prisma.serverAccessToken.count({ where: { id: token.id.value } });
      expect(count).toBe(1);

      // When: Delete
      const result = await repository.delete(token.id);

      // Then: Token is deleted
      expect(result.isSuccess).toBe(true);
      count = await prisma.serverAccessToken.count({ where: { id: token.id.value } });
      expect(count).toBe(0);

      // Remove from tracking (already deleted)
      const index = createdTokenIds.indexOf(token.id.value);
      if (index > -1) createdTokenIds.splice(index, 1);
    });

    it('should fail gracefully when token does not exist', async () => {
      if (!databaseAvailable) return;

      // Given: Non-existing ID
      const fakeIdResult = AccessTokenId.create();
      expect(fakeIdResult.isSuccess).toBe(true);

      // When: Try to delete
      const result = await repository.delete(fakeIdResult.value!);

      // Then: Returns failure (Prisma throws on delete non-existent)
      expect(result.isFailure).toBe(true);
    });
  });

  // ========================================
  // AC9: TRANSACTION SUPPORT
  // ========================================

  describe('AC9: Transaction Support', () => {
    it('should support external transaction (tx parameter)', async () => {
      if (!databaseAvailable) return;

      // Given: Token to save
      const token = await createTestToken({ name: 'TX Token' });

      // When: Save using external transaction
      await prisma.$transaction(async (tx) => {
        await repository.save(token, tx);
      });

      // Then: Data persisted
      const dbToken = await prisma.serverAccessToken.findUnique({ where: { id: token.id.value } });
      expect(dbToken).not.toBeNull();
      expect(dbToken?.name).toBe('TX Token');
    });

    it('should rollback on transaction error', async () => {
      if (!databaseAvailable) return;

      // Given: Token to save
      const token = await createTestToken({ name: 'Rollback Token' });

      // When: Transaction fails after save
      try {
        await prisma.$transaction(async (tx) => {
          await repository.save(token, tx);
          throw new Error('Simulated failure');
        });
      } catch {
        // Expected error
      }

      // Then: Token NOT in database (rollback)
      const count = await prisma.serverAccessToken.count({ where: { id: token.id.value } });
      expect(count).toBe(0);

      // Remove from tracking (was never saved due to rollback)
      const index = createdTokenIds.indexOf(token.id.value);
      if (index > -1) createdTokenIds.splice(index, 1);
    });
  });

  // ========================================
  // ROUND-TRIP TESTS
  // ========================================

  describe('Round-Trip Tests', () => {
    it('should preserve all aggregate data in save + findById round-trip', async () => {
      if (!databaseAvailable) return;

      // Given: Aggregate with all fields populated
      const futureDate = new Date(Date.now() + 86400000); // +1 day
      const token = await createTestToken({
        name: 'Full Data Token äöü ß €',
        expiresAt: futureDate,
      });

      // When: Save + retrieve
      await repository.save(token);
      const result = await repository.findById(token.id);

      // Then: All fields match
      expect(result.isSuccess).toBe(true);
      const retrieved = result.value!;
      expect(retrieved).not.toBeNull();
      expect(retrieved.id.value).toBe(token.id.value);
      expect(retrieved.tokenHash.value).toBe(token.tokenHash.value);
      expect(retrieved.name).toBe('Full Data Token äöü ß €');
      expect(retrieved.expiresAt?.getTime()).toBeCloseTo(futureDate.getTime(), -3); // Within 1 second
      expect(retrieved.isRevoked).toBe(false);
      expect(retrieved.lastUsedAt).toBeNull();
    });

    it('should preserve revoked state in round-trip', async () => {
      if (!databaseAvailable) return;

      // Given: Revoked token
      const token = await createTestToken({ name: 'Revoked Round-Trip' });
      token.revoke();

      // When: Save + retrieve
      await repository.save(token);
      const result = await repository.findById(token.id);

      // Then: Revoked state preserved
      expect(result.isSuccess).toBe(true);
      const retrieved = result.value!;
      expect(retrieved.isRevoked).toBe(true);
      expect(retrieved.revokedAt).not.toBeNull();
    });
  });
});
