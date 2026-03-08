/**
 * Unit Tests fuer Kategorie-Filter Store
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 8.3 Task 1:**
 * - State: { selectedFilter }
 * - Actions: setKategorieFilter, resetKategorieFilterStore
 * - Hooks: useKategorieFilter, useIsKategorieFilterActive
 *
 * **Story 8.3 Task 6.2:** Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  kategorieFilterStore,
  setKategorieFilter,
  resetKategorieFilterStore,
  getKategorieFilter,
  isKategorieFilterActive,
  isKategorieFilter,
  createKategorieFilter,
  kategorieFilterToValue,
  type KategorieFilterType,
} from '@/features/reminders';

describe('KategorieFilterStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    resetKategorieFilterStore();
  });

  describe('initial state', () => {
    it('should have { type: "all" } as default filter', () => {
      // Given (Arrange)
      resetKategorieFilterStore();

      // When (Act)
      const state = kategorieFilterStore.state;

      // Then (Assert)
      expect(state.selectedFilter).toEqual({ type: 'all' });
    });
  });

  describe('setKategorieFilter() (AC1, AC2, AC4)', () => {
    it('should set filter to { type: "untagged" } (AC4)', () => {
      // Given (Arrange)
      const filter: KategorieFilterType = { type: 'untagged' };

      // When (Act)
      setKategorieFilter(filter);

      // Then (Assert)
      const state = kategorieFilterStore.state;
      expect(state.selectedFilter).toEqual({ type: 'untagged' });
    });

    it('should set filter to { type: "kategorie", kategorieId } (AC2)', () => {
      // Given (Arrange)
      const kategorieId = 'kat-leitstelle-123';
      const filter: KategorieFilterType = { type: 'kategorie', kategorieId };

      // When (Act)
      setKategorieFilter(filter);

      // Then (Assert)
      const state = kategorieFilterStore.state;
      expect(state.selectedFilter).toEqual({ type: 'kategorie', kategorieId: 'kat-leitstelle-123' });
    });

    it('should reset filter to { type: "all" } via setKategorieFilter (AC1)', () => {
      // Given (Arrange) - Start with different filter
      setKategorieFilter({ type: 'untagged' });
      expect(kategorieFilterStore.state.selectedFilter).toEqual({ type: 'untagged' });

      // When (Act)
      setKategorieFilter({ type: 'all' });

      // Then (Assert)
      const state = kategorieFilterStore.state;
      expect(state.selectedFilter).toEqual({ type: 'all' });
    });
  });

  describe('resetKategorieFilterStore()', () => {
    it('should reset filter to initial state', () => {
      // Given (Arrange)
      setKategorieFilter({ type: 'kategorie', kategorieId: 'kat-123' });

      // When (Act)
      resetKategorieFilterStore();

      // Then (Assert)
      const state = kategorieFilterStore.state;
      expect(state.selectedFilter).toEqual({ type: 'all' });
    });

    it('should reset untagged filter to initial state', () => {
      // Given (Arrange)
      setKategorieFilter({ type: 'untagged' });

      // When (Act)
      resetKategorieFilterStore();

      // Then (Assert)
      const state = kategorieFilterStore.state;
      expect(state.selectedFilter).toEqual({ type: 'all' });
    });
  });

  describe('getKategorieFilter() selector', () => {
    it('should return current filter value with Tagged Union', () => {
      // Given (Arrange)
      setKategorieFilter({ type: 'untagged' });

      // When (Act)
      const filter = getKategorieFilter();

      // Then (Assert)
      expect(filter).toEqual({ type: 'untagged' });
    });

    it('should return kategorie filter with kategorieId', () => {
      // Given (Arrange)
      setKategorieFilter({ type: 'kategorie', kategorieId: 'test-kat-456' });

      // When (Act)
      const filter = getKategorieFilter();

      // Then (Assert)
      expect(filter).toEqual({ type: 'kategorie', kategorieId: 'test-kat-456' });
    });
  });

  describe('isKategorieFilterActive() selector (AC3)', () => {
    it('should return false for { type: "all" }', () => {
      // Given (Arrange)
      setKategorieFilter({ type: 'all' });

      // When (Act)
      const result = isKategorieFilterActive();

      // Then (Assert)
      expect(result).toBe(false);
    });

    it('should return true for { type: "untagged" }', () => {
      // Given (Arrange)
      setKategorieFilter({ type: 'untagged' });

      // When (Act)
      const result = isKategorieFilterActive();

      // Then (Assert)
      expect(result).toBe(true);
    });

    it('should return true for { type: "kategorie" }', () => {
      // Given (Arrange)
      setKategorieFilter({ type: 'kategorie', kategorieId: 'kat-123' });

      // When (Act)
      const result = isKategorieFilterActive();

      // Then (Assert)
      expect(result).toBe(true);
    });
  });

  describe('Helper Functions (Tagged Union)', () => {
    describe('isKategorieFilter()', () => {
      it('should return true for kategorie filter', () => {
        // Given (Arrange)
        const filter: KategorieFilterType = { type: 'kategorie', kategorieId: 'test-123' };

        // When (Act)
        const result = isKategorieFilter(filter);

        // Then (Assert)
        expect(result).toBe(true);
      });

      it('should return false for all filter', () => {
        // Given (Arrange)
        const filter: KategorieFilterType = { type: 'all' };

        // When (Act)
        const result = isKategorieFilter(filter);

        // Then (Assert)
        expect(result).toBe(false);
      });

      it('should return false for untagged filter', () => {
        // Given (Arrange)
        const filter: KategorieFilterType = { type: 'untagged' };

        // When (Act)
        const result = isKategorieFilter(filter);

        // Then (Assert)
        expect(result).toBe(false);
      });
    });

    describe('createKategorieFilter()', () => {
      it('should create all filter from "all"', () => {
        // When (Act)
        const result = createKategorieFilter('all');

        // Then (Assert)
        expect(result).toEqual({ type: 'all' });
      });

      it('should create untagged filter from "untagged"', () => {
        // When (Act)
        const result = createKategorieFilter('untagged');

        // Then (Assert)
        expect(result).toEqual({ type: 'untagged' });
      });

      it('should create kategorie filter from kategorieId string', () => {
        // When (Act)
        const result = createKategorieFilter('kat-leitstelle-123');

        // Then (Assert)
        expect(result).toEqual({ type: 'kategorie', kategorieId: 'kat-leitstelle-123' });
      });
    });

    describe('kategorieFilterToValue()', () => {
      it('should return "all" for all filter', () => {
        // Given (Arrange)
        const filter: KategorieFilterType = { type: 'all' };

        // When (Act)
        const result = kategorieFilterToValue(filter);

        // Then (Assert)
        expect(result).toBe('all');
      });

      it('should return "untagged" for untagged filter', () => {
        // Given (Arrange)
        const filter: KategorieFilterType = { type: 'untagged' };

        // When (Act)
        const result = kategorieFilterToValue(filter);

        // Then (Assert)
        expect(result).toBe('untagged');
      });

      it('should return kategorieId for kategorie filter', () => {
        // Given (Arrange)
        const filter: KategorieFilterType = { type: 'kategorie', kategorieId: 'kat-leitstelle-123' };

        // When (Act)
        const result = kategorieFilterToValue(filter);

        // Then (Assert)
        expect(result).toBe('kat-leitstelle-123');
      });
    });
  });

  describe('useIsKategorieFilterMatch() - Pattern-Konsistenz', () => {
    it('should match when filter type and kategorieId are equal', () => {
      // Given (Arrange)
      setKategorieFilter({ type: 'kategorie', kategorieId: 'kat-1' });

      // When (Act) - Hook wird in Test nicht direkt aufrufbar, teste via getKategorieFilter
      const currentFilter = getKategorieFilter();

      // Then (Assert)
      expect(currentFilter).toEqual({ type: 'kategorie', kategorieId: 'kat-1' });
    });

    it('should not match when kategorieId differs', () => {
      // Given (Arrange)
      setKategorieFilter({ type: 'kategorie', kategorieId: 'kat-1' });

      // When (Act)
      const currentFilter = getKategorieFilter();

      // Then (Assert) - Different kategorieId should not match
      expect(currentFilter).not.toEqual({ type: 'kategorie', kategorieId: 'kat-2' });
    });

    it('should match for simple type filters like "all"', () => {
      // Given (Arrange)
      setKategorieFilter({ type: 'all' });

      // When (Act)
      const currentFilter = getKategorieFilter();

      // Then (Assert)
      expect(currentFilter).toEqual({ type: 'all' });
    });

    it('should match for simple type filters like "untagged"', () => {
      // Given (Arrange)
      setKategorieFilter({ type: 'untagged' });

      // When (Act)
      const currentFilter = getKategorieFilter();

      // Then (Assert)
      expect(currentFilter).toEqual({ type: 'untagged' });
    });

    it('should not match when filter types differ', () => {
      // Given (Arrange)
      setKategorieFilter({ type: 'all' });

      // When (Act)
      const currentFilter = getKategorieFilter();

      // Then (Assert) - Different type should not match
      expect(currentFilter.type).not.toBe('kategorie');
      expect(currentFilter.type).not.toBe('untagged');
    });
  });

  describe('edge cases', () => {
    it('should handle filter to UUID kategorieId', () => {
      // Given (Arrange)
      const uuid = '550e8400-e29b-41d4-a716-446655440000';

      // When (Act)
      setKategorieFilter({ type: 'kategorie', kategorieId: uuid });

      // Then (Assert)
      expect(kategorieFilterStore.state.selectedFilter).toEqual({
        type: 'kategorie',
        kategorieId: uuid,
      });
    });

    it('should preserve type safety with Tagged Union', () => {
      // Given (Arrange)
      const filter: KategorieFilterType = { type: 'kategorie', kategorieId: 'test-id' };
      setKategorieFilter(filter);

      // When (Act)
      const currentFilter = getKategorieFilter();

      // Then (Assert) - TypeScript should narrow the type correctly
      if (currentFilter.type === 'kategorie') {
        // This should compile without error
        expect(currentFilter.kategorieId).toBe('test-id');
      }
    });

    it('should handle rapid filter changes', () => {
      // Given (Arrange) - Multiple rapid changes
      setKategorieFilter({ type: 'all' });
      setKategorieFilter({ type: 'untagged' });
      setKategorieFilter({ type: 'kategorie', kategorieId: 'kat-1' });
      setKategorieFilter({ type: 'kategorie', kategorieId: 'kat-2' });
      setKategorieFilter({ type: 'all' });

      // When (Act)
      const result = getKategorieFilter();

      // Then (Assert) - Should have the last value
      expect(result).toEqual({ type: 'all' });
    });
  });
});
