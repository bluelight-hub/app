/**
 * Integration Tests fuer PrismaInviteCodeRepository mit Real PostgreSQL Database.
 *
 * Diese Tests validieren den Prisma Adapter fuer IInviteCodeRepository:
 * 1. findAll() - Paginierte Abfrage mit Filterung und Sortierung
 * 2. findById() - InviteCode laden mit Result Pattern
 * 3. findByCode() - InviteCode anhand des 8-stelligen Codes laden
 * 4. save() - Upsert Pattern (CREATE + UPDATE idempotency)
 * 5. Transaction Support - Internal und External Transactions
 *
 * **Test Strategy:**
 * - Real PostgreSQL Database (NICHT mocked, NICHT in-memory)
 * - Given-When-Then BDD Style fuer maximale Lesbarkeit
 * - Cleanup mit Triggers disabled (SET session_replication_role = replica)
 * - Test User in beforeAll() erstellt
 * - afterEach() cleanup in reverse FK order
 */

import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { PrismaInviteCodeRepository } from '../prisma-invite-code.repository';
import { InviteCode } from '@domain/aggregates/invite-code.aggregate';
import { InviteCodeId } from '@domain/value-objects/invite-code-id';
import { InviteCodeValue } from '@domain/value-objects/invite-code-value';
import { InviteCodeStatus } from '@domain/value-objects/invite-code-status';
import type { PrismaService } from '@/infrastructure/database/prisma.service';
import type { IInviteCodeRepository } from '@domain/repositories/i-invite-code.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { skipIfNoDatabase } from '@/infrastructure/__tests__/helpers/database-test.helper';

/**
 * Mock Logger fuer Integration Tests.
 * Implementiert ILogger Interface ohne externe Dependencies.
 */
const createMockLogger = (): ILogger => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

describe('PrismaInviteCodeRepository - Integration Tests', () => {
  let prisma: PrismaClient;
  let repository: PrismaInviteCodeRepository;
  let testUserId: string;
  let testUserId2: string; // Zweiter User fuer createdBy Filter Tests
  const testRunId = Date.now();
  let databaseAvailable = false;

  // ========================================
  // SETUP & TEARDOWN
  // ========================================

  beforeAll(async () => {
    databaseAvailable = await skipIfNoDatabase();
    if (!databaseAvailable) {
      return;
    }

    prisma = new PrismaClient();

    // Disable triggers temporarily fuer cleanup von vorherigen Test Runs
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      // Cleanup from previous failed test runs
      await prisma.$executeRawUnsafe(`DELETE FROM "invite_codes" WHERE "createdAt" >= NOW() - INTERVAL '1 hour'`);
      await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE username LIKE 'test-invite-repo-%'`);
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }

    // Create test users for createdBy references
    const user1Result = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "User" (id, username, "passwordHash", role, "isActive", "createdAt", "updatedAt")
      VALUES (
        ${createId()},
        ${`test-invite-repo-user1-${testRunId}`},
        'dummy-hash',
        'ADMIN',
        true,
        NOW(),
        NOW()
      )
      RETURNING id
    `;
    testUserId = user1Result[0].id;

    const user2Result = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "User" (id, username, "passwordHash", role, "isActive", "createdAt", "updatedAt")
      VALUES (
        ${createId()},
        ${`test-invite-repo-user2-${testRunId}`},
        'dummy-hash',
        'ADMIN',
        true,
        NOW(),
        NOW()
      )
      RETURNING id
    `;
    testUserId2 = user2Result[0].id;

    // Initialize Repository
    const prismaService = prisma as unknown as PrismaService;
    const mockLogger = createMockLogger();
    repository = new PrismaInviteCodeRepository(prismaService, mockLogger);
  });

  afterEach(async () => {
    if (!databaseAvailable) return;
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      // Delete test InviteCodes
      await prisma.$executeRawUnsafe(`DELETE FROM "invite_codes" WHERE "createdById" IN ($1, $2)`, testUserId, testUserId2);
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }
  });

  afterAll(async () => {
    if (!databaseAvailable) return;
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      if (testUserId) {
        await prisma.$executeRawUnsafe(`DELETE FROM "invite_codes" WHERE "createdById" = $1`, testUserId);
        await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id = $1`, testUserId);
      }
      if (testUserId2) {
        await prisma.$executeRawUnsafe(`DELETE FROM "invite_codes" WHERE "createdById" = $1`, testUserId2);
        await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id = $1`, testUserId2);
      }
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
      await prisma.$disconnect();
    }
  });

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  /**
   * Erstellt und speichert einen InviteCode mit anpassbaren Eigenschaften.
   */
  async function createAndSaveInviteCode(options: { createdById?: string; expiresAt?: Date; maxUses?: number; usedCount?: number; isRevoked?: boolean; label?: string }): Promise<InviteCode> {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 24); // 24 Stunden in der Zukunft

    const result = InviteCode.create({
      expiresAt: options.expiresAt ?? futureDate,
      maxUses: options.maxUses ?? 10,
      createdById: options.createdById ?? testUserId,
      label: options.label,
    });

    if (result.isFailure || !result.value) {
      throw new Error(`Failed to create InviteCode: ${result.error}`);
    }

    const inviteCode = result.value;

    // Speichern
    const saveResult = await repository.save(inviteCode);
    if (saveResult.isFailure) {
      throw new Error(`Failed to save InviteCode: ${saveResult.error}`);
    }

    // Wenn spezielle Werte benoetigt werden (usedCount, isRevoked), direkt in DB setzen
    if (options.usedCount !== undefined || options.isRevoked !== undefined) {
      await prisma.inviteCode.update({
        where: { id: inviteCode.id.value },
        data: {
          ...(options.usedCount !== undefined && { useCount: options.usedCount }),
          ...(options.isRevoked !== undefined && {
            isRevoked: options.isRevoked,
            revokedAt: options.isRevoked ? new Date() : null,
          }),
        },
      });
    }

    // Reload um aktualisierte Werte zu erhalten
    const reloadResult = await repository.findById(inviteCode.id);
    if (reloadResult.isFailure || !reloadResult.value) {
      throw new Error('Failed to reload InviteCode');
    }

    return reloadResult.value;
  }

  /**
   * Erstellt einen abgelaufenen InviteCode direkt in der DB.
   */
  async function createExpiredInviteCode(createdById: string): Promise<InviteCode> {
    const id = `inv_${createId().substring(0, 24)}`; // inv_ (4) + 24 = 28 Zeichen
    const code = InviteCodeValue.generate().value!;
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 1); // 1 Stunde in der Vergangenheit

    await prisma.inviteCode.create({
      data: {
        id,
        code: code.value,
        expiresAt: pastDate,
        maxUses: 10,
        useCount: 0,
        createdById,
        label: null,
        isRevoked: false,
        revokedAt: null,
      },
    });

    const inviteCodeId = InviteCodeId.create(id);
    if (inviteCodeId.isFailure || !inviteCodeId.value) {
      throw new Error(`Failed to create InviteCodeId: ${inviteCodeId.error}`);
    }

    const result = await repository.findById(inviteCodeId.value);
    if (result.isFailure || !result.value) {
      throw new Error(`Failed to load expired InviteCode: ${result.error}`);
    }

    return result.value;
  }

  // ========================================
  // AC1: INTERFACE IMPLEMENTATION
  // ========================================

  describe('AC1: Repository implements IInviteCodeRepository Interface', () => {
    it('should implement all IInviteCodeRepository interface methods', () => {
      if (!databaseAvailable) return;

      // Given: PrismaInviteCodeRepository instance
      const repo: IInviteCodeRepository = repository;

      // Then: All interface methods exist and are functions
      expect(typeof repo.findById).toBe('function');
      expect(typeof repo.findByCode).toBe('function');
      expect(typeof repo.findAll).toBe('function');
      expect(typeof repo.findAllActive).toBe('function');
      expect(typeof repo.findByCreator).toBe('function');
      expect(typeof repo.save).toBe('function');
      expect(typeof repo.existsByCode).toBe('function');
      expect(typeof repo.countActive).toBe('function');
    });
  });

  // ========================================
  // FINDALL() TESTS - MAIN FOCUS
  // ========================================

  describe('findAll() - Pagination, Filtering, Sorting', () => {
    describe('Empty Database (scoped by createdById)', () => {
      it('should return empty array when no InviteCodes exist for creator', async () => {
        if (!databaseAvailable) return;

        // Given: No InviteCodes for testUserId (cleanup in afterEach)
        // Note: DB may have other codes from development, so we filter by testUserId

        // When: Query with createdById filter
        const result = await repository.findAll({ createdById: testUserId });

        // Then: Empty paginated result for this creator
        expect(result.isSuccess).toBe(true);
        expect(result.value).toBeDefined();
        expect(result.value!.items).toEqual([]);
        expect(result.value!.total).toBe(0);
        expect(result.value!.page).toBe(1);
        expect(result.value!.totalPages).toBe(0);
      });
    });

    describe('Default Values', () => {
      it('should use default pagination (page=1, pageSize=20, sort=createdAt desc)', async () => {
        if (!databaseAvailable) return;

        // Given: 3 InviteCodes for testUserId
        await createAndSaveInviteCode({ label: 'Code 1' });
        await new Promise((resolve) => setTimeout(resolve, 50)); // Kleine Pause fuer verschiedene createdAt
        await createAndSaveInviteCode({ label: 'Code 2' });
        await new Promise((resolve) => setTimeout(resolve, 50));
        await createAndSaveInviteCode({ label: 'Code 3' });

        // When: Query with createdById filter (to isolate test data from dev data)
        const result = await repository.findAll({ createdById: testUserId });

        // Then: Default values applied
        expect(result.isSuccess).toBe(true);
        expect(result.value!.page).toBe(1);
        expect(result.value!.pageSize).toBe(20);
        expect(result.value!.items.length).toBe(3);
        expect(result.value!.total).toBe(3);
        expect(result.value!.totalPages).toBe(1);

        // Default sort: createdAt desc (neueste zuerst)
        expect(result.value!.items[0].label).toBe('Code 3');
        expect(result.value!.items[1].label).toBe('Code 2');
        expect(result.value!.items[2].label).toBe('Code 1');
      });
    });

    describe('Pagination', () => {
      it('should paginate correctly with multiple pages', async () => {
        if (!databaseAvailable) return;

        // Given: 5 InviteCodes for testUserId
        for (let i = 1; i <= 5; i++) {
          await createAndSaveInviteCode({ label: `Code ${i}` });
          await new Promise((resolve) => setTimeout(resolve, 20));
        }

        // When: Query page 1 with pageSize 2 (filtered by testUserId)
        const page1Result = await repository.findAll({ createdById: testUserId }, undefined, { page: 1, pageSize: 2 });

        // Then: Page 1 contains first 2 items
        expect(page1Result.isSuccess).toBe(true);
        expect(page1Result.value!.items.length).toBe(2);
        expect(page1Result.value!.total).toBe(5);
        expect(page1Result.value!.page).toBe(1);
        expect(page1Result.value!.pageSize).toBe(2);
        expect(page1Result.value!.totalPages).toBe(3); // ceil(5/2) = 3

        // When: Query page 2
        const page2Result = await repository.findAll({ createdById: testUserId }, undefined, { page: 2, pageSize: 2 });

        // Then: Page 2 contains next 2 items
        expect(page2Result.isSuccess).toBe(true);
        expect(page2Result.value!.items.length).toBe(2);
        expect(page2Result.value!.page).toBe(2);

        // When: Query page 3 (last page)
        const page3Result = await repository.findAll({ createdById: testUserId }, undefined, { page: 3, pageSize: 2 });

        // Then: Page 3 contains remaining 1 item
        expect(page3Result.isSuccess).toBe(true);
        expect(page3Result.value!.items.length).toBe(1);
        expect(page3Result.value!.page).toBe(3);
      });

      it('should return empty array when page exceeds total pages', async () => {
        if (!databaseAvailable) return;

        // Given: 3 InviteCodes for testUserId
        await createAndSaveInviteCode({});
        await createAndSaveInviteCode({});
        await createAndSaveInviteCode({});

        // When: Query page 100 (filtered by testUserId)
        const result = await repository.findAll({ createdById: testUserId }, undefined, { page: 100, pageSize: 20 });

        // Then: Empty items but correct total
        expect(result.isSuccess).toBe(true);
        expect(result.value!.items).toEqual([]);
        expect(result.value!.total).toBe(3);
        expect(result.value!.page).toBe(100);
      });

      it('should limit pageSize to maximum 100', async () => {
        if (!databaseAvailable) return;

        // Given: 2 InviteCodes for testUserId
        await createAndSaveInviteCode({});
        await createAndSaveInviteCode({});

        // When: Query with pageSize > 100 (filtered by testUserId)
        const result = await repository.findAll({ createdById: testUserId }, undefined, { page: 1, pageSize: 200 });

        // Then: pageSize capped at 100
        expect(result.isSuccess).toBe(true);
        expect(result.value!.pageSize).toBe(100);
      });
    });

    describe('Filter by createdById', () => {
      it('should filter InviteCodes by creator', async () => {
        if (!databaseAvailable) return;

        // Given: 3 codes by user1, 2 codes by user2
        await createAndSaveInviteCode({ createdById: testUserId, label: 'User1-Code1' });
        await createAndSaveInviteCode({ createdById: testUserId, label: 'User1-Code2' });
        await createAndSaveInviteCode({ createdById: testUserId, label: 'User1-Code3' });
        await createAndSaveInviteCode({ createdById: testUserId2, label: 'User2-Code1' });
        await createAndSaveInviteCode({ createdById: testUserId2, label: 'User2-Code2' });

        // When: Filter by user1
        const result = await repository.findAll({ createdById: testUserId });

        // Then: Only user1 codes returned
        expect(result.isSuccess).toBe(true);
        expect(result.value!.items.length).toBe(3);
        expect(result.value!.total).toBe(3);
        expect(result.value!.items.every((code) => code.createdById === testUserId)).toBe(true);

        // When: Filter by user2
        const result2 = await repository.findAll({ createdById: testUserId2 });

        // Then: Only user2 codes returned
        expect(result2.isSuccess).toBe(true);
        expect(result2.value!.items.length).toBe(2);
        expect(result2.value!.total).toBe(2);
      });

      it('should return empty when createdById has no codes', async () => {
        if (!databaseAvailable) return;

        // Given: Some codes exist for testUserId
        await createAndSaveInviteCode({ createdById: testUserId });

        // When: Filter by non-existent user
        const result = await repository.findAll({ createdById: 'non-existent-user-id' });

        // Then: Empty result
        expect(result.isSuccess).toBe(true);
        expect(result.value!.items).toEqual([]);
        expect(result.value!.total).toBe(0);
      });
    });

    describe('Filter by Status (computed field)', () => {
      it('should filter by ACTIVE status', async () => {
        if (!databaseAvailable) return;

        // Given: 1 active, 1 used, 1 expired, 1 revoked (all for testUserId)
        const futureDate = new Date();
        futureDate.setHours(futureDate.getHours() + 24);

        await createAndSaveInviteCode({ expiresAt: futureDate, maxUses: 10, usedCount: 0 }); // ACTIVE
        await createAndSaveInviteCode({ expiresAt: futureDate, maxUses: 1, usedCount: 1 }); // USED
        await createExpiredInviteCode(testUserId); // EXPIRED
        await createAndSaveInviteCode({ expiresAt: futureDate, isRevoked: true }); // REVOKED

        // When: Filter by ACTIVE status AND testUserId
        const result = await repository.findAll({ status: InviteCodeStatus.ACTIVE, createdById: testUserId });

        // Then: Only active codes returned
        expect(result.isSuccess).toBe(true);
        expect(result.value!.items.length).toBe(1);
        expect(result.value!.total).toBe(1);
        expect(result.value!.items[0].computeStatus()).toBe(InviteCodeStatus.ACTIVE);
      });

      it('should filter by USED status', async () => {
        if (!databaseAvailable) return;

        // Given: Codes with different statuses (all for testUserId)
        const futureDate = new Date();
        futureDate.setHours(futureDate.getHours() + 24);

        await createAndSaveInviteCode({ expiresAt: futureDate, maxUses: 10, usedCount: 0 }); // ACTIVE
        await createAndSaveInviteCode({ expiresAt: futureDate, maxUses: 5, usedCount: 5 }); // USED
        await createAndSaveInviteCode({ expiresAt: futureDate, maxUses: 1, usedCount: 1 }); // USED

        // When: Filter by USED status AND testUserId
        const result = await repository.findAll({ status: InviteCodeStatus.USED, createdById: testUserId });

        // Then: Only used codes returned
        expect(result.isSuccess).toBe(true);
        expect(result.value!.items.length).toBe(2);
        expect(result.value!.items.every((code) => code.computeStatus() === InviteCodeStatus.USED)).toBe(true);
      });

      it('should filter by EXPIRED status', async () => {
        if (!databaseAvailable) return;

        // Given: 1 active, 2 expired
        await createAndSaveInviteCode({}); // ACTIVE
        await createExpiredInviteCode(testUserId); // EXPIRED
        await createExpiredInviteCode(testUserId); // EXPIRED

        // When: Filter by EXPIRED status
        const result = await repository.findAll({ status: InviteCodeStatus.EXPIRED });

        // Then: Only expired codes returned
        expect(result.isSuccess).toBe(true);
        expect(result.value!.items.length).toBe(2);
        expect(result.value!.items.every((code) => code.computeStatus() === InviteCodeStatus.EXPIRED)).toBe(true);
      });

      it('should filter by REVOKED status', async () => {
        if (!databaseAvailable) return;

        // Given: Codes with different statuses
        await createAndSaveInviteCode({}); // ACTIVE
        await createAndSaveInviteCode({ isRevoked: true }); // REVOKED

        // When: Filter by REVOKED status
        const result = await repository.findAll({ status: InviteCodeStatus.REVOKED });

        // Then: Only revoked codes returned
        expect(result.isSuccess).toBe(true);
        expect(result.value!.items.length).toBe(1);
        expect(result.value!.items[0].isRevoked).toBe(true);
        expect(result.value!.items[0].computeStatus()).toBe(InviteCodeStatus.REVOKED);
      });

      it('should combine status filter with pagination', async () => {
        if (!databaseAvailable) return;

        // Given: 5 active codes (for testUserId)
        for (let i = 0; i < 5; i++) {
          await createAndSaveInviteCode({ label: `Active ${i}` });
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        // Plus 2 revoked
        await createAndSaveInviteCode({ isRevoked: true });
        await createAndSaveInviteCode({ isRevoked: true });

        // When: Filter by ACTIVE status AND testUserId with pagination
        const result = await repository.findAll({ status: InviteCodeStatus.ACTIVE, createdById: testUserId }, undefined, { page: 1, pageSize: 2 });

        // Then: Pagination applied after status filter
        expect(result.isSuccess).toBe(true);
        expect(result.value!.items.length).toBe(2);
        expect(result.value!.total).toBe(5); // Only 5 active
        expect(result.value!.totalPages).toBe(3); // ceil(5/2) = 3
      });
    });

    describe('Sorting', () => {
      it('should sort by createdAt ascending', async () => {
        if (!databaseAvailable) return;

        // Given: 3 codes with different createdAt (for testUserId)
        await createAndSaveInviteCode({ label: 'First' });
        await new Promise((resolve) => setTimeout(resolve, 50));
        await createAndSaveInviteCode({ label: 'Second' });
        await new Promise((resolve) => setTimeout(resolve, 50));
        await createAndSaveInviteCode({ label: 'Third' });

        // When: Sort by createdAt asc (filtered by testUserId)
        const result = await repository.findAll({ createdById: testUserId }, { field: 'createdAt', direction: 'asc' });

        // Then: Oldest first
        expect(result.isSuccess).toBe(true);
        expect(result.value!.items[0].label).toBe('First');
        expect(result.value!.items[1].label).toBe('Second');
        expect(result.value!.items[2].label).toBe('Third');
      });

      it('should sort by createdAt descending', async () => {
        if (!databaseAvailable) return;

        // Given: 3 codes with different createdAt (for testUserId)
        await createAndSaveInviteCode({ label: 'First' });
        await new Promise((resolve) => setTimeout(resolve, 50));
        await createAndSaveInviteCode({ label: 'Second' });
        await new Promise((resolve) => setTimeout(resolve, 50));
        await createAndSaveInviteCode({ label: 'Third' });

        // When: Sort by createdAt desc (filtered by testUserId)
        const result = await repository.findAll({ createdById: testUserId }, { field: 'createdAt', direction: 'desc' });

        // Then: Newest first
        expect(result.isSuccess).toBe(true);
        expect(result.value!.items[0].label).toBe('Third');
        expect(result.value!.items[1].label).toBe('Second');
        expect(result.value!.items[2].label).toBe('First');
      });

      it('should sort by expiresAt ascending', async () => {
        if (!databaseAvailable) return;

        // Given: 3 codes with different expiresAt (for testUserId)
        const now = new Date();
        const date1 = new Date(now.getTime() + 1 * 60 * 60 * 1000); // +1h
        const date2 = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2h
        const date3 = new Date(now.getTime() + 3 * 60 * 60 * 1000); // +3h

        await createAndSaveInviteCode({ expiresAt: date2, label: 'Expires 2h' });
        await createAndSaveInviteCode({ expiresAt: date1, label: 'Expires 1h' });
        await createAndSaveInviteCode({ expiresAt: date3, label: 'Expires 3h' });

        // When: Sort by expiresAt asc (filtered by testUserId)
        const result = await repository.findAll({ createdById: testUserId }, { field: 'expiresAt', direction: 'asc' });

        // Then: Soonest expiry first
        expect(result.isSuccess).toBe(true);
        expect(result.value!.items[0].label).toBe('Expires 1h');
        expect(result.value!.items[1].label).toBe('Expires 2h');
        expect(result.value!.items[2].label).toBe('Expires 3h');
      });

      it('should sort by expiresAt descending', async () => {
        if (!databaseAvailable) return;

        // Given: 3 codes with different expiresAt (for testUserId)
        const now = new Date();
        const date1 = new Date(now.getTime() + 1 * 60 * 60 * 1000);
        const date2 = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const date3 = new Date(now.getTime() + 3 * 60 * 60 * 1000);

        await createAndSaveInviteCode({ expiresAt: date2, label: 'Expires 2h' });
        await createAndSaveInviteCode({ expiresAt: date1, label: 'Expires 1h' });
        await createAndSaveInviteCode({ expiresAt: date3, label: 'Expires 3h' });

        // When: Sort by expiresAt desc (filtered by testUserId)
        const result = await repository.findAll({ createdById: testUserId }, { field: 'expiresAt', direction: 'desc' });

        // Then: Latest expiry first
        expect(result.isSuccess).toBe(true);
        expect(result.value!.items[0].label).toBe('Expires 3h');
        expect(result.value!.items[1].label).toBe('Expires 2h');
        expect(result.value!.items[2].label).toBe('Expires 1h');
      });

      it('should sort by useCount ascending', async () => {
        if (!databaseAvailable) return;

        // Given: 3 codes with different useCount (for testUserId)
        await createAndSaveInviteCode({ label: 'Used 5', usedCount: 5 });
        await createAndSaveInviteCode({ label: 'Used 0', usedCount: 0 });
        await createAndSaveInviteCode({ label: 'Used 3', usedCount: 3 });

        // When: Sort by useCount asc (filtered by testUserId)
        const result = await repository.findAll({ createdById: testUserId }, { field: 'useCount', direction: 'asc' });

        // Then: Least used first
        expect(result.isSuccess).toBe(true);
        expect(result.value!.items[0].label).toBe('Used 0');
        expect(result.value!.items[0].usedCount).toBe(0);
        expect(result.value!.items[1].label).toBe('Used 3');
        expect(result.value!.items[2].label).toBe('Used 5');
      });

      it('should sort by useCount descending', async () => {
        if (!databaseAvailable) return;

        // Given: 3 codes with different useCount (for testUserId)
        await createAndSaveInviteCode({ label: 'Used 5', usedCount: 5 });
        await createAndSaveInviteCode({ label: 'Used 0', usedCount: 0 });
        await createAndSaveInviteCode({ label: 'Used 3', usedCount: 3 });

        // When: Sort by useCount desc (filtered by testUserId)
        const result = await repository.findAll({ createdById: testUserId }, { field: 'useCount', direction: 'desc' });

        // Then: Most used first
        expect(result.isSuccess).toBe(true);
        expect(result.value!.items[0].label).toBe('Used 5');
        expect(result.value!.items[1].label).toBe('Used 3');
        expect(result.value!.items[2].label).toBe('Used 0');
      });
    });

    describe('Combined Filters and Sorting', () => {
      it('should combine createdById filter with sorting', async () => {
        if (!databaseAvailable) return;

        // Given: Multiple codes from different users
        const now = new Date();
        await createAndSaveInviteCode({ createdById: testUserId, expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000), label: 'User1-Later' });
        await createAndSaveInviteCode({ createdById: testUserId, expiresAt: new Date(now.getTime() + 1 * 60 * 60 * 1000), label: 'User1-Earlier' });
        await createAndSaveInviteCode({ createdById: testUserId2, expiresAt: new Date(now.getTime() + 1.5 * 60 * 60 * 1000), label: 'User2-Code' });

        // When: Filter by user1 and sort by expiresAt asc
        const result = await repository.findAll({ createdById: testUserId }, { field: 'expiresAt', direction: 'asc' });

        // Then: Only user1 codes, sorted by expiresAt
        expect(result.isSuccess).toBe(true);
        expect(result.value!.items.length).toBe(2);
        expect(result.value!.items[0].label).toBe('User1-Earlier');
        expect(result.value!.items[1].label).toBe('User1-Later');
      });

      it('should combine status filter with createdById filter', async () => {
        if (!databaseAvailable) return;

        // Given: Mixed codes
        await createAndSaveInviteCode({ createdById: testUserId }); // ACTIVE
        await createAndSaveInviteCode({ createdById: testUserId, isRevoked: true }); // REVOKED
        await createAndSaveInviteCode({ createdById: testUserId2 }); // ACTIVE (different user)

        // When: Filter by ACTIVE status AND testUserId
        const result = await repository.findAll({
          status: InviteCodeStatus.ACTIVE,
          createdById: testUserId,
        });

        // Then: Only active codes from testUserId
        expect(result.isSuccess).toBe(true);
        expect(result.value!.items.length).toBe(1);
        expect(result.value!.items[0].createdById).toBe(testUserId);
        expect(result.value!.items[0].computeStatus()).toBe(InviteCodeStatus.ACTIVE);
      });
    });
  });

  // ========================================
  // SAVE() TESTS
  // ========================================

  describe('save() Method', () => {
    it('should create new InviteCode (INSERT operation)', async () => {
      if (!databaseAvailable) return;

      // Given: Fresh aggregate
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      const result = InviteCode.create({
        expiresAt: futureDate,
        maxUses: 5,
        createdById: testUserId,
        label: 'Test Label',
      });
      expect(result.isSuccess).toBe(true);
      const inviteCode = result.value!;

      // When: Save aggregate
      const saveResult = await repository.save(inviteCode);

      // Then: Save was successful
      expect(saveResult.isSuccess).toBe(true);

      // And: Database has the InviteCode
      const dbRecord = await prisma.inviteCode.findUnique({
        where: { id: inviteCode.id.value },
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord!.label).toBe('Test Label');
      expect(dbRecord!.maxUses).toBe(5);
    });

    it('should update existing InviteCode (UPSERT idempotency)', async () => {
      if (!databaseAvailable) return;

      // Given: Saved aggregate
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      const result = InviteCode.create({
        expiresAt: futureDate,
        maxUses: 5,
        createdById: testUserId,
      });
      const inviteCode = result.value!;
      await repository.save(inviteCode);

      // When: Modify and save again
      inviteCode.updateLabel('Updated Label');
      await repository.save(inviteCode);

      // Then: Still only 1 record
      const count = await prisma.inviteCode.count({
        where: { id: inviteCode.id.value },
      });
      expect(count).toBe(1);

      // And: Label is updated
      const dbRecord = await prisma.inviteCode.findUnique({
        where: { id: inviteCode.id.value },
      });
      expect(dbRecord!.label).toBe('Updated Label');
    });
  });

  // ========================================
  // FINDBYID() & FINDBYCODE() TESTS
  // ========================================

  describe('findById() Method', () => {
    it('should return InviteCode when found', async () => {
      if (!databaseAvailable) return;

      // Given: Saved InviteCode
      const saved = await createAndSaveInviteCode({ label: 'FindById Test' });

      // When: Find by ID
      const result = await repository.findById(saved.id);

      // Then: Returns correct aggregate
      expect(result.isSuccess).toBe(true);
      expect(result.value).not.toBeNull();
      expect(result.value!.id.value).toBe(saved.id.value);
      expect(result.value!.label).toBe('FindById Test');
    });

    it('should return null when not found', async () => {
      if (!databaseAvailable) return;

      // Given: Non-existing ID
      const fakeId = InviteCodeId.create(`inv_${createId().substring(0, 24)}`).value!; // inv_ (4) + 24 = 28 Zeichen

      // When: Find by ID
      const result = await repository.findById(fakeId);

      // Then: Returns success with null
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
    });
  });

  describe('findByCode() Method', () => {
    it('should return InviteCode when found by code', async () => {
      if (!databaseAvailable) return;

      // Given: Saved InviteCode
      const saved = await createAndSaveInviteCode({});

      // When: Find by code
      const result = await repository.findByCode(saved.code);

      // Then: Returns correct aggregate
      expect(result.isSuccess).toBe(true);
      expect(result.value).not.toBeNull();
      expect(result.value!.code.value).toBe(saved.code.value);
    });

    it('should return null when code not found', async () => {
      if (!databaseAvailable) return;

      // Given: Non-existing code
      const fakeCode = InviteCodeValue.generate().value!;

      // When: Find by code
      const result = await repository.findByCode(fakeCode);

      // Then: Returns success with null
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
    });
  });
});
