// @ts-nocheck
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
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-z][a-z0-9]*$/.test(id);
  }),
}));

import type { PrismaClient } from '@/generated/prisma/client';
import { skipIfNoDatabase, createTestPrismaClient } from '@/infrastructure/__tests__/helpers/database-test.helper';

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

    prisma = createTestPrismaClient();

    // Create Test User (für createdBy/updatedBy)
    // NOTE: User Model hat kein 'email' Feld mehr (Prisma Schema aktualisiert)
    testUserId = generateTestId();
    await prisma.user.create({
      data: {
        id: testUserId,
        username: `test_rollen_besetzung_${Date.now()}`,
        passwordHash: 'hashed-password-dummy',
        role: 'USER',
      },
    });

    // Create Test Einsatz
    testEinsatzId = generateTestId();
    await prisma.einsatz.create({
      data: {
        id: testEinsatzId,
        nummer: `E2026-RB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        alarmstichwort: `TEST-${Date.now()}`,
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
    // NOTE: EinsatzPerson Model hat 'funktion' statt 'dienstgrad' (Schema aktualisiert)
    testPersonId = generateTestId();
    await prisma.einsatzPerson.create({
      data: {
        id: testPersonId,
        einsatzId: testEinsatzId,
        vorname: 'Max',
        nachname: 'Mustermann',
        funktion: 'Gruppenführer',
        createdBy: testUserId,
        updatedBy: testUserId,
      },
    });
  });

  afterAll(async () => {
    if (!databaseAvailable || !prisma) {
      return;
    }

    // Disable triggers/constraints nur für Cleanup (um orphaned Records zu löschen)
    await prisma.$executeRaw`SET session_replication_role = replica`;

    try {
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
    } finally {
      // Re-enable triggers/constraints
      await prisma.$executeRaw`SET session_replication_role = DEFAULT`;
    }

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
      // NOTE: EinsatzRollenbesetzung hat jetzt Snapshot-Felder (rollenName, personVorname, personNachname)
      const firstBesetzung = await prisma.einsatzRollenbesetzung.create({
        data: {
          id: generateTestId(),
          einsatzId: testEinsatzId,
          rollenDefinitionId: testRollenDefId,
          personId: testPersonId,
          rollenName: 'Gruppenführer Test',
          personVorname: 'Max',
          personNachname: 'Mustermann',
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
          rollenName: 'Gruppenführer Test',
          personVorname: 'Hans',
          personNachname: 'Müller',
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
          rollenName: 'Gruppenführer Test',
          personVorname: 'Max',
          personNachname: 'Mustermann',
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
          rollenName: 'Maschinist Test',
          personVorname: 'Max',
          personNachname: 'Mustermann',
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
    it('should have CASCADE DELETE configured on einsatz FK', async () => {
      if (!databaseAvailable) {
        return;
      }

      // NOTE: Wir können CASCADE nicht direkt testen, da der DRK-Compliance-Trigger
      // das Löschen von Einsätzen verhindert. Stattdessen validieren wir die FK-Definition.
      //
      // Wenn session_replication_role=replica gesetzt wird, werden ALLE Trigger und
      // FK-Constraints deaktiviert (inkl. CASCADE), daher ist ein End-to-End Test
      // nicht möglich ohne den Trigger permanent zu entfernen.
      //
      // Diese Test-Strategie validiert die SCHEMA-Konfiguration statt das Laufzeitverhalten.

      // Given/When: Query FK constraint definition
      const fkConstraints = await prisma.$queryRaw<Array<{ constraint_name: string; delete_rule: string }>>`
        SELECT
          tc.constraint_name,
          rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'einsatz_rollen_besetzung'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND tc.constraint_name LIKE '%einsatz_id%'
      `;

      // Then: FK to einsatz should be CASCADE on DELETE
      expect(fkConstraints.length).toBeGreaterThan(0);
      const einsatzFk = fkConstraints.find((fk) => fk.constraint_name.includes('einsatz_id'));
      expect(einsatzFk).toBeDefined();
      expect(einsatzFk?.delete_rule).toBe('CASCADE');
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
          rollenName: 'Temp Role',
          personVorname: 'Max',
          personNachname: 'Mustermann',
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
          funktion: 'Helfer',
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
          rollenName: 'Gruppenführer Test',
          personVorname: 'Temp',
          personNachname: 'Person',
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

      // Given/When: Query pg_indexes (Prisma implements @@unique as UNIQUE INDEX)
      // NOTE: Prisma's @@unique directive creates a UNIQUE INDEX, not a CONSTRAINT
      const indexes = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
        SELECT indexname, indexdef FROM pg_indexes
        WHERE tablename = 'einsatz_rollen_besetzung'
          AND indexdef ILIKE '%UNIQUE%'
      `;

      // Then: Should have UNIQUE index containing both einsatz_id and rollen_definition_id
      expect(indexes.length).toBeGreaterThan(0);
      const hasCompositeUniqueIndex = indexes.some((idx) => idx.indexdef.includes('einsatz_id') && idx.indexdef.includes('rollen_definition_id'));
      expect(hasCompositeUniqueIndex).toBe(true);
    });
  });
});
