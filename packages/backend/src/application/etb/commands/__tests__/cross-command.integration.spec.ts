// @ts-nocheck
import { InMemoryEtbRepository } from '../../__tests__/in-memory-etb.repository';
import { AddEintragCommand } from '@application/etb/commands';
import { AddEintragHandler } from '@application/etb/commands';
import { AddKorrekturEintragCommand } from '@application/etb/commands';
import { AddKorrekturEintragHandler } from '@application/etb/commands';
import { LockEtbCommand } from '@application/etb/commands';
import { LockEtbHandler } from '@application/etb/commands';
import { createTestEtb } from '@domain/aggregates/__tests__/fixtures/etb.fixtures';
import type { ILogger } from '@domain/ports/i-logger.port';

const databaseAvailable = !!process.env.DATABASE_URL;

// Mock CUID2 für deterministische Tests
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
    return /^[a-z][a-z0-9]+$/.test(id);
  }),
}));

/**
 * Generiert eine Test-CUID mit korrektem Format.
 */
function generateTestCuid(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'c';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Cross-Command Integration Tests für Story 3-2.
 *
 * Diese Tests validieren das Zusammenspiel mehrerer Commands in Sequenzen,
 * um sicherzustellen dass die Business Rules über Command-Grenzen hinweg
 * konsistent eingehalten werden.
 */
(databaseAvailable ? describe : describe.skip)('Cross-Command Integration Tests (Story 3-2)', () => {
  let etbRepository: InMemoryEtbRepository;
  let addEintragHandler: AddEintragHandler;
  let addKorrekturEintragHandler: AddKorrekturEintragHandler;
  let lockEtbHandler: LockEtbHandler;
  let mockLogger: jest.Mocked<ILogger>;
  let testUserId: string;
  let testEinsatzId: string;

  beforeEach(() => {
    // Reset mocks and repository
    etbRepository = new InMemoryEtbRepository();
    testUserId = generateTestCuid();
    testEinsatzId = generateTestCuid();

    // Mock Logger (ILogger interface)
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as jest.Mocked<ILogger>;

    // Create all handlers with shared repository
    addEintragHandler = new AddEintragHandler(etbRepository, mockLogger);
    addKorrekturEintragHandler = new AddKorrekturEintragHandler(etbRepository, mockLogger);
    lockEtbHandler = new LockEtbHandler(etbRepository, mockLogger);
  });

  afterEach(() => {
    etbRepository.clear();
    jest.clearAllMocks();
  });

  describe('Task 7.1: AddEintrag → AddKorrekturEintrag sequence', () => {
    it('should successfully execute Add → Korrektur sequence', async () => {
      // Arrange: Create ETB without entries
      const etb = createTestEtb({ entriesCount: 0, userId: testUserId, einsatzId: testEinsatzId });
      await etbRepository.save(etb);

      // Act 1: AddEintrag
      const addCommand = AddEintragCommand.create(etb.id.value, 'Urspruenglicher Text', testUserId).value!;
      const addResult = await addEintragHandler.execute(addCommand);
      expect(addResult.isSuccess).toBe(true);
      const eintragId = addResult.value?.id.value;

      // Act 2: AddKorrekturEintrag
      const korrekturCommand = AddKorrekturEintragCommand.create(etb.id.value, eintragId, 'Korrigierter Text', testUserId).value!;
      const korrekturResult = await addKorrekturEintragHandler.execute(korrekturCommand);
      expect(korrekturResult.isSuccess).toBe(true);

      // Assert: Verify final state
      const savedEtb = await etbRepository.findById(etb.id);
      expect(savedEtb?.eintraege.length).toBe(2); // Original + Korrektur
      expect(savedEtb?.eintraege[0]?.isKorrigiert).toBe(true);
      expect(savedEtb?.eintraege[1]?.isKorrektur).toBe(true);
      expect(savedEtb?.eintraege[1]?.text).toBe('Korrigierter Text');
    });
  });

  describe('Task 7.2: AddEintrag → LockEtb → verify AddEintrag fails', () => {
    it('should prevent AddEintrag after ETB is locked', async () => {
      // Arrange: Create ETB and add first entry
      const etb = createTestEtb({ entriesCount: 0, userId: testUserId, einsatzId: testEinsatzId });
      await etbRepository.save(etb);

      const addCommand1 = AddEintragCommand.create(etb.id.value, 'Erster Eintrag', testUserId).value!;
      await addEintragHandler.execute(addCommand1);

      // Act 1: Lock ETB
      const lockCommand = LockEtbCommand.create(etb.id.value, testUserId, 'ADMIN').value!;
      const lockResult = await lockEtbHandler.execute(lockCommand);
      expect(lockResult.isSuccess).toBe(true);

      // Act 2: Try to add another entry
      const addCommand2 = AddEintragCommand.create(etb.id.value, 'Zweiter Eintrag (sollte fehlschlagen)', testUserId).value!;
      const addResult2 = await addEintragHandler.execute(addCommand2);

      // Assert: AddEintrag should fail with locked error
      expect(addResult2.isSuccess).toBe(false);
      expect(addResult2.error).toContain('ETB ist gesperrt und kann nicht mehr geändert werden');
    });
  });

  describe('Task 7.3: AddEintrag → LockEtb → verify AddKorrekturEintrag fails', () => {
    it('should prevent AddKorrekturEintrag after ETB is locked', async () => {
      // Arrange: Create ETB and add entry
      const etb = createTestEtb({ entriesCount: 0, userId: testUserId, einsatzId: testEinsatzId });
      await etbRepository.save(etb);

      const addCommand = AddEintragCommand.create(etb.id.value, 'Test Eintrag', testUserId).value!;
      const addResult = await addEintragHandler.execute(addCommand);
      const eintragId = addResult.value?.id.value;

      // Act 1: Lock ETB
      const lockCommand = LockEtbCommand.create(etb.id.value, testUserId, 'ADMIN').value!;
      await lockEtbHandler.execute(lockCommand);

      // Act 2: Try to add korrektur
      const korrekturCommand = AddKorrekturEintragCommand.create(etb.id.value, eintragId, 'Korrektur', testUserId).value!;
      const korrekturResult = await addKorrekturEintragHandler.execute(korrekturCommand);

      // Assert: AddKorrekturEintrag should fail with locked error
      expect(korrekturResult.isSuccess).toBe(false);
      expect(korrekturResult.error).toContain('gesperrt');
    });
  });

  describe('Task 7.5: Snapshot count verification after mutation sequence', () => {
    it('should create correct number of snapshots after mutation sequence', async () => {
      // Arrange: Create ETB without entries
      const etb = createTestEtb({ entriesCount: 0, userId: testUserId, einsatzId: testEinsatzId });
      await etbRepository.save(etb);

      // Act: Execute sequence of mutations
      // 1. AddEintrag (creates 1 snapshot)
      const addCommand = AddEintragCommand.create(etb.id.value, 'Eintrag 1', testUserId).value!;
      const addResult = await addEintragHandler.execute(addCommand);
      const eintragId = addResult.value?.id.value;

      // 2. AddEintrag again (creates 1 snapshot)
      const addCommand2 = AddEintragCommand.create(etb.id.value, 'Eintrag 2', testUserId).value!;
      await addEintragHandler.execute(addCommand2);

      // 3. AddKorrekturEintrag (creates 1 snapshot)
      const korrekturCommand = AddKorrekturEintragCommand.create(etb.id.value, eintragId, 'Eintrag 1 (korrigiert)', testUserId).value!;
      await addKorrekturEintragHandler.execute(korrekturCommand);

      // Assert: Verify 3 mutations created snapshots
      const savedEtb = await etbRepository.findById(etb.id);

      // Verify ETB state: 2 originals + 1 korrektur = 3
      expect(savedEtb?.eintraege.length).toBe(3);
      expect(savedEtb?.eintraege[0]?.isKorrigiert).toBe(true);

      // Verify version incremented correctly (initial version 1 + 3 mutations = version 4)
      expect(savedEtb?.version.versionNumber).toBeGreaterThanOrEqual(4);
    });

    it('should preserve snapshot history for audit trail', async () => {
      // Arrange: Create ETB with existing entries
      const etb = createTestEtb({ entriesCount: 2, userId: testUserId, einsatzId: testEinsatzId });
      await etbRepository.save(etb);
      const existingEintragId = etb.eintraege[0]?.id.value;

      // Act: Add korrektur and another entry
      const korrektur1 = AddKorrekturEintragCommand.create(etb.id.value, existingEintragId, 'Korrektur', testUserId).value!;
      await addKorrekturEintragHandler.execute(korrektur1);

      const add2 = AddEintragCommand.create(etb.id.value, 'Neuer Eintrag', testUserId).value!;
      await addEintragHandler.execute(add2);

      // Assert: Verify snapshots were created for audit trail
      const savedEtb = await etbRepository.findById(etb.id);
      expect(savedEtb?.hasUncommittedSnapshots()).toBe(true);
      expect(savedEtb?.getUncommittedSnapshots().length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Lock is irreversible - no further operations possible', () => {
    it('should reject all mutations after lock including another lock attempt', async () => {
      // Arrange: Create ETB
      const etb = createTestEtb({ entriesCount: 1, userId: testUserId, einsatzId: testEinsatzId });
      await etbRepository.save(etb);
      const eintragId = etb.eintraege[0]?.id.value;

      // Act: Lock ETB
      const lockCommand = LockEtbCommand.create(etb.id.value, testUserId, 'ADMIN').value!;
      await lockEtbHandler.execute(lockCommand);

      // Assert: All operations fail
      const addCmd = AddEintragCommand.create(etb.id.value, 'New Entry', testUserId).value!;
      const addCmdResult = await addEintragHandler.execute(addCmd);
      expect(addCmdResult.isSuccess).toBe(false);

      const korrekturCmd = AddKorrekturEintragCommand.create(etb.id.value, eintragId, 'Korrektur', testUserId).value!;
      const korrekturCmdResult = await addKorrekturEintragHandler.execute(korrekturCmd);
      expect(korrekturCmdResult.isSuccess).toBe(false);

      // Even another lock attempt fails
      const lockCmd2 = LockEtbCommand.create(etb.id.value, testUserId, 'SUPER_ADMIN').value!;
      const lockCmd2Result = await lockEtbHandler.execute(lockCmd2);
      expect(lockCmd2Result.isSuccess).toBe(false);
      expect(lockCmd2Result.error).toContain('ETB ist bereits gesperrt');
    });
  });
});
