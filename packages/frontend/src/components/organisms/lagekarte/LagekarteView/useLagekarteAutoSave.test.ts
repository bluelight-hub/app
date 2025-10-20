import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLagekarteAutoSave } from './useLagekarteAutoSave';
import { useSaveLagekarteState } from '@/api/hooks/useLagekarteApi';

// Mock TanStack Pacer - Simple mock that returns a callable function
vi.mock('@tanstack/pacer', () => ({
  debounce: vi.fn((callback) => callback), // Simplified: No actual debounce in tests
}));

// Mock TanStack Query Hook
vi.mock('@/api/hooks/useLagekarteApi', () => ({
  useSaveLagekarteState: vi.fn(),
}));

describe('useLagekarteAutoSave', () => {
  const mockEinsatzId = 'test-einsatz-id';
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useSaveLagekarteState to return mutation object
    (useSaveLagekarteState as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
    });
  });

  it('should initialize hook with einsatzId', () => {
    // Act
    const { result } = renderHook(() => useLagekarteAutoSave(mockEinsatzId));

    // Assert: Hook should return trigger function
    expect(result.current.triggerAutoSave).toBeDefined();
    expect(typeof result.current.triggerAutoSave).toBe('function');
  });

  it('should call mutation when triggerAutoSave is invoked', () => {
    // Arrange
    const { result } = renderHook(() => useLagekarteAutoSave(mockEinsatzId));
    const testState = {
      type: 'FeatureCollection' as const,
      features: [],
    };

    // Act
    result.current.triggerAutoSave(testState);

    // Assert: Mutation should be called with state
    // Note: In real usage, this is debounced by 2s via TanStack Pacer
    expect(mockMutate).toHaveBeenCalledWith(testState);
  });

  it('should expose isSaving state', () => {
    // Arrange
    (useSaveLagekarteState as any).mockReturnValue({
      mutate: mockMutate,
      isPending: true, // Simulate pending state
      error: null,
    });

    // Act
    const { result } = renderHook(() => useLagekarteAutoSave(mockEinsatzId));

    // Assert
    expect(result.current.isSaving).toBe(true);
  });

  it('should expose error state', () => {
    // Arrange
    const testError = new Error('Save failed');
    (useSaveLagekarteState as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: testError,
    });

    // Act
    const { result } = renderHook(() => useLagekarteAutoSave(mockEinsatzId));

    // Assert
    expect(result.current.error).toBe(testError);
  });
});
