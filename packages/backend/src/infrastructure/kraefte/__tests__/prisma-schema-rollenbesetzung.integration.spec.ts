/**
 * Integration Tests für Prisma Schema - EinsatzRollenbesetzung.
 *
 * Diese Tests validieren die Datenbankschema-Constraints:
 * 1. AC2: UNIQUE Constraint auf (einsatzId, rollenDefinitionId) - verhindert doppelte Besetzung
 * 2. AC1: CASCADE Delete - RollenBesetzungen werden mit Einsatz gelöscht
 * 3. AC1: RESTRICT Delete - RollenDefinition/Person können nicht gelöscht werden wenn Besetzungen existieren
 *
 * **Test Strategy:**
 * - Real PostgreSQL Database (NICHT mocked)
 * - Given-When-Then BDD Style
 * - Cleanup mit Triggers disabled (SET session_replication_role = replica)
 * - Test User + Test Einsatz + Test Entities in beforeAll() erstellt
 * - afterEach() cleanup in reverse FK order
 *
 * **AC Coverage:**
 * - AC2: Unique Constraint Enforcement (P2002 Error)
 * - AC1: Cascade Delete Behavior (Einsatz → Besetzungen)
 * - AC1: Restrict Delete Behavior (RollenDefinition/Person)
 * - AC3: Migration Verification (Table + Indexes existieren)
 */

// Mock @paralleldrive/cuid2 BEFORE any imports
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'c';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }),
  isCuid: jest.fn((id: string) => {
    if (typeof id !== 'string') return false;
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-z][a-z0-9]*$/.test(id);
  }),
}));

import { PrismaClient } from '@prisma/client';
import { skipIfNoDatabase } from '@/infrastructure/__tests__/helpers/database-test.helper';

// Generate CUID2-compliant test IDs
const generateTestId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'c';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

describe('Prisma Schema - EinsatzRollenbesetzung Integration Tests', () => {
  let prisma: PrismaClient;
  let testUserId: string;
  let testEinsatzId: string;
  let testRollenDefId: string;
  let testPersonId: string;
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

    // Disable triggers for cleanup
    await prisma.$executeRaw`SET session_replication_role = replica`;

    // Create Test User (für createdBy/updatedBy)
    testUserId = generateTestId();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `test-rollen-besetzung-${Date.now()}@example.com`,
        username: `test-user-${Date.now()}`,
        passwordHash: 'hashed-password-dummy',
        role: 'USER',
      },
    });

    // Create Test Einsatz
    testEinsatzId = generateTestId();
    await prisma.einsatz.create({
      data: {
        id: testEinsatzId,
        nummer: `E-TEST-${Date.now()}`,
        createdBy: testUserId,
        updatedBy: testUserId,
      },
    });

    // Create Test RollenDefinition
    testRollenDefId = generateTestId();
    await prisma.rollenDefinition.create({
      data: {
        id: testRollenDefId,
        name: `Gruppenführer Test ${Date.now()}`,
        beschreibung: 'Test Role',
        createdBy: testUserId,
        updatedBy: testUserId,
      },
    });

    // Create Test EinsatzPerson
    testPersonId = generateTestId();
    await prisma.einsatzPerson.create({
      data: {
        id: testPersonId,
        einsatzId: testEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        dienstgrad: 'FM',
        createdBy: testUserId,
        updatedBy: testUserId,
      },
    });
  });

  afterAll(async () => {
    if (!databaseAvailable || !prisma) {
      return;
    }

    // Cleanup in reverse FK order
    await prisma.einsatzRollenbesetzung.deleteMany({
      where: { einsatzId: testEinsatzId },
    });
    await prisma.einsatzPerson.deleteMany({
      where: { einsatzId: testEinsatzId },
    });
    await prisma.rollenDefinition.deleteMany({
      where: { id: testRollenDefId },
    });
    await prisma.einsatz.deleteMany({ where: { id: testEinsatzId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });

    // Re-enable triggers
    await prisma.$executeRaw`SET session_replication_role = DEFAULT`;

    await prisma.$disconnect();
  });

  afterEach(async () => {
    if (!databaseAvailable || !prisma) {
      return;
    }

    // Cleanup test-specific Besetzungen
    await prisma.einsatzRollenbesetzung.deleteMany({
      where: { einsatzId: testEinsatzId },
    });
  });

  // ========================================
  // AC2: UNIQUE CONSTRAINT TESTS
  // ========================================

  describe('AC2: Unique Constraint on (einsatzId, rollenDefinitionId)', () => {
    it('should enforce unique constraint - prevent duplicate role assignment', async () => {
      if (!databaseAvailable) {
        return;
      }

      // Given: First Besetzung exists
      const firstBesetzung = await prisma.einsatzRollenbesetzung.create({
        data: {
          id: generateTestId(),
          einsatzId: testEinsatzId,
          rollenDefinitionId: testRollenDefId,
          personId: testPersonId,
          createdBy: testUserId,
          updatedBy: testUserId,
        },
      });

      // When: Attempt to assign SAME role to DIFFERENT person in SAME einsatz
      const duplicateAttempt = prisma.einsatzRollenbesetzung.create({
        data: {
          id: generateTestId(),
          einsatzId: firstBesetzung.einsatzId, // ← Same Einsatz
          rollenDefinitionId: firstBesetzung.rollenDefinitionId, // ← Same Rolle
          personId: generateTestId(), // ← Different Person (new ID)
          createdBy: testUserId,
          updatedBy: testUserId,
        },
      });

      // Then: Should throw P2002 Unique Constraint Violation
      await expect(duplicateAttempt).rejects.toThrow();
    });

    it('should allow same person in different roles', async () => {
      if (!databaseAvailable) {
        return;
      }

      // Given: Create second RollenDefinition
      const secondRolleId = generateTestId();
      await prisma.rollenDefinition.create({
        data: {
          id: secondRolleId,
          name: `Maschinist Test ${Date.now()}`,
          beschreibung: 'Test Role 2',
          createdBy: testUserId,
          updatedBy: testUserId,
        },
      });

      // When: Assign DIFFERENT roles to SAME person
      const besetzung1 = await prisma.einsatzRollenbesetzung.create({
        data: {
          id: generateTestId(),
          einsatzId: testEinsatzId,
          rollenDefinitionId: testRollenDefId, // ← Role 1
          personId: testPersonId, // ← Same Person
          createdBy: testUserId,
          updatedBy: testUserId,
        },
      });

      const besetzung2 = await prisma.einsatzRollenbesetzung.create({
        data: {
          id: generateTestId(),
          einsatzId: testEinsatzId,
          rollenDefinitionId: secondRolleId, // ← Role 2
          personId: testPersonId, // ← Same Person
          createdBy: testUserId,
          updatedBy: testUserId,
        },
      });

      // Then: Both assignments should succeed
      expect(besetzung1.id).toBeDefined();
      expect(besetzung2.id).toBeDefined();
      expect(besetzung1.personId).toBe(besetzung2.personId);
      expect(besetzung1.rollenDefinitionId).not.toBe(besetzung2.rollenDefinitionId);

      // Cleanup
      await prisma.einsatzRollenbesetzung.deleteMany({
        where: { id: { in: [besetzung1.id, besetzung2.id] } },
      });
      await prisma.rollenDefinition.deleteMany({
        where: { id: secondRolleId },
      });
    });
  });

  // ========================================
  // AC1: CASCADE DELETE TESTS
  // ========================================

  describe('AC1: Cascade Delete Behavior', () => {
    it('should cascade delete RollenBesetzungen when Einsatz is deleted', async () => {
      if (!databaseAvailable) {
        return;
      }

      // Given: Create temporary Einsatz with Besetzung
      const tempEinsatzId = generateTestId();
      await prisma.einsatz.create({
        data: {
          id: tempEinsatzId,
          nummer: `E-CASCADE-TEST-${Date.now()}`,
          createdBy: testUserId,
          updatedBy: testUserId,
        },
      });

      const besetzungId = generateTestId();
      await prisma.einsatzRollenbesetzung.create({
        data: {
          id: besetzungId,
          einsatzId: tempEinsatzId,
          rollenDefinitionId: testRollenDefId,
          personId: testPersonId,
          createdBy: testUserId,
          updatedBy: testUserId,
        },
      });

      // Verify Besetzung exists
      const besetzungBefore = await prisma.einsatzRollenbesetzung.findUnique({
        where: { id: besetzungId },
      });
      expect(besetzungBefore).not.toBeNull();

      // When: Delete Einsatz
      await prisma.einsatz.delete({ where: { id: tempEinsatzId } });

      // Then: Besetzung should be CASCADE deleted
      const besetzungAfter = await prisma.einsatzRollenbesetzung.findUnique({
        where: { id: besetzungId },
      });
      expect(besetzungAfter).toBeNull();
    });
  });

  // ========================================
  // AC1: RESTRICT DELETE TESTS
  // ========================================

  describe('AC1: Restrict Delete Behavior', () => {
    it('should restrict delete when RollenDefinition has active Besetzungen', async () => {
      if (!databaseAvailable) {
        return;
      }

      // Given: Create temporary RollenDefinition with Besetzung
      const tempRolleId = generateTestId();
      await prisma.rollenDefinition.create({
        data: {
          id: tempRolleId,
          name: `Temp Role ${Date.now()}`,
          beschreibung: 'Temporary',
          createdBy: testUserId,
          updatedBy: testUserId,
        },
      });

      const besetzungId = generateTestId();
      await prisma.einsatzRollenbesetzung.create({
        data: {
          id: besetzungId,
          einsatzId: testEinsatzId,
          rollenDefinitionId: tempRolleId, // ← FK Reference
          personId: testPersonId,
          createdBy: testUserId,
          updatedBy: testUserId,
        },
      });

      // When/Then: Attempt to delete RollenDefinition should fail (P2003 FK Constraint)
      await expect(prisma.rollenDefinition.delete({ where: { id: tempRolleId } })).rejects.toThrow();

      // Cleanup
      await prisma.einsatzRollenbesetzung.deleteMany({
        where: { id: besetzungId },
      });
      await prisma.rollenDefinition.deleteMany({
        where: { id: tempRolleId },
      });
    });

    it('should restrict delete when EinsatzPerson has active Besetzungen', async () => {
      if (!databaseAvailable) {
        return;
      }

      // Given: Create temporary Person with Besetzung
      const tempPersonId = generateTestId();
      await prisma.einsatzPerson.create({
        data: {
          id: tempPersonId,
          einsatzId: testEinsatzId,
          vorname: 'Temp',
          nachname: 'Person',
          dienstgrad: 'FM',
          createdBy: testUserId,
          updatedBy: testUserId,
        },
      });

      const besetzungId = generateTestId();
      await prisma.einsatzRollenbesetzung.create({
        data: {
          id: besetzungId,
          einsatzId: testEinsatzId,
          rollenDefinitionId: testRollenDefId,
          personId: tempPersonId, // ← FK Reference
          createdBy: testUserId,
          updatedBy: testUserId,
        },
      });

      // When/Then: Attempt to delete Person should fail (P2003 FK Constraint)
      await expect(prisma.einsatzPerson.delete({ where: { id: tempPersonId } })).rejects.toThrow();

      // Cleanup
      await prisma.einsatzRollenbesetzung.deleteMany({
        where: { id: besetzungId },
      });
      await prisma.einsatzPerson.deleteMany({
        where: { id: tempPersonId },
      });
    });
  });

  // ========================================
  // AC3: MIGRATION VERIFICATION TESTS
  // ========================================

  describe('AC3: Migration Verification', () => {
    it('should have correct table name in database', async () => {
      if (!databaseAvailable) {
        return;
      }

      // Given/When: Query information_schema
      const result = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name FROM information_schema.tables
        WHERE table_name = 'einsatz_rollen_besetzung'
      `;

      // Then: Table should exist
      expect(result).toHaveLength(1);
      expect(result[0]?.table_name).toBe('einsatz_rollen_besetzung');
    });

    it('should have correct indexes on table', async () => {
      if (!databaseAvailable) {
        return;
      }

      // Given/When: Query pg_indexes
      const indexes = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
        SELECT indexname, indexdef FROM pg_indexes
        WHERE tablename = 'einsatz_rollen_besetzung'
      `;

      // Then: Should have indexes on einsatz_id and person_id
      const indexNames = indexes.map((idx) => idx.indexname.toLowerCase());
      const hasEinsatzIndex = indexNames.some((name) => name.includes('einsatz_id'));
      const hasPersonIndex = indexNames.some((name) => name.includes('person_id'));

      expect(hasEinsatzIndex).toBe(true);
      expect(hasPersonIndex).toBe(true);
    });

    it('should have unique constraint on (einsatz_id, rollen_definition_id)', async () => {
      if (!databaseAvailable) {
        return;
      }

      // Given/When: Query table constraints
      const constraints = await prisma.$queryRaw<Array<{ constraint_name: string; constraint_type: string }>>`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'einsatz_rollen_besetzung'
          AND constraint_type = 'UNIQUE'
      `;

      // Then: Should have UNIQUE constraint
      expect(constraints.length).toBeGreaterThan(0);
      const hasUniqueConstraint = constraints.some((c) => c.constraint_name.includes('einsatz'));
      expect(hasUniqueConstraint).toBe(true);
    });
  });
});
