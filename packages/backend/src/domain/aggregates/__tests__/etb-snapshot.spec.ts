// @ts-nocheck
import { EinsatztagebuchAggregate } from '../einsatztagebuch.aggregate';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';

// Mock cuid2 for Jest compatibility (ESM module issue)
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
 * Unit Tests fuer ETB Snapshot Lifecycle.
 *
 * Diese Tests validieren das Snapshot-basierte Versionierungspattern
 * fuer DRK-konforme Revisionssicherheit.
 *
 * Snapshot-Erstellung erfolgt VOR jeder mutierenden Operation:
 * - addEintrag(): Snapshot vor Hinzufuegen
 * - updateEintrag(): Snapshot vor Update
 * - deleteEintrag(): Snapshot vor Soft-Delete
 *
 * Lifecycle:
 * 1. Aggregate geladen (keine uncommitted Snapshots)
 * 2. Business Method aufgerufen → createSnapshot() VOR Mutation
 * 3. State aendern + Version inkrementieren
 * 4. Repository.save() → Snapshots persistieren
 * 5. clearSnapshots() → Uncommitted Snapshots loeschen
 */
describe('ETB Snapshot Lifecycle', () => {
  let einsatzId: EinsatzId;
  let userId: UserId;

  beforeEach(() => {
    einsatzId = EinsatzId.create().value!;
    userId = UserId.create().value!;
  });

  describe('hasUncommittedSnapshots()', () => {
    it('should return false for newly created ETB', () => {
      // Given: Newly created ETB
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;

      // Then: No uncommitted snapshots
      expect(etb.hasUncommittedSnapshots()).toBe(false);
    });

    it('should return true after addEintrag', () => {
      // Given: ETB
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;

      // When: Adding entry
      etb.addEintrag('Test entry', userId);

      // Then: Has uncommitted snapshot
      expect(etb.hasUncommittedSnapshots()).toBe(true);
    });

    it('should return true after addKorrekturEintrag', () => {
      // Given: ETB with entry
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;
      const eintrag = etb.addEintrag('Original', userId).value!;
      etb.clearSnapshots();

      // When: Adding korrektur entry
      etb.addKorrekturEintrag(eintrag.id, 'Korrektur', userId);

      // Then: Has uncommitted snapshot
      expect(etb.hasUncommittedSnapshots()).toBe(true);
    });

    it('should return false after clearSnapshots', () => {
      // Given: ETB with uncommitted snapshot
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;
      etb.addEintrag('Test', userId);
      expect(etb.hasUncommittedSnapshots()).toBe(true);

      // When: Clearing snapshots
      etb.clearSnapshots();

      // Then: No uncommitted snapshots
      expect(etb.hasUncommittedSnapshots()).toBe(false);
    });
  });

  describe('getUncommittedSnapshots()', () => {
    it('should return empty array for new ETB', () => {
      // Given: Newly created ETB
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;

      // Then: Empty snapshot array
      expect(etb.getUncommittedSnapshots()).toHaveLength(0);
    });

    it('should return one snapshot after single mutation', () => {
      // Given: ETB
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;

      // When: Single mutation
      etb.addEintrag('Test', userId);

      // Then: One snapshot
      expect(etb.getUncommittedSnapshots()).toHaveLength(1);
    });

    it('should return multiple snapshots for multiple mutations', () => {
      // Given: ETB
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;

      // When: Three mutations (add + add + korrektur)
      const eintrag = etb.addEintrag('First', userId).value!;
      etb.addEintrag('Second', userId);
      etb.addKorrekturEintrag(eintrag.id, 'Korrektur', userId);

      // Then: Three snapshots
      expect(etb.getUncommittedSnapshots()).toHaveLength(3);
    });

    it('should return shallow copy (mutation safety)', () => {
      // Given: ETB with snapshot
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;
      etb.addEintrag('Test', userId);

      // When: Getting snapshots twice
      const snapshots1 = etb.getUncommittedSnapshots();
      const snapshots2 = etb.getUncommittedSnapshots();

      // Then: Different array instances
      expect(snapshots1).not.toBe(snapshots2);
      // Same content
      expect(snapshots1).toHaveLength(snapshots2.length);
    });
  });

  describe('clearSnapshots()', () => {
    it('should remove all uncommitted snapshots', () => {
      // Given: ETB with multiple snapshots
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;
      etb.addEintrag('Test', userId);
      etb.addEintrag('Second', userId);
      expect(etb.getUncommittedSnapshots()).toHaveLength(2);

      // When: Clearing
      etb.clearSnapshots();

      // Then: Empty
      expect(etb.getUncommittedSnapshots()).toHaveLength(0);
      expect(etb.hasUncommittedSnapshots()).toBe(false);
    });

    it('should be idempotent (safe to call multiple times)', () => {
      // Given: ETB with snapshot
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;
      etb.addEintrag('Test', userId);

      // When: Clearing multiple times
      etb.clearSnapshots();
      etb.clearSnapshots();
      etb.clearSnapshots();

      // Then: Still empty, no errors
      expect(etb.hasUncommittedSnapshots()).toBe(false);
    });
  });

  describe('Snapshot content (Pre-Mutation State)', () => {
    it('should capture state BEFORE addEintrag', () => {
      // Given: Empty ETB
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;

      // When: Adding first entry
      etb.addEintrag('First entry', userId);

      // Then: Snapshot contains empty state (before the add)
      const snapshots = etb.getUncommittedSnapshots();
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]?.eintraege).toHaveLength(0); // Empty before add
    });

    it('should capture state BEFORE addKorrekturEintrag', () => {
      // Given: ETB with one entry
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;
      const eintrag = etb.addEintrag('Original text', userId).value!;
      etb.clearSnapshots();

      // When: Adding korrektur entry
      etb.addKorrekturEintrag(eintrag.id, 'Korrektur text', userId);

      // Then: Snapshot contains state before korrektur (1 entry, not yet korrigiert)
      const snapshots = etb.getUncommittedSnapshots();
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]?.eintraege).toHaveLength(1);
      expect(snapshots[0]?.eintraege[0]?.text).toBe('Original text');
    });

    it('should capture version at snapshot time', () => {
      // Given: ETB at version 1
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;
      expect(etb.version.versionNumber).toBe(1);

      // When: Adding entry (version becomes 2)
      etb.addEintrag('Test', userId);

      // Then: Snapshot was taken at version 1 (before increment)
      const snapshots = etb.getUncommittedSnapshots();
      expect(snapshots[0]?.versionNumber).toBe(1);
      expect(etb.version.versionNumber).toBe(2);
    });
  });

  describe('getSnapshotData()', () => {
    it('should return empty array for ETB without entries', () => {
      // Given: Empty ETB
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;

      // Then: Empty snapshot data
      expect(etb.getSnapshotData()).toHaveLength(0);
    });

    it('should return serializable data with all entry fields', () => {
      // Given: ETB with entry
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;
      etb.addEintrag('Test entry', userId);

      // When: Getting snapshot data
      const snapshotData = etb.getSnapshotData();

      // Then: All fields present and serializable
      expect(snapshotData).toHaveLength(1);
      const entry = snapshotData[0];

      expect(typeof entry.id).toBe('string');
      expect(typeof entry.sequenceNumber).toBe('number');
      expect(typeof entry.text).toBe('string');
      expect(typeof entry.createdBy).toBe('string');
      expect(typeof entry.createdAt).toBe('string');
      expect(typeof entry.isDeleted).toBe('boolean');

      // Verify values
      expect(entry.sequenceNumber).toBe(1);
      expect(entry.text).toBe('Test entry');
      expect(entry.isDeleted).toBe(false);
    });

    it('should include korrigiert entries', () => {
      // Given: ETB with korrigiert entry
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;
      const eintrag = etb.addEintrag('Original', userId).value!;
      etb.addKorrekturEintrag(eintrag.id, 'Korrektur', userId);

      // When: Getting snapshot data
      const snapshotData = etb.getSnapshotData();

      // Then: Both entries included (original + korrektur)
      expect(snapshotData).toHaveLength(2);
      expect(snapshotData[0]?.korrigiertDurchId).toBeDefined();
      expect(snapshotData[1]?.korrigiertEintragId).toBe(eintrag.id.value);
    });

    it('should be JSON-serializable', () => {
      // Given: ETB with entries
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;
      etb.addEintrag('Entry 1', userId);
      etb.addEintrag('Entry 2', userId);

      // When: Serializing to JSON
      const snapshotData = etb.getSnapshotData();
      const json = JSON.stringify(snapshotData);
      const parsed = JSON.parse(json);

      // Then: Roundtrip preserves data
      expect(parsed).toHaveLength(2);
      expect(parsed[0]?.text).toBe('Entry 1');
      expect(parsed[1]?.text).toBe('Entry 2');
    });
  });

  describe('Snapshot.toJSON()', () => {
    it('should produce JSON-serializable output', () => {
      // Given: ETB with snapshot
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;
      etb.addEintrag('Test', userId);

      // When: Getting snapshot and converting to JSON
      const snapshots = etb.getUncommittedSnapshots();
      const snapshotData = snapshots[0]?.toJSON();

      // Then: All fields serializable
      const json = JSON.stringify(snapshotData);
      const parsed = JSON.parse(json);

      expect(typeof parsed.versionNumber).toBe('number');
      expect(typeof parsed.versionTimestamp).toBe('string');
      expect(typeof parsed.snapshotAt).toBe('string');
      expect(Array.isArray(parsed.eintraege)).toBe(true);
    });
  });

  describe('Snapshot helper methods', () => {
    it('isEmpty() should return true for empty snapshot', () => {
      // Given: Empty ETB
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;

      // When: Adding entry (snapshot taken BEFORE = empty)
      etb.addEintrag('Test', userId);

      // Then: Snapshot is empty
      const snapshots = etb.getUncommittedSnapshots();
      expect(snapshots[0]?.isEmpty()).toBe(true);
    });

    it('isEmpty() should return false for snapshot with entries', () => {
      // Given: ETB with entry
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;
      etb.addEintrag('First', userId);
      etb.clearSnapshots();

      // When: Adding second entry (snapshot taken with First)
      etb.addEintrag('Second', userId);

      // Then: Snapshot is not empty
      const snapshots = etb.getUncommittedSnapshots();
      expect(snapshots[0]?.isEmpty()).toBe(false);
    });

    it('getEintragCount() should return total entry count', () => {
      // Given: ETB with multiple entries
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;
      etb.addEintrag('Entry 1', userId);
      etb.addEintrag('Entry 2', userId);
      etb.addEintrag('Entry 3', userId);
      etb.clearSnapshots();

      // When: Adding fourth entry
      etb.addEintrag('Entry 4', userId);

      // Then: Snapshot has 3 entries (before adding 4th)
      const snapshots = etb.getUncommittedSnapshots();
      expect(snapshots[0]?.getEintragCount()).toBe(3);
    });

    it('getActiveEintragCount() should count all entries (no deleted)', () => {
      // Given: ETB with 3 entries
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;
      etb.addEintrag('Entry 1', userId);
      etb.addEintrag('Entry 2', userId);
      etb.addEintrag('Entry 3', userId);
      etb.clearSnapshots();

      // When: Adding fourth entry
      etb.addEintrag('Entry 4', userId);

      // Then: Snapshot has 3 active entries (all active)
      const snapshots = etb.getUncommittedSnapshots();
      expect(snapshots[0]?.getActiveEintragCount()).toBe(3);
    });
  });

  describe('No snapshot for failed operations', () => {
    it('should NOT create snapshot when addEintrag fails (locked)', () => {
      // Given: Locked ETB
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;
      etb.lock(userId);

      // When: Trying to add entry (will fail)
      const result = etb.addEintrag('Test', userId);

      // Then: No snapshot created
      expect(result.isFailure).toBe(true);
      expect(etb.hasUncommittedSnapshots()).toBe(false);
    });

    it('should NOT create snapshot when addEintrag fails (empty text)', () => {
      // Given: ETB
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;

      // When: Trying to add empty entry (will fail)
      const result = etb.addEintrag('', userId);

      // Then: No snapshot created
      expect(result.isFailure).toBe(true);
      expect(etb.hasUncommittedSnapshots()).toBe(false);
    });

    it('should NOT create snapshot when addKorrekturEintrag fails (not found)', () => {
      // Given: ETB without entries
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;
      const fakeId = EinsatzId.create().value!;

      // When: Trying to create korrektur for non-existent entry
      const result = etb.addKorrekturEintrag(fakeId, 'Test', userId);

      // Then: No snapshot created
      expect(result.isFailure).toBe(true);
      expect(etb.hasUncommittedSnapshots()).toBe(false);
    });

    it('should NOT create snapshot when addKorrekturEintrag fails (locked)', () => {
      // Given: Locked ETB with entry
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;
      const eintrag = etb.addEintrag('Test', userId).value!;
      etb.lock(userId);
      etb.clearSnapshots();

      // When: Trying to add korrektur on locked ETB
      const result = etb.addKorrekturEintrag(eintrag.id, 'Korrektur', userId);

      // Then: No snapshot created
      expect(result.isFailure).toBe(true);
      expect(etb.hasUncommittedSnapshots()).toBe(false);
    });
  });

  describe('Integration: Full Snapshot Lifecycle', () => {
    it('should maintain correct snapshots through complete lifecycle', () => {
      // 1. Create ETB
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;
      expect(etb.hasUncommittedSnapshots()).toBe(false);
      expect(etb.version.versionNumber).toBe(1);

      // 2. Add first entry → snapshot of empty state
      const entry1 = etb.addEintrag('First entry', userId).value!;
      expect(etb.hasUncommittedSnapshots()).toBe(true);
      expect(etb.getUncommittedSnapshots()).toHaveLength(1);
      expect(etb.getUncommittedSnapshots()[0]?.eintraege).toHaveLength(0);
      expect(etb.version.versionNumber).toBe(2);

      // 3. Add second entry → snapshot has first entry
      etb.addEintrag('Second entry', userId);
      expect(etb.getUncommittedSnapshots()).toHaveLength(2);
      expect(etb.getUncommittedSnapshots()[1]?.eintraege).toHaveLength(1);
      expect(etb.version.versionNumber).toBe(3);

      // 4. Simulate Repository.save() - clear snapshots
      etb.clearSnapshots();
      expect(etb.hasUncommittedSnapshots()).toBe(false);

      // 5. Korrektur entry → new snapshot with both entries
      etb.addKorrekturEintrag(entry1.id, 'Korrektur first entry', userId);
      expect(etb.getUncommittedSnapshots()).toHaveLength(1);
      expect(etb.getUncommittedSnapshots()[0]?.eintraege).toHaveLength(2);
      expect(etb.getUncommittedSnapshots()[0]?.eintraege[0]?.text).toBe('First entry'); // Before korrektur
      expect(etb.version.versionNumber).toBe(4);

      // 6. Add third entry → snapshot with 3 entries (original + second + korrektur)
      etb.addEintrag('Third entry', userId);
      expect(etb.getUncommittedSnapshots()).toHaveLength(2);
      expect(etb.version.versionNumber).toBe(5);

      // 7. Final clear
      etb.clearSnapshots();
      expect(etb.hasUncommittedSnapshots()).toBe(false);
    });

    it('should track version progression correctly', () => {
      const etb = EinsatztagebuchAggregate.create(einsatzId).value!;
      const versionProgression: number[] = [];

      // Track version at each snapshot
      const eintrag = etb.addEintrag('Test', userId).value!;
      versionProgression.push(etb.getUncommittedSnapshots()[0]?.versionNumber);

      etb.addEintrag('Second', userId);
      versionProgression.push(etb.getUncommittedSnapshots()[1]?.versionNumber);

      etb.addKorrekturEintrag(eintrag.id, 'Korrektur', userId);
      versionProgression.push(etb.getUncommittedSnapshots()[2]?.versionNumber);

      // Snapshots capture version BEFORE each mutation
      expect(versionProgression).toEqual([1, 2, 3]);
      expect(etb.version.versionNumber).toBe(4); // Current version after all mutations
    });
  });
});
