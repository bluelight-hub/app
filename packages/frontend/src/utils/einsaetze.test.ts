import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce, filterEinsaetze, formatDate } from './einsaetze';
import type { Einsatz } from '@bluelight-hub/shared/client/models';
import type { EinsaetzeFilterOptions } from '../types/einsaetze';

describe('einsaetze utils', () => {
  describe('filterEinsaetze', () => {
    const mockEinsaetze: Einsatz[] = [
      {
        id: '1',
        name: 'Brand Hauptstraße',
        beschreibung: 'Wohnungsbrand im 3. OG',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        userId: 'user1',
        user: {
          id: 'user1',
          email: 'test@example.com',
          username: 'testuser',
          profile: {
            firstName: 'Test',
            lastName: 'User',
          },
        },
      },
      {
        id: '2',
        name: 'Verkehrsunfall B42',
        beschreibung: 'PKW gegen LKW',
        createdAt: '2024-01-20T14:30:00Z',
        updatedAt: '2024-01-20T14:30:00Z',
        userId: 'user1',
        user: {
          id: 'user1',
          email: 'test@example.com',
          username: 'testuser',
          profile: {
            firstName: 'Test',
            lastName: 'User',
          },
        },
      },
      {
        id: '3',
        name: 'Wasserschaden Keller',
        beschreibung: undefined,
        createdAt: '2024-02-01T08:15:00Z',
        updatedAt: '2024-02-01T08:15:00Z',
        userId: 'user1',
        user: {
          id: 'user1',
          email: 'test@example.com',
          username: 'testuser',
          profile: {
            firstName: 'Test',
            lastName: 'User',
          },
        },
      },
    ];

    it('should return all einsaetze when no filters are applied', () => {
      const result = filterEinsaetze(mockEinsaetze, {});
      expect(result).toEqual(mockEinsaetze);
    });

    describe('searchText filter', () => {
      it('should filter by name', () => {
        const filters: EinsaetzeFilterOptions = { searchText: 'brand' };
        const result = filterEinsaetze(mockEinsaetze, filters);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
      });

      it('should filter by description', () => {
        const filters: EinsaetzeFilterOptions = { searchText: 'PKW' };
        const result = filterEinsaetze(mockEinsaetze, filters);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
      });

      it('should be case insensitive', () => {
        const filters: EinsaetzeFilterOptions = { searchText: 'VERKEHRS' };
        const result = filterEinsaetze(mockEinsaetze, filters);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
      });

      it('should handle missing description', () => {
        const filters: EinsaetzeFilterOptions = { searchText: 'Wasser' };
        const result = filterEinsaetze(mockEinsaetze, filters);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('3');
      });

      it('should return empty array when no matches found', () => {
        const filters: EinsaetzeFilterOptions = { searchText: 'nicht vorhanden' };
        const result = filterEinsaetze(mockEinsaetze, filters);
        expect(result).toHaveLength(0);
      });
    });

    describe('dateRange filter', () => {
      it('should filter by date range', () => {
        const filters: EinsaetzeFilterOptions = {
          dateRange: {
            start: new Date('2024-01-10'),
            end: new Date('2024-01-25'),
          },
        };
        const result = filterEinsaetze(mockEinsaetze, filters);
        expect(result).toHaveLength(2);
        expect(result.map((e) => e.id)).toEqual(['1', '2']);
      });

      it('should include edge cases', () => {
        const filters: EinsaetzeFilterOptions = {
          dateRange: {
            start: new Date('2024-01-15T10:00:00Z'),
            end: new Date('2024-01-20T14:30:00Z'),
          },
        };
        const result = filterEinsaetze(mockEinsaetze, filters);
        expect(result).toHaveLength(2);
      });

      it('should return empty array when all dates are outside range', () => {
        const filters: EinsaetzeFilterOptions = {
          dateRange: {
            start: new Date('2023-01-01'),
            end: new Date('2023-12-31'),
          },
        };
        const result = filterEinsaetze(mockEinsaetze, filters);
        expect(result).toHaveLength(0);
      });
    });

    describe('showArchived filter', () => {
      it('should return all einsaetze when showArchived is true', () => {
        const filters: EinsaetzeFilterOptions = { showArchived: true };
        const result = filterEinsaetze(mockEinsaetze, filters);
        expect(result).toEqual(mockEinsaetze);
      });

      it('should return all einsaetze when showArchived is false (TODO: implement archive status)', () => {
        const filters: EinsaetzeFilterOptions = { showArchived: false };
        const result = filterEinsaetze(mockEinsaetze, filters);
        expect(result).toEqual(mockEinsaetze);
      });

      it('should return all einsaetze when showArchived is undefined', () => {
        const filters: EinsaetzeFilterOptions = {};
        const result = filterEinsaetze(mockEinsaetze, filters);
        expect(result).toEqual(mockEinsaetze);
      });
    });

    describe('combined filters', () => {
      it('should apply multiple filters', () => {
        const filters: EinsaetzeFilterOptions = {
          searchText: 'brand',
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31'),
          },
        };
        const result = filterEinsaetze(mockEinsaetze, filters);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
      });

      it('should return empty array when filters exclude all items', () => {
        const filters: EinsaetzeFilterOptions = {
          searchText: 'brand',
          dateRange: {
            start: new Date('2024-02-01'),
            end: new Date('2024-02-28'),
          },
        };
        const result = filterEinsaetze(mockEinsaetze, filters);
        expect(result).toHaveLength(0);
      });
    });
  });

  describe('formatDate', () => {
    it('should format a string date in NATO format', () => {
      const result = formatDate('2024-01-15T10:30:00Z');
      // NATO format: DDHHmmMMMYY (e.g., 151030jan24)
      expect(result).toMatch(/^\d{2}\d{2}\d{2}[a-z]{3}\d{2}$/);
    });

    it('should format a Date object in NATO format', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = formatDate(date);
      expect(result).toMatch(/^\d{2}\d{2}\d{2}[a-z]{3}\d{2}$/);
    });

    it('should handle invalid dates', () => {
      const result = formatDate('invalid-date');
      expect(result).toBe('Invalid Date');
    });

    it('should format specific date correctly', () => {
      // Test with a known date
      const date = new Date('2024-01-15T10:30:00');
      const result = formatDate(date);
      // Should be: day(15) hour(10) minute(30) month(jan) year(24)
      expect(result).toContain('15');
      expect(result).toContain('10');
      expect(result).toContain('30');
      expect(result).toContain('jan');
      expect(result).toContain('24');
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should debounce function calls', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 300);

      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');

      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('third');
    });

    it('should reset timer on subsequent calls', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 300);

      debouncedFn('first');
      vi.advanceTimersByTime(200);
      expect(mockFn).not.toHaveBeenCalled();

      debouncedFn('second');
      vi.advanceTimersByTime(200);
      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('second');
    });

    it('should handle multiple arguments', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 300);

      debouncedFn('arg1', 'arg2', { key: 'value' });
      vi.advanceTimersByTime(300);

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' });
    });

    it('should allow multiple independent debounced functions', () => {
      const mockFn1 = vi.fn();
      const mockFn2 = vi.fn();
      const debouncedFn1 = debounce(mockFn1, 200);
      const debouncedFn2 = debounce(mockFn2, 400);

      debouncedFn1('fn1');
      debouncedFn2('fn2');

      vi.advanceTimersByTime(200);
      expect(mockFn1).toHaveBeenCalledTimes(1);
      expect(mockFn2).not.toHaveBeenCalled();

      vi.advanceTimersByTime(200);
      expect(mockFn2).toHaveBeenCalledTimes(1);
    });
  });
});
