import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { EinsatzProvider, useEinsatzContext } from './EinsatzContext';
import type { Einsatz } from '@bluelight-hub/shared/client';
// Get mocked logger for assertions
import { logger as mockLogger } from '../utils/logger';

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('EinsatzContext', () => {
  const mockEinsatz: Einsatz = {
    id: 'test-id',
    name: 'Test Einsatz',
    beschreibung: 'Test Beschreibung',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
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
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('EinsatzProvider', () => {
    it('should render children', () => {
      render(
        <EinsatzProvider>
          <div>Test Child</div>
        </EinsatzProvider>,
      );

      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('should load saved einsatz from localStorage on mount', () => {
      const savedEinsatz = {
        id: 'saved-id',
        name: 'Saved Einsatz',
        beschreibung: 'Test Description',
        createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
        updatedAt: new Date('2024-01-01T10:00:00Z').toISOString(),
        userId: 'user1',
        user: {
          id: 'user1',
          email: 'test@example.com',
          username: 'testuser',
          profile: { firstName: 'Test', lastName: 'User' },
        },
      };
      localStorage.setItem('selectedEinsatz', JSON.stringify(savedEinsatz));

      const { result } = renderHook(() => useEinsatzContext(), {
        wrapper: EinsatzProvider,
      });

      expect(result.current.selectedEinsatz).toMatchObject({
        id: 'saved-id',
        name: 'Saved Einsatz',
      });
      expect(result.current.isEinsatzSelected).toBe(true);
    });

    it('should handle legacy localStorage format and log warning', () => {
      // Set invalid JSON in selectedEinsatz to trigger the catch block
      localStorage.setItem('selectedEinsatz', 'invalid-json');
      // Set legacy format data
      localStorage.setItem('selectedEinsatzId', 'legacy-id');
      localStorage.setItem('selectedEinsatzName', 'Legacy Einsatz');

      renderHook(() => useEinsatzContext(), {
        wrapper: EinsatzProvider,
      });

      // Should log error for invalid JSON
      expect(vi.mocked(mockLogger.error)).toHaveBeenCalledWith('Failed to parse saved Einsatz', expect.any(Error));

      // Should log warning
      expect(vi.mocked(mockLogger.warn)).toHaveBeenCalledWith(
        'Using legacy localStorage format, please re-select Einsatz',
      );

      // Should clean up legacy keys and invalid JSON
      expect(localStorage.getItem('selectedEinsatzId')).toBeNull();
      expect(localStorage.getItem('selectedEinsatzName')).toBeNull();
      expect(localStorage.getItem('selectedEinsatz')).toBeNull();
    });

    it('should start with null selectedEinsatz when localStorage is empty', () => {
      const { result } = renderHook(() => useEinsatzContext(), {
        wrapper: EinsatzProvider,
      });

      expect(result.current.selectedEinsatz).toBeNull();
      expect(result.current.isEinsatzSelected).toBe(false);
    });

    it('should not set einsatz if only id is in localStorage', () => {
      localStorage.setItem('selectedEinsatzId', 'saved-id');
      // No name saved

      const { result } = renderHook(() => useEinsatzContext(), {
        wrapper: EinsatzProvider,
      });

      expect(result.current.selectedEinsatz).toBeNull();
    });

    it('should not set einsatz if only name is in localStorage', () => {
      localStorage.setItem('selectedEinsatzName', 'Saved Einsatz');
      // No id saved

      const { result } = renderHook(() => useEinsatzContext(), {
        wrapper: EinsatzProvider,
      });

      expect(result.current.selectedEinsatz).toBeNull();
    });
  });

  describe('selectEinsatz', () => {
    it('should select an einsatz and save to localStorage', () => {
      const { result } = renderHook(() => useEinsatzContext(), {
        wrapper: EinsatzProvider,
      });

      act(() => {
        result.current.selectEinsatz(mockEinsatz);
      });

      expect(result.current.selectedEinsatz).toEqual(mockEinsatz);
      expect(result.current.isEinsatzSelected).toBe(true);
      expect(localStorage.getItem('selectedEinsatzId')).toBe('test-id');
      expect(localStorage.getItem('selectedEinsatzName')).toBe('Test Einsatz');
    });

    it('should update when selecting a different einsatz', () => {
      const { result } = renderHook(() => useEinsatzContext(), {
        wrapper: EinsatzProvider,
      });

      const secondEinsatz: Einsatz = {
        ...mockEinsatz,
        id: 'second-id',
        name: 'Second Einsatz',
      };

      act(() => {
        result.current.selectEinsatz(mockEinsatz);
      });

      act(() => {
        result.current.selectEinsatz(secondEinsatz);
      });

      expect(result.current.selectedEinsatz).toEqual(secondEinsatz);
      expect(localStorage.getItem('selectedEinsatzId')).toBe('second-id');
      expect(localStorage.getItem('selectedEinsatzName')).toBe('Second Einsatz');
    });
  });

  describe('clearSelectedEinsatz', () => {
    it('should clear selected einsatz and localStorage', () => {
      const { result } = renderHook(() => useEinsatzContext(), {
        wrapper: EinsatzProvider,
      });

      // First select an einsatz
      act(() => {
        result.current.selectEinsatz(mockEinsatz);
      });

      expect(result.current.selectedEinsatz).not.toBeNull();

      // Then clear it
      act(() => {
        result.current.clearSelectedEinsatz();
      });

      expect(result.current.selectedEinsatz).toBeNull();
      expect(result.current.isEinsatzSelected).toBe(false);
      expect(localStorage.getItem('selectedEinsatzId')).toBeNull();
      expect(localStorage.getItem('selectedEinsatzName')).toBeNull();
    });

    it('should handle clearing when no einsatz is selected', () => {
      const { result } = renderHook(() => useEinsatzContext(), {
        wrapper: EinsatzProvider,
      });

      expect(result.current.selectedEinsatz).toBeNull();

      act(() => {
        result.current.clearSelectedEinsatz();
      });

      expect(result.current.selectedEinsatz).toBeNull();
      expect(result.current.isEinsatzSelected).toBe(false);
    });
  });

  describe('useEinsatzContext', () => {
    it('should throw error when used outside of provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        renderHook(() => useEinsatzContext());
      }).toThrow('useEinsatzContext must be used within an EinsatzProvider');

      console.error = originalError;
    });
  });

  describe('isEinsatzSelected', () => {
    it('should be false when no einsatz is selected', () => {
      const { result } = renderHook(() => useEinsatzContext(), {
        wrapper: EinsatzProvider,
      });

      expect(result.current.isEinsatzSelected).toBe(false);
    });

    it('should be true when an einsatz is selected', () => {
      const { result } = renderHook(() => useEinsatzContext(), {
        wrapper: EinsatzProvider,
      });

      act(() => {
        result.current.selectEinsatz(mockEinsatz);
      });

      expect(result.current.isEinsatzSelected).toBe(true);
    });

    it('should update when einsatz is cleared', () => {
      const { result } = renderHook(() => useEinsatzContext(), {
        wrapper: EinsatzProvider,
      });

      act(() => {
        result.current.selectEinsatz(mockEinsatz);
      });

      expect(result.current.isEinsatzSelected).toBe(true);

      act(() => {
        result.current.clearSelectedEinsatz();
      });

      expect(result.current.isEinsatzSelected).toBe(false);
    });
  });

  describe('localStorage edge cases', () => {
    it('should handle corrupted localStorage data gracefully', () => {
      // Set invalid JSON data
      localStorage.setItem('selectedEinsatz', '{invalid json');

      const { result } = renderHook(() => useEinsatzContext(), {
        wrapper: EinsatzProvider,
      });

      // Should not crash and selectedEinsatz should be null
      expect(result.current.selectedEinsatz).toBeNull();
      expect(result.current.isEinsatzSelected).toBe(false);
    });

    it('should handle localStorage quota exceeded', () => {
      const { result } = renderHook(() => useEinsatzContext(), {
        wrapper: EinsatzProvider,
      });

      // Mock localStorage.setItem to throw quota exceeded error
      const _originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      // Should not throw when selecting einsatz
      expect(() => {
        act(() => {
          result.current.selectEinsatz(mockEinsatz);
        });
      }).not.toThrow();

      // Einsatz should still be selected in memory
      expect(result.current.selectedEinsatz).toEqual(mockEinsatz);

      localStorage.setItem = _originalSetItem;
    });

    it('should log error when localStorage save fails', () => {
      const { result } = renderHook(() => useEinsatzContext(), {
        wrapper: EinsatzProvider,
      });

      // Clear all previous mock calls
      vi.clearAllMocks();

      // Mock localStorage.setItem to throw error
      const _originalSetItem = localStorage.setItem;
      const mockError = new Error('Storage error');
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw mockError;
      });

      // Select einsatz which should trigger save
      act(() => {
        result.current.selectEinsatz(mockEinsatz);
      });

      // Should log error
      expect(vi.mocked(mockLogger.error)).toHaveBeenCalledWith('Failed to save Einsatz to localStorage', mockError);

      // Restore original localStorage
      vi.mocked(Storage.prototype.setItem).mockRestore();
    });
  });
});
