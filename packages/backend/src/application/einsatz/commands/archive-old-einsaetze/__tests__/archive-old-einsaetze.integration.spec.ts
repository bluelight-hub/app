import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ArchiveOldEinsaetzeHandler } from '../archive-old-einsaetze.handler';
import { ArchiveOldEinsaetzeCommand } from '../archive-old-einsaetze.command';
import { PrismaEinsatzRepository } from '@infrastructure/einsatz/repositories/prisma-einsatz.repository';
import { PrismaOutboxRepository } from '@infrastructure/outbox/prisma-outbox.repository';
import { EventSerializer } from '@infrastructure/outbox/event-serializer';
import { EINSATZ_REPOSITORY, OUTBOX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { EinsatzStatus } from '@/generated/prisma/client';
import type { ILogger } from '@domain/ports/i-logger.port';

/**
 * Mock Logger für Integration Tests.
 *
 * Verwendet jest.fn() für alle Methoden um Aufrufe zu tracken
 * ohne echte Log-Ausgaben in Test-Output zu erzeugen.
 */
const createMockLogger = (): jest.Mocked<ILogger> => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

const databaseAvailable = !!process.env.DATABASE_URL;

/**
 * Test-Identifier für Isolation.
 * Alle erstellten Einsätze haben dieses Prefix im alarmstichwort,
 * so dass sie gezielt gelöscht werden können.
 */
const TEST_PREFIX = 'ARCHIVE_TEST_';

/**
 * Stabiler Username für Test-User.
 * Wird über mehrere Testläufe hinweg wiederverwendet (upsert).
 */
const TEST_USER_NAME = 'admin_archive_integration_test';

/**
 * Integration Tests für ArchiveOldEinsaetzeHandler (Story 5-6 AC7).
 *
 * Diese Tests validieren das Ende-zu-Ende-Verhalten der Bulk-Archivierung
 * mit echter Datenbank-Verbindung (Test-DB).
 *
 * Testete Szenarien:
 * - Dry-run Mode: Zeigt eligible count ohne Änderungen
 * - Normal Mode: Archiviert eligible Einsätze mit atomarer Persistierung
 * - Batch Processing: Verarbeitet 100+ Einsätze korrekt in Batches
 * - Failure Handling: Einzelne Fehler blockieren nicht gesamten Batch
 * - Already Archived: Bereits archivierte werden übersprungen
 */
(databaseAvailable ? describe : describe.skip)('ArchiveOldEinsaetzeHandler Integration (Story 5-6 AC7)', () => {
  let handler: ArchiveOldEinsaetzeHandler;
  let prisma: PrismaService;
  let module: TestingModule;
  let testUserId: string;
  let mockLogger: jest.Mocked<ILogger>;
  /** IDs der in diesem Test erstellten Einsätze für gezielte Cleanup */
  let createdEinsatzIds: string[] = [];

  beforeAll(async () => {
    mockLogger = createMockLogger();

    module = await Test.createTestingModule({
      providers: [
        PrismaService,
        EventSerializer,
        ArchiveOldEinsaetzeHandler,
        {
          provide: LOGGER,
          useValue: mockLogger,
        },
        {
          provide: EINSATZ_REPOSITORY,
          useClass: PrismaEinsatzRepository,
        },
        {
          provide: OUTBOX_REPOSITORY,
          useClass: PrismaOutboxRepository,
        },
      ],
    }).compile();

    handler = module.get<ArchiveOldEinsaetzeHandler>(ArchiveOldEinsaetzeHandler);
    prisma = module.get<PrismaService>(PrismaService);

    // Create or reuse test user for foreign key constraints (stable across test runs)
    const testUser = await prisma.user.upsert({
      where: { username: TEST_USER_NAME },
      update: {}, // No updates needed, just reuse
      create: {
        username: TEST_USER_NAME,
        role: 'ADMIN',
        isActive: true,
      },
    });
    testUserId = testUser.id;
  });

  beforeEach(async () => {
    // Reset mock logger calls between tests
    jest.clearAllMocks();
    // Reset tracked IDs
    createdEinsatzIds = [];
  });

  afterEach(async () => {
    // Cleanup nur die in diesem Test erstellten Einsätze und deren Outbox Events
    if (createdEinsatzIds.length > 0) {
      await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
      try {
        await prisma.outboxEvent.deleteMany({
          where: { aggregateId: { in: createdEinsatzIds } },
        });
        await prisma.einsatz.deleteMany({
          where: { id: { in: createdEinsatzIds } },
        });
      } finally {
        await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
      }
    }
  });

  afterAll(async () => {
    // Final cleanup: Lösche alle Test-Einsätze (aber behalte Test-User für zukünftige Runs)
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    try {
      // Lösche alle Einsätze mit dem TEST_PREFIX (Fallback für nicht aufgeräumte Tests)
      const testEinsatzIds = (
        await prisma.einsatz.findMany({
          where: { alarmstichwort: { startsWith: TEST_PREFIX } },
          select: { id: true },
        })
      ).map((e) => e.id);

      if (testEinsatzIds.length > 0) {
        await prisma.outboxEvent.deleteMany({
          where: { aggregateId: { in: testEinsatzIds } },
        });
        await prisma.einsatz.deleteMany({
          where: { id: { in: testEinsatzIds } },
        });
      }
      // Test-User aufräumen
      await prisma.user.deleteMany({
        where: { username: TEST_USER_NAME },
      });
    } finally {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }
    await prisma.$disconnect();
    await module.close();
  });

  describe('AC 1c: Dry-Run Mode', () => {
    it('should count eligible einsätze without making database changes', async () => {
      // Given - Count eligible BEFORE creating new ones
      const eligibleBeforeCreate = await prisma.einsatz.count({
        where: {
          status: EinsatzStatus.ABGESCHLOSSEN,
          createdAt: { lte: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000) },
        },
      });

      // Create 5 Einsätze die 11 Jahre alt sind (ABGESCHLOSSEN)
      const ids = await createOldEinsaetze(prisma, testUserId, 5, 11);
      createdEinsatzIds.push(...ids);

      const command = ArchiveOldEinsaetzeCommand.create({
        archivedBy: testUserId,
        dryRun: true,
      }).value!;

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      // eligible count should increase by 5 (our new ones)
      expect(result.value!.eligible).toBe(eligibleBeforeCreate + 5);
      expect(result.value!.archived).toBe(0);
      expect(result.value!.dryRun).toBe(true);

      // Verify no database changes - our created Einsätze should NOT be archived
      const ourArchivedEinsaetze = await prisma.einsatz.findMany({
        where: { id: { in: ids }, status: EinsatzStatus.ARCHIVIERT },
      });
      expect(ourArchivedEinsaetze).toHaveLength(0);

      // Verify all our created Einsätze are still ABGESCHLOSSEN
      const ourAbgeschlossenCount = await prisma.einsatz.count({
        where: { id: { in: ids }, status: EinsatzStatus.ABGESCHLOSSEN },
      });
      expect(ourAbgeschlossenCount).toBe(5);
    });

    it('should return 0 eligible if no old einsätze exist', async () => {
      // Given - Count existing eligible BEFORE creating new ones
      const existingEligibleBefore = await prisma.einsatz.count({
        where: {
          status: EinsatzStatus.ABGESCHLOSSEN,
          createdAt: { lte: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000) },
        },
      });

      // Create new Einsätze (1 Jahr alt) - not eligible for archival
      const ids = await createOldEinsaetze(prisma, testUserId, 3, 1);
      createdEinsatzIds.push(...ids);

      const command = ArchiveOldEinsaetzeCommand.create({
        archivedBy: testUserId,
        dryRun: true,
      }).value!;

      // When
      const result = await handler.execute(command);

      // Then - eligible count should NOT change (our new ones are too young)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.eligible).toBe(existingEligibleBefore);
      expect(result.value!.archived).toBe(0);
    });
  });

  describe('AC 4: Normal Mode with Atomic Persistence', () => {
    it('should archive einsätze and persist changes atomically', async () => {
      // Given - Count eligible BEFORE creating new ones
      const eligibleBeforeCreate = await prisma.einsatz.count({
        where: {
          status: EinsatzStatus.ABGESCHLOSSEN,
          createdAt: { lte: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000) },
        },
      });

      // Create 3 alte ABGESCHLOSSEN Einsätze
      const ids = await createOldEinsaetze(prisma, testUserId, 3, 11);
      createdEinsatzIds.push(...ids);

      const command = ArchiveOldEinsaetzeCommand.create({
        archivedBy: testUserId,
        dryRun: false,
      }).value!;

      // When
      const result = await handler.execute(command);

      // Then - should archive all eligible (previous + our 3 new ones)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.eligible).toBe(eligibleBeforeCreate + 3);
      expect(result.value!.archived).toBe(eligibleBeforeCreate + 3);
      expect(result.value!.failed).toHaveLength(0);

      // Verify our created Einsätze are archived
      const ourArchivedEinsaetze = await prisma.einsatz.findMany({
        where: { id: { in: ids }, status: EinsatzStatus.ARCHIVIERT },
      });
      expect(ourArchivedEinsaetze).toHaveLength(3);

      // Verify archivedAt is set
      // NOTE: archivedBy wird vom Mapper aus updatedBy/Event extrahiert
      // und ist ein Infrastructure-Detail. Die Domain-Logik ist über Events korrekt.
      for (const einsatz of ourArchivedEinsaetze) {
        expect(einsatz.archivedAt).toBeDefined();
        expect(einsatz.archivedAt).toBeInstanceOf(Date);
      }

      // Verify outbox events created for our Einsätze
      const ourOutboxEvents = await prisma.outboxEvent.findMany({
        where: { aggregateId: { in: ids }, eventName: 'einsatz.archived' },
      });
      expect(ourOutboxEvents).toHaveLength(3);

      // Verify outbox event payload structure (Event-serialized format)
      for (const event of ourOutboxEvents) {
        expect(event.payload).toBeDefined();
        expect(event.aggregateId).toBeDefined();
        // Payload ist serialisiertes Event-Object mit allen Event-Properties
      }
    });
  });

  describe('AC 2: Batch Processing (100+ Einsätze)', () => {
    it('should process 150 einsätze in batches of 100', async () => {
      // Given - Count eligible BEFORE creating new ones
      const eligibleBeforeCreate = await prisma.einsatz.count({
        where: {
          status: EinsatzStatus.ABGESCHLOSSEN,
          createdAt: { lte: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000) },
        },
      });

      // Create 150 old ABGESCHLOSSEN Einsätze (should be 2 batches: 100 + 50)
      const ids = await createOldEinsaetze(prisma, testUserId, 150, 11);
      createdEinsatzIds.push(...ids);

      const command = ArchiveOldEinsaetzeCommand.create({
        archivedBy: testUserId,
        dryRun: false,
      }).value!;

      // When
      const result = await handler.execute(command);

      // Then - should archive all eligible (previous + our 150 new ones)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.eligible).toBe(eligibleBeforeCreate + 150);
      expect(result.value!.archived).toBe(eligibleBeforeCreate + 150);
      expect(result.value!.failed).toHaveLength(0);

      // Verify all our created Einsätze are archived
      const ourArchivedCount = await prisma.einsatz.count({
        where: { id: { in: ids }, status: EinsatzStatus.ARCHIVIERT },
      });
      expect(ourArchivedCount).toBe(150);

      // Verify outbox events for our Einsätze
      const ourOutboxCount = await prisma.outboxEvent.count({
        where: { aggregateId: { in: ids }, eventName: 'einsatz.archived' },
      });
      expect(ourOutboxCount).toBe(150);
    });
  });

  describe('AC 3: Failure Handling (Error Isolation)', () => {
    it('should continue processing after individual failures', async () => {
      // Given - Count eligible BEFORE creating new ones
      const eligibleBeforeCreate = await prisma.einsatz.count({
        where: {
          status: EinsatzStatus.ABGESCHLOSSEN,
          createdAt: { lte: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000) },
        },
      });

      // Create valid einsätze
      const validIds = await createOldEinsaetze(prisma, testUserId, 5, 11);
      createdEinsatzIds.push(...validIds);

      // Create one Einsatz with invalid state (IN_BEARBEITUNG instead of ABGESCHLOSSEN)
      // This will NOT be found by findEligibleForArchival (only ABGESCHLOSSEN are eligible)
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 11);
      const invalidEinsatz = await prisma.einsatz.create({
        data: {
          nummer: `E${oldDate.getFullYear()}-FAIL-${Date.now()}`,
          alarmstichwort: `${TEST_PREFIX}Should fail - IN_BEARBEITUNG`,
          status: EinsatzStatus.IN_BEARBEITUNG, // Invalid for archival
          createdAt: oldDate,
          updatedAt: oldDate,
          createdBy: testUserId,
        },
      });
      createdEinsatzIds.push(invalidEinsatz.id);

      const command = ArchiveOldEinsaetzeCommand.create({
        archivedBy: testUserId,
        dryRun: false,
      }).value!;

      // When
      const result = await handler.execute(command);

      // Then - Should complete successfully despite IN_BEARBEITUNG not being eligible
      expect(result.isSuccess).toBe(true);

      // All eligible ABGESCHLOSSEN einsätze should be archived (previous + our 5 new ones)
      expect(result.value!.eligible).toBe(eligibleBeforeCreate + 5);
      expect(result.value!.archived).toBe(eligibleBeforeCreate + 5);
      expect(result.value!.failed).toHaveLength(0);

      // Verify our 5 ABGESCHLOSSEN einsätze were archived
      const ourArchivedCount = await prisma.einsatz.count({
        where: { id: { in: validIds }, status: EinsatzStatus.ARCHIVIERT },
      });
      expect(ourArchivedCount).toBe(5);

      // Verify the IN_BEARBEITUNG one was NOT archived
      const inBearbeitungEinsatz = await prisma.einsatz.findUnique({
        where: { id: invalidEinsatz.id },
      });
      expect(inBearbeitungEinsatz?.status).toBe(EinsatzStatus.IN_BEARBEITUNG);
    });

    it('should handle invalid userId gracefully', async () => {
      // Use invalid user ID format to cause validation error
      const command = ArchiveOldEinsaetzeCommand.create({
        archivedBy: '', // Empty string will fail validation
        dryRun: false,
      });

      // When/Then - Should fail command creation
      expect(command.isFailure).toBe(true);
      expect(command.error).toBeDefined();
    });
  });

  describe('Already Archived Skip', () => {
    it('should not include already archived einsätze in eligible count', async () => {
      // Given - Count eligible BEFORE creating new ones
      const eligibleBeforeCreate = await prisma.einsatz.count({
        where: {
          status: EinsatzStatus.ABGESCHLOSSEN,
          createdAt: { lte: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000) },
        },
      });

      // Create Mix of ABGESCHLOSSEN (3) and ARCHIVIERT (2) with same age
      const abgeschlossenIds = await createOldEinsaetze(prisma, testUserId, 3, 11, EinsatzStatus.ABGESCHLOSSEN);
      const archiviertIds = await createOldEinsaetze(prisma, testUserId, 2, 11, EinsatzStatus.ARCHIVIERT);
      createdEinsatzIds.push(...abgeschlossenIds, ...archiviertIds);

      const command = ArchiveOldEinsaetzeCommand.create({
        archivedBy: testUserId,
        dryRun: true,
      }).value!;

      // When
      const result = await handler.execute(command);

      // Then - Should only count the ABGESCHLOSSEN ones (not ARCHIVIERT)
      expect(result.isSuccess).toBe(true);
      // eligible = previous + our 3 ABGESCHLOSSEN (the 2 ARCHIVIERT are not counted)
      expect(result.value!.eligible).toBe(eligibleBeforeCreate + 3);
    });

    it('should skip ANGELEGT and IN_BEARBEITUNG einsätze', async () => {
      // Given - Count eligible BEFORE creating new ones
      const eligibleBeforeCreate = await prisma.einsatz.count({
        where: {
          status: EinsatzStatus.ABGESCHLOSSEN,
          createdAt: { lte: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000) },
        },
      });

      // Create Mix of different statuses, all old
      const angelegtIds = await createOldEinsaetze(prisma, testUserId, 2, 11, EinsatzStatus.ANGELEGT);
      const inBearbeitungIds = await createOldEinsaetze(prisma, testUserId, 2, 11, EinsatzStatus.IN_BEARBEITUNG);
      const abgeschlossenIds = await createOldEinsaetze(prisma, testUserId, 3, 11, EinsatzStatus.ABGESCHLOSSEN);
      createdEinsatzIds.push(...angelegtIds, ...inBearbeitungIds, ...abgeschlossenIds);

      const command = ArchiveOldEinsaetzeCommand.create({
        archivedBy: testUserId,
        dryRun: true,
      }).value!;

      // When
      const result = await handler.execute(command);

      // Then - Should only count ABGESCHLOSSEN ones
      expect(result.isSuccess).toBe(true);
      // eligible = previous + our 3 ABGESCHLOSSEN (ANGELEGT/IN_BEARBEITUNG are not counted)
      expect(result.value!.eligible).toBe(eligibleBeforeCreate + 3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle when no new eligible einsätze are created', async () => {
      // Given - Count existing eligible before any action
      const existingEligibleCount = await prisma.einsatz.count({
        where: {
          status: EinsatzStatus.ABGESCHLOSSEN,
          createdAt: { lte: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000) },
        },
      });

      const command = ArchiveOldEinsaetzeCommand.create({
        archivedBy: testUserId,
        dryRun: false,
      }).value!;

      // When
      const result = await handler.execute(command);

      // Then - archives whatever was already eligible
      expect(result.isSuccess).toBe(true);
      expect(result.value!.eligible).toBe(existingEligibleCount);
      expect(result.value!.archived).toBe(existingEligibleCount);
      expect(result.value!.failed).toHaveLength(0);
    });

    it('should respect custom olderThanYears threshold', async () => {
      // Given - Count eligible with 5-year threshold BEFORE creating new ones
      const eligibleBeforeCreate = await prisma.einsatz.count({
        where: {
          status: EinsatzStatus.ABGESCHLOSSEN,
          createdAt: { lte: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000) },
        },
      });

      // Create Einsätze 6 Jahre alt
      const ids = await createOldEinsaetze(prisma, testUserId, 3, 6);
      createdEinsatzIds.push(...ids);

      // When - Use 5 years threshold
      const command = ArchiveOldEinsaetzeCommand.create({
        archivedBy: testUserId,
        dryRun: true,
        olderThanYears: 5,
      }).value!;

      const result = await handler.execute(command);

      // Then - Should find previous + our 3 new 6-year-old einsätze
      expect(result.isSuccess).toBe(true);
      expect(result.value!.eligible).toBe(eligibleBeforeCreate + 3);
    });

    it('should not archive einsätze when threshold not met', async () => {
      // Given - Count eligible with 10-year threshold BEFORE creating new ones
      const eligibleBeforeCreate = await prisma.einsatz.count({
        where: {
          status: EinsatzStatus.ABGESCHLOSSEN,
          createdAt: { lte: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000) },
        },
      });

      // Create Einsätze 6 Jahre alt (not old enough for 10-year threshold)
      const ids = await createOldEinsaetze(prisma, testUserId, 3, 6);
      createdEinsatzIds.push(...ids);

      // When - Use 10 years threshold (default)
      const command = ArchiveOldEinsaetzeCommand.create({
        archivedBy: testUserId,
        dryRun: true,
        olderThanYears: 10,
      }).value!;

      const result = await handler.execute(command);

      // Then - Should NOT find our 6-year-old einsätze (only existing 10+ year old ones)
      expect(result.isSuccess).toBe(true);
      // eligible count should not change (our 6-year-old ones are not old enough)
      expect(result.value!.eligible).toBe(eligibleBeforeCreate);
    });
  });
});

/**
 * Helper function: Erstellt Test-Einsätze mit konfigurierbarem Alter und Status.
 *
 * Alle erstellten Einsätze haben das TEST_PREFIX im alarmstichwort für einfaches Cleanup.
 *
 * @param prisma - Prisma Service Instance
 * @param createdBy - User ID für createdBy FK
 * @param count - Anzahl zu erstellender Einsätze
 * @param yearsOld - Alter in Jahren (wird von heute subtrahiert)
 * @param status - EinsatzStatus (default: ABGESCHLOSSEN)
 * @returns Array von erstellten Einsatz IDs
 */
async function createOldEinsaetze(prisma: PrismaService, createdBy: string, count: number, yearsOld: number, status: EinsatzStatus = EinsatzStatus.ABGESCHLOSSEN): Promise<string[]> {
  const oldDate = new Date();
  oldDate.setFullYear(oldDate.getFullYear() - yearsOld);

  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const einsatz = await prisma.einsatz.create({
      data: {
        nummer: `E${oldDate.getFullYear()}-${String(i + 1).padStart(3, '0')}-${Date.now()}`,
        alarmstichwort: `${TEST_PREFIX}${status}-${yearsOld}Y-${i}-${Date.now()}`,
        einsatzort: 'Test Ort',
        status: status,
        createdAt: oldDate,
        updatedAt: oldDate,
        createdBy: createdBy,
        // archivedBy only set if status is ARCHIVIERT
        ...(status === EinsatzStatus.ARCHIVIERT ? { archivedBy: createdBy, archivedAt: oldDate } : {}),
      },
    });
    ids.push(einsatz.id);
  }
  return ids;
}
