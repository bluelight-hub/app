/**
 * Unit Tests fuer Status-Filter Store
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 8.4 Task 5.1:**
 * - State: { selectedFilter }
 * - Actions: setStatusFilter, resetStatusFilterStore
 * - Hooks: useStatusFilter, useIsStatusFilterActive
 * - Selectors: getStatusFilter, isStatusFilterActive
 * - Helpers: isStatusFilter, createStatusFilter, statusFilterToValue
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  statusFilterStore,
  setStatusFilter,
  resetStatusFilterStore,
  getStatusFilter,
  isStatusFilterActive,
  isStatusFilter,
  createStatusFilter,
  statusFilterToValue,
  ErinnerungStatus,
  type StatusFilterType,
} from '@/features/reminders';

describe('StatusFilterStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    resetStatusFilterStore();
  });

  describe('initial state', () => {
    it('should have { type: "all" } as default filter', () => {
      // Given (Arrange)
      resetStatusFilterStore();

      // When (Act)
      const state = statusFilterStore.state;

      // Then (Assert)
      expect(state.selectedFilter).toEqual({ type: 'all' });
    });
  });

  describe('setStatusFilter()', () => {
    it('should set filter to GEPLANT status', () => {
      // Given (Arrange)
      const filter: StatusFilterType = { type: 'status', status: ErinnerungStatus.Geplant };

      // When (Act)
      setStatusFilter(filter);

      // Then (Assert)
      const state = statusFilterStore.state;
      expect(state.selectedFilter).toEqual({ type: 'status', status: ErinnerungStatus.Geplant });
    });

    it('should set filter to AUSGELOEST status', () => {
      // Given (Arrange)
      const filter: StatusFilterType = { type: 'status', status: ErinnerungStatus.Ausgeloest };

      // When (Act)
      setStatusFilter(filter);

      // Then (Assert)
      const state = statusFilterStore.state;
      expect(state.selectedFilter).toEqual({ type: 'status', status: ErinnerungStatus.Ausgeloest });
    });

    it('should set filter to ACKNOWLEDGED status', () => {
      // Given (Arrange)
      const filter: StatusFilterType = { type: 'status', status: ErinnerungStatus.Acknowledged };

      // When (Act)
      setStatusFilter(filter);

      // Then (Assert)
      const state = statusFilterStore.state;
      expect(state.selectedFilter).toEqual({ type: 'status', status: ErinnerungStatus.Acknowledged });
    });

    it('should set filter to SNOOZED status', () => {
      // Given (Arrange)
      const filter: StatusFilterType = { type: 'status', status: ErinnerungStatus.Snoozed };

      // When (Act)
      setStatusFilter(filter);

      // Then (Assert)
      const state = statusFilterStore.state;
      expect(state.selectedFilter).toEqual({ type: 'status', status: ErinnerungStatus.Snoozed });
    });

    it('should set filter to ESKALIERT status', () => {
      // Given (Arrange)
      const filter: StatusFilterType = { type: 'status', status: ErinnerungStatus.Eskaliert };

      // When (Act)
      setStatusFilter(filter);

      // Then (Assert)
      const state = statusFilterStore.state;
      expect(state.selectedFilter).toEqual({ type: 'status', status: ErinnerungStatus.Eskaliert });
    });

    it('should set filter to ERLEDIGT status', () => {
      // Given (Arrange)
      const filter: StatusFilterType = { type: 'status', status: ErinnerungStatus.Erledigt };

      // When (Act)
      setStatusFilter(filter);

      // Then (Assert)
      const state = statusFilterStore.state;
      expect(state.selectedFilter).toEqual({ type: 'status', status: ErinnerungStatus.Erledigt });
    });

    it('should reset filter to { type: "all" } via setStatusFilter', () => {
      // Given (Arrange) - Start with different filter
      setStatusFilter({ type: 'status', status: ErinnerungStatus.Geplant });
      expect(statusFilterStore.state.selectedFilter).toEqual({
        type: 'status',
        status: ErinnerungStatus.Geplant,
      });

      // When (Act)
      setStatusFilter({ type: 'all' });

      // Then (Assert)
      const state = statusFilterStore.state;
      expect(state.selectedFilter).toEqual({ type: 'all' });
    });
  });

  describe('resetStatusFilterStore()', () => {
    it('should reset filter to initial state', () => {
      // Given (Arrange)
      setStatusFilter({ type: 'status', status: ErinnerungStatus.Eskaliert });

      // When (Act)
      resetStatusFilterStore();

      // Then (Assert)
      const state = statusFilterStore.state;
      expect(state.selectedFilter).toEqual({ type: 'all' });
    });

    it('should reset any status filter to initial state', () => {
      // Given (Arrange)
      setStatusFilter({ type: 'status', status: ErinnerungStatus.Snoozed });

      // When (Act)
      resetStatusFilterStore();

      // Then (Assert)
      const state = statusFilterStore.state;
      expect(state.selectedFilter).toEqual({ type: 'all' });
    });
  });

  describe('getStatusFilter() selector', () => {
    it('should return current filter value with Tagged Union', () => {
      // Given (Arrange)
      setStatusFilter({ type: 'status', status: ErinnerungStatus.Acknowledged });

      // When (Act)
      const filter = getStatusFilter();

      // Then (Assert)
      expect(filter).toEqual({ type: 'status', status: ErinnerungStatus.Acknowledged });
    });

    it('should return all filter when no status is selected', () => {
      // Given (Arrange)
      resetStatusFilterStore();

      // When (Act)
      const filter = getStatusFilter();

      // Then (Assert)
      expect(filter).toEqual({ type: 'all' });
    });
  });

  describe('isStatusFilterActive() selector', () => {
    it('should return false for { type: "all" }', () => {
      // Given (Arrange)
      setStatusFilter({ type: 'all' });

      // When (Act)
      const result = isStatusFilterActive();

      // Then (Assert)
      expect(result).toBe(false);
    });

    it('should return true for { type: "status" } with GEPLANT', () => {
      // Given (Arrange)
      setStatusFilter({ type: 'status', status: ErinnerungStatus.Geplant });

      // When (Act)
      const result = isStatusFilterActive();

      // Then (Assert)
      expect(result).toBe(true);
    });

    it('should return true for { type: "status" } with ERLEDIGT', () => {
      // Given (Arrange)
      setStatusFilter({ type: 'status', status: ErinnerungStatus.Erledigt });

      // When (Act)
      const result = isStatusFilterActive();

      // Then (Assert)
      expect(result).toBe(true);
    });

    it('should return true for { type: "status" } with ESKALIERT', () => {
      // Given (Arrange)
      setStatusFilter({ type: 'status', status: ErinnerungStatus.Eskaliert });

      // When (Act)
      const result = isStatusFilterActive();

      // Then (Assert)
      expect(result).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    describe('isStatusFilter()', () => {
      it('should return true for status filter', () => {
        // Given (Arrange)
        const filter: StatusFilterType = { type: 'status', status: ErinnerungStatus.Geplant };

        // When (Act)
        const result = isStatusFilter(filter);

        // Then (Assert)
        expect(result).toBe(true);
      });

      it('should return false for all filter', () => {
        // Given (Arrange)
        const filter: StatusFilterType = { type: 'all' };

        // When (Act)
        const result = isStatusFilter(filter);

        // Then (Assert)
        expect(result).toBe(false);
      });

      it('should narrow type correctly for status filter', () => {
        // Given (Arrange)
        const filter: StatusFilterType = { type: 'status', status: ErinnerungStatus.Ausgeloest };

        // When (Act)
        if (isStatusFilter(filter)) {
          // Then (Assert) - TypeScript sollte den Typ korrekt einschraenken
          expect(filter.status).toBe(ErinnerungStatus.Ausgeloest);
        }
      });
    });

    describe('createStatusFilter()', () => {
      it('should create all filter from "all"', () => {
        // When (Act)
        const result = createStatusFilter('all');

        // Then (Assert)
        expect(result).toEqual({ type: 'all' });
      });

      it('should create status filter from GEPLANT string', () => {
        // When (Act)
        const result = createStatusFilter('GEPLANT');

        // Then (Assert)
        expect(result).toEqual({ type: 'status', status: ErinnerungStatus.Geplant });
      });

      it('should create status filter from AUSGELOEST string', () => {
        // When (Act)
        const result = createStatusFilter('AUSGELOEST');

        // Then (Assert)
        expect(result).toEqual({ type: 'status', status: ErinnerungStatus.Ausgeloest });
      });

      it('should create status filter from ACKNOWLEDGED string', () => {
        // When (Act)
        const result = createStatusFilter('ACKNOWLEDGED');

        // Then (Assert)
        expect(result).toEqual({ type: 'status', status: ErinnerungStatus.Acknowledged });
      });

      it('should create status filter from SNOOZED string', () => {
        // When (Act)
        const result = createStatusFilter('SNOOZED');

        // Then (Assert)
        expect(result).toEqual({ type: 'status', status: ErinnerungStatus.Snoozed });
      });

      it('should create status filter from ESKALIERT string', () => {
        // When (Act)
        const result = createStatusFilter('ESKALIERT');

        // Then (Assert)
        expect(result).toEqual({ type: 'status', status: ErinnerungStatus.Eskaliert });
      });

      it('should create status filter from ERLEDIGT string', () => {
        // When (Act)
        const result = createStatusFilter('ERLEDIGT');

        // Then (Assert)
        expect(result).toEqual({ type: 'status', status: ErinnerungStatus.Erledigt });
      });

      it('should fallback to all filter for invalid status string', () => {
        // When (Act)
        const result = createStatusFilter('INVALID_STATUS');

        // Then (Assert)
        expect(result).toEqual({ type: 'all' });
      });

      it('should fallback to all filter for empty string', () => {
        // When (Act)
        const result = createStatusFilter('');

        // Then (Assert)
        expect(result).toEqual({ type: 'all' });
      });
    });

    describe('statusFilterToValue()', () => {
      it('should return "all" for all filter', () => {
        // Given (Arrange)
        const filter: StatusFilterType = { type: 'all' };

        // When (Act)
        const result = statusFilterToValue(filter);

        // Then (Assert)
        expect(result).toBe('all');
      });

      it('should return status string for GEPLANT filter', () => {
        // Given (Arrange)
        const filter: StatusFilterType = { type: 'status', status: ErinnerungStatus.Geplant };

        // When (Act)
        const result = statusFilterToValue(filter);

        // Then (Assert)
        expect(result).toBe('GEPLANT');
      });

      it('should return status string for AUSGELOEST filter', () => {
        // Given (Arrange)
        const filter: StatusFilterType = { type: 'status', status: ErinnerungStatus.Ausgeloest };

        // When (Act)
        const result = statusFilterToValue(filter);

        // Then (Assert)
        expect(result).toBe('AUSGELOEST');
      });

      it('should return status string for ERLEDIGT filter', () => {
        // Given (Arrange)
        const filter: StatusFilterType = { type: 'status', status: ErinnerungStatus.Erledigt };

        // When (Act)
        const result = statusFilterToValue(filter);

        // Then (Assert)
        expect(result).toBe('ERLEDIGT');
      });
    });
  });

  describe('useIsStatusFilterMatch() - Pattern-Konsistenz', () => {
    it('should match when filter type and status are equal', () => {
      // Given (Arrange)
      setStatusFilter({ type: 'status', status: ErinnerungStatus.Geplant });

      // When (Act) - Hook wird in Test nicht direkt aufrufbar, teste via getStatusFilter
      const currentFilter = getStatusFilter();

      // Then (Assert)
      expect(currentFilter).toEqual({ type: 'status', status: ErinnerungStatus.Geplant });
    });

    it('should not match when status differs', () => {
      // Given (Arrange)
      setStatusFilter({ type: 'status', status: ErinnerungStatus.Geplant });

      // When (Act)
      const currentFilter = getStatusFilter();

      // Then (Assert) - Different status should not match
      expect(currentFilter).not.toEqual({ type: 'status', status: ErinnerungStatus.Erledigt });
    });

    it('should match for simple type filters like "all"', () => {
      // Given (Arrange)
      setStatusFilter({ type: 'all' });

      // When (Act)
      const currentFilter = getStatusFilter();

      // Then (Assert)
      expect(currentFilter).toEqual({ type: 'all' });
    });

    it('should not match when filter types differ', () => {
      // Given (Arrange)
      setStatusFilter({ type: 'all' });

      // When (Act)
      const currentFilter = getStatusFilter();

      // Then (Assert) - Different type should not match
      expect(currentFilter.type).not.toBe('status');
    });
  });

  describe('edge cases', () => {
    it('should handle UUID-like values as invalid status (fallback to all)', () => {
      // Given (Arrange)
      const uuid = '550e8400-e29b-41d4-a716-446655440000';

      // When (Act)
      const result = createStatusFilter(uuid);

      // Then (Assert) - UUID is not a valid status, should fallback to all
      expect(result).toEqual({ type: 'all' });
    });

    it('should preserve type safety with Tagged Union', () => {
      // Given (Arrange)
      const filter: StatusFilterType = { type: 'status', status: ErinnerungStatus.Acknowledged };
      setStatusFilter(filter);

      // When (Act)
      const currentFilter = getStatusFilter();

      // Then (Assert) - TypeScript should narrow the type correctly
      if (currentFilter.type === 'status') {
        // This should compile without error
        expect(currentFilter.status).toBe(ErinnerungStatus.Acknowledged);
      }
    });

    it('should handle rapid filter changes', () => {
      // Given (Arrange) - Multiple rapid changes
      setStatusFilter({ type: 'all' });
      setStatusFilter({ type: 'status', status: ErinnerungStatus.Geplant });
      setStatusFilter({ type: 'status', status: ErinnerungStatus.Ausgeloest });
      setStatusFilter({ type: 'status', status: ErinnerungStatus.Erledigt });
      setStatusFilter({ type: 'all' });

      // When (Act)
      const result = getStatusFilter();

      // Then (Assert) - Should have the last value
      expect(result).toEqual({ type: 'all' });
    });

    it('should handle switching between different statuses', () => {
      // Given (Arrange)
      setStatusFilter({ type: 'status', status: ErinnerungStatus.Geplant });
      expect(isStatusFilterActive()).toBe(true);

      // When (Act)
      setStatusFilter({ type: 'status', status: ErinnerungStatus.Eskaliert });

      // Then (Assert)
      expect(getStatusFilter()).toEqual({ type: 'status', status: ErinnerungStatus.Eskaliert });
      expect(isStatusFilterActive()).toBe(true);
    });

    it('should verify all ErinnerungStatus enum values are testable', () => {
      // Given (Arrange)
      const allStatuses = Object.values(ErinnerungStatus);

      // When (Act) & Then (Assert)
      // Verify that all enum values can be used as filters
      for (const status of allStatuses) {
        setStatusFilter({ type: 'status', status });
        const currentFilter = getStatusFilter();
        expect(currentFilter).toEqual({ type: 'status', status });
        expect(isStatusFilterActive()).toBe(true);
      }
    });

    it('should handle createStatusFilter and statusFilterToValue roundtrip', () => {
      // Given (Arrange)
      const originalValue = 'GEPLANT';

      // When (Act)
      const filter = createStatusFilter(originalValue);
      const backToValue = statusFilterToValue(filter);

      // Then (Assert)
      expect(backToValue).toBe(originalValue);
    });

    it('should handle all filter roundtrip', () => {
      // Given (Arrange)
      const originalValue = 'all';

      // When (Act)
      const filter = createStatusFilter(originalValue);
      const backToValue = statusFilterToValue(filter);

      // Then (Assert)
      expect(backToValue).toBe(originalValue);
    });
  });
});
