import { EinsatzArchivalPolicy } from './einsatz-archival.policy';
import { Einsatz } from '@domain/aggregates/einsatz.aggregate';
import { EinsatzStatus } from '@domain/value-objects/einsatz-status';
import { Address } from '@domain/value-objects/address';
import { UserId } from '@domain/value-objects/user-id';

// Mock nanoid to prevent ESM issues in Jest
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
    return /^[a-z][a-z0-9]+$/.test(id);
  }),
}));

describe('EinsatzArchivalPolicy', () => {
  let policy: EinsatzArchivalPolicy;

  beforeEach(() => {
    policy = new EinsatzArchivalPolicy();
  });

  /**
   * Helper: Create Einsatz and complete it.
   * This simulates an Einsatz in ABGESCHLOSSEN status.
   */
  function createCompletedEinsatz(): Einsatz {
    const addressResult = Address.create('12345', 'Hauptstraße', '1', 'Berlin');
    const userId = UserId.create().value!;
    const einsatzResult = Einsatz.create({
      alarmstichwort: 'Brand',
      createdBy: userId,
      einsatzort: addressResult.value,
    });
    const einsatz = einsatzResult.value!;

    // Transition to IN_BEARBEITUNG, then ABGESCHLOSSEN
    einsatz.updateStatus(EinsatzStatus.IN_BEARBEITUNG());
    einsatz.complete(userId);

    return einsatz;
  }

  describe('canBeArchived', () => {
    it('should return true when status is ABGESCHLOSSEN', () => {
      // Given: Einsatz in ABGESCHLOSSEN status
      const einsatz = createCompletedEinsatz();

      // When: Check if can be archived
      const canArchive = policy.canBeArchived(einsatz);

      // Then: Should be archivable immediately
      expect(canArchive).toBe(true);
    });

    it('should return false when status is ANGELEGT', () => {
      // Given: Einsatz in ANGELEGT status (not completed)
      const addressResult = Address.create('12345', 'Hauptstraße', '1', 'Berlin');
      const userId = UserId.create().value!;
      const einsatzResult = Einsatz.create({
        alarmstichwort: 'Brand',
        createdBy: userId,
        einsatzort: addressResult.value,
      });
      const einsatz = einsatzResult.value!;

      // When: Check if can be archived
      const canArchive = policy.canBeArchived(einsatz);

      // Then: Should NOT be archivable (wrong status)
      expect(canArchive).toBe(false);
    });

    it('should return false when status is IN_BEARBEITUNG', () => {
      // Given: Einsatz in IN_BEARBEITUNG status
      const addressResult = Address.create('12345', 'Hauptstraße', '1', 'Berlin');
      const userId = UserId.create().value!;
      const einsatzResult = Einsatz.create({
        alarmstichwort: 'Brand',
        createdBy: userId,
        einsatzort: addressResult.value,
      });
      const einsatz = einsatzResult.value!;
      einsatz.updateStatus(EinsatzStatus.IN_BEARBEITUNG());

      // When: Check if can be archived
      const canArchive = policy.canBeArchived(einsatz);

      // Then: Should NOT be archivable (wrong status)
      expect(canArchive).toBe(false);
    });

    it('should return false when Einsatz is already ARCHIVIERT', () => {
      // Given: Einsatz already archived
      const einsatz = createCompletedEinsatz();
      const userId = UserId.create().value!;
      einsatz.archive(userId); // Transitions to ARCHIVIERT

      // When: Check if can be archived
      const canArchive = policy.canBeArchived(einsatz);

      // Then: Should NOT be archivable (already archived)
      expect(canArchive).toBe(false);
    });

    it('should be deterministic (same inputs → same output)', () => {
      // Given: Einsatz in ABGESCHLOSSEN status
      const einsatz = createCompletedEinsatz();

      // When: Call multiple times
      const result1 = policy.canBeArchived(einsatz);
      const result2 = policy.canBeArchived(einsatz);
      const result3 = policy.canBeArchived(einsatz);

      // Then: All identical
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe(true);
    });
  });

  describe('canBeDeleted', () => {
    it('should return true when Einsatz has been archived for 10 years', () => {
      // Given: Einsatz archived 10 years ago
      const einsatz = createCompletedEinsatz();
      const userId = UserId.create().value!;
      einsatz.archive(userId);

      // HACK: Set archivedAt to 10 years ago for testing
      // biome-ignore lint/suspicious/noExplicitAny: Test bypasses factory for date simulation
      (einsatz as any)._archivedAt = new Date('2014-11-17T10:00:00Z');

      const currentDate = new Date('2024-11-17T10:00:00Z'); // Exactly 10 years later

      // When: Check if can be deleted
      const canDelete = policy.canBeDeleted(einsatz, currentDate);

      // Then: Should be deletable
      expect(canDelete).toBe(true);
    });

    it('should return false when Einsatz has been archived for only 9 years', () => {
      // Given: Einsatz archived 9 years ago
      const einsatz = createCompletedEinsatz();
      const userId = UserId.create().value!;
      einsatz.archive(userId);

      // HACK: Set archivedAt to 9 years ago for testing
      // biome-ignore lint/suspicious/noExplicitAny: Test bypasses factory for date simulation
      (einsatz as any)._archivedAt = new Date('2015-11-17T10:00:00Z');

      const currentDate = new Date('2024-11-17T10:00:00Z'); // Only 9 years later

      // When: Check if can be deleted
      const canDelete = policy.canBeDeleted(einsatz, currentDate);

      // Then: Should NOT be deletable yet
      expect(canDelete).toBe(false);
    });

    it('should return false when status is not ARCHIVIERT', () => {
      // Given: Einsatz in ABGESCHLOSSEN status (not archived yet)
      const einsatz = createCompletedEinsatz();
      const currentDate = new Date('2024-11-17T10:00:00Z');

      // When: Check if can be deleted
      const canDelete = policy.canBeDeleted(einsatz, currentDate);

      // Then: Should NOT be deletable (wrong status)
      expect(canDelete).toBe(false);
    });

    it('should return false when archivedAt is missing', () => {
      // Given: Einsatz with ARCHIVIERT status but no archivedAt (invalid state)
      const addressResult = Address.create('12345', 'Hauptstraße', '1', 'Berlin');
      const userId = UserId.create().value!;
      const einsatzResult = Einsatz.create({
        alarmstichwort: 'Brand',
        createdBy: userId,
        einsatzort: addressResult.value,
      });
      const einsatz = einsatzResult.value!;

      // HACK: Force ARCHIVIERT status without proper archival
      // biome-ignore lint/suspicious/noExplicitAny: Test bypasses factory for invalid state simulation
      (einsatz as any)._status = EinsatzStatus.ARCHIVIERT();

      const currentDate = new Date('2024-11-17T10:00:00Z');

      // When: Check if can be deleted
      const canDelete = policy.canBeDeleted(einsatz, currentDate);

      // Then: Should NOT be deletable (no archivedAt)
      expect(canDelete).toBe(false);
    });

    it('should handle leap year calculation correctly', () => {
      // Given: Einsatz archived on Feb 29, 2024 (leap year)
      const einsatz = createCompletedEinsatz();
      const userId = UserId.create().value!;
      einsatz.archive(userId);

      // HACK: Set archivedAt to Feb 29, 2024
      // biome-ignore lint/suspicious/noExplicitAny: Test bypasses factory for date simulation
      (einsatz as any)._archivedAt = new Date('2024-02-29T12:00:00Z');

      const currentDate = new Date('2034-03-01T12:00:00Z'); // 10 years later (Feb 29 + 10 years = Mar 1, 2034)

      // When: Check if can be deleted
      const canDelete = policy.canBeDeleted(einsatz, currentDate);

      // Then: Should be deletable (10 years passed, Feb 29 → Mar 1)
      expect(canDelete).toBe(true);
    });
  });

  describe('getDeletionDate', () => {
    it('should calculate deletion date as archivedAt + 10 years', () => {
      // Given: Einsatz archived on 2014-11-17
      const einsatz = createCompletedEinsatz();
      const userId = UserId.create().value!;
      einsatz.archive(userId);

      // HACK: Set archivedAt to 2014-11-17
      // biome-ignore lint/suspicious/noExplicitAny: Test bypasses factory for date simulation
      (einsatz as any)._archivedAt = new Date('2014-11-17T10:30:00Z');

      // When: Get deletion date
      const deletionDate = policy.getDeletionDate(einsatz);

      // Then: Should be exactly 10 years later
      const expected = new Date('2024-11-17T10:30:00Z');
      expect(deletionDate.toISOString()).toBe(expected.toISOString());
    });

    it('should handle leap year edge case (Feb 29 → Mar 1)', () => {
      // Given: Einsatz archived on Feb 29, 2024 (leap year)
      const einsatz = createCompletedEinsatz();
      const userId = UserId.create().value!;
      einsatz.archive(userId);

      // HACK: Set archivedAt to Feb 29, 2024
      // biome-ignore lint/suspicious/noExplicitAny: Test bypasses factory for date simulation
      (einsatz as any)._archivedAt = new Date('2024-02-29T12:00:00Z');

      // When: Get deletion date
      const deletionDate = policy.getDeletionDate(einsatz);

      // Then: Should be Mar 1, 2034 (2034 is NOT a leap year, so Feb 29 + 10 years = Mar 1)
      // JavaScript setFullYear handles this automatically by rolling over to March
      const expected = new Date('2034-03-01T12:00:00Z');
      expect(deletionDate.toISOString()).toBe(expected.toISOString());
    });

    it('should throw error when Einsatz is not archived', () => {
      // Given: Einsatz without archivedAt
      const addressResult = Address.create('12345', 'Hauptstraße', '1', 'Berlin');
      const userId = UserId.create().value!;
      const einsatzResult = Einsatz.create({
        alarmstichwort: 'Brand',
        createdBy: userId,
        einsatzort: addressResult.value,
      });
      const einsatz = einsatzResult.value!;

      // When/Then: Try to get deletion date → should throw error
      expect(() => policy.getDeletionDate(einsatz)).toThrow('nicht archiviert');
    });

    it('should not mutate original archivedAt date', () => {
      // Given: Einsatz with fixed archivedAt
      const einsatz = createCompletedEinsatz();
      const userId = UserId.create().value!;
      einsatz.archive(userId);

      // HACK: Set archivedAt to 2014-11-17
      // biome-ignore lint/suspicious/noExplicitAny: Test bypasses factory for date simulation
      (einsatz as any)._archivedAt = new Date('2014-11-17T10:00:00Z');

      const originalDateString = einsatz.archivedAt!.toISOString();

      // When: Get deletion date
      policy.getDeletionDate(einsatz);

      // Then: Original date should be unchanged (immutability)
      expect(einsatz.archivedAt!.toISOString()).toBe(originalDateString);
    });
  });
});
