import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQuickCreateNotizHotkeys } from '@/features/notizen';

// Mock react-hotkeys-hook
const mockUseHotkeys = vi.fn();
vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: (...args: unknown[]) => mockUseHotkeys(...args),
}));

// Mock store action
const mockOpenQuickCreateNotizDialog = vi.fn();
vi.mock('../../stores/notiz-dialog.store', () => ({
  openQuickCreateNotizDialog: (...args: unknown[]) => mockOpenQuickCreateNotizDialog(...args),
}));

describe('useQuickCreateNotizHotkeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register mod+shift+n hotkey', () => {
    // When
    renderHook(() => useQuickCreateNotizHotkeys({ einsatzId: 'einsatz-123' }));

    // Then
    expect(mockUseHotkeys).toHaveBeenCalledWith(
      'mod+shift+n',
      expect.any(Function),
      expect.objectContaining({
        enabled: true,
        enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
        preventDefault: true,
      }),
    );
  });

  it('should call openQuickCreateNotizDialog when hotkey is triggered', () => {
    // Given
    renderHook(() => useQuickCreateNotizHotkeys({ einsatzId: 'einsatz-456' }));
    const hotkeyCallback = mockUseHotkeys.mock.calls[0][1];
    const mockEvent = { preventDefault: vi.fn() };

    // When
    hotkeyCallback(mockEvent);

    // Then
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockOpenQuickCreateNotizDialog).toHaveBeenCalledWith('einsatz-456');
  });

  it('should respect enabled option', () => {
    // When
    renderHook(() => useQuickCreateNotizHotkeys({ einsatzId: 'einsatz-123', enabled: false }));

    // Then
    expect(mockUseHotkeys).toHaveBeenCalledWith(
      'mod+shift+n',
      expect.any(Function),
      expect.objectContaining({
        enabled: false,
      }),
    );
  });
});
