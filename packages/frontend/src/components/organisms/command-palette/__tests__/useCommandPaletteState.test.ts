import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandPaletteState } from '../hooks/useCommandPaletteState';
import type { NavigationCommand } from '../types';

describe('useCommandPaletteState', () => {
  const mockCommand: NavigationCommand = {
    id: 'test-command',
    name: 'Test Command',
    module: 'Test Module',
    moduleColor: 'blue',
    action: () => {},
  };

  const mockCommandWithSub: NavigationCommand = {
    id: 'test-command-sub',
    name: 'Test Command with Sub',
    module: 'Test Module',
    moduleColor: 'green',
    subCommands: [
      { id: 'sub1', name: 'Sub 1', value: 'sub1' },
      { id: 'sub2', name: 'Sub 2', value: 'sub2' },
    ],
  };

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useCommandPaletteState({ open: true }));

    expect(result.current.state.search).toBe('');
    expect(result.current.state.selectedIndex).toBe(0);
    expect(result.current.state.selectedCommand).toBeNull();
    expect(result.current.state.commandStack).toEqual([]);
  });

  it('should update search value', () => {
    const { result } = renderHook(() => useCommandPaletteState({ open: true }));

    act(() => {
      result.current.actions.setSearch('test search');
    });

    // Check immediate search updates immediately
    expect(result.current.state.immediateSearch).toBe('test search');
    // Debounced search will update after delay
    expect(result.current.state.selectedIndex).toBe(0); // Reset index on search
  });

  it('should select command without subcommands', () => {
    const { result } = renderHook(() => useCommandPaletteState({ open: true }));

    act(() => {
      result.current.actions.selectCommand(mockCommand);
    });

    expect(result.current.state.selectedCommand).toEqual(mockCommand);
    expect(result.current.state.commandStack).toEqual([]);
  });

  it('should push command with subcommands to stack', () => {
    const { result } = renderHook(() => useCommandPaletteState({ open: true }));

    act(() => {
      result.current.actions.selectCommand(mockCommandWithSub);
    });

    expect(result.current.state.selectedCommand).toEqual(mockCommandWithSub);
    expect(result.current.state.commandStack).toEqual([mockCommandWithSub]);
    expect(result.current.state.search).toBe('');
  });

  it('should handle going back in command stack', () => {
    const { result } = renderHook(() => useCommandPaletteState({ open: true }));

    // Push multiple commands
    act(() => {
      result.current.actions.selectCommand(mockCommandWithSub);
    });

    const anotherCommand: NavigationCommand = {
      ...mockCommandWithSub,
      id: 'another',
      name: 'Another',
    };

    act(() => {
      result.current.actions.selectCommand(anotherCommand);
    });

    expect(result.current.state.commandStack).toHaveLength(2);

    // Go back
    act(() => {
      result.current.actions.goBack();
    });

    expect(result.current.state.commandStack).toHaveLength(1);
    expect(result.current.state.selectedCommand).toEqual(mockCommandWithSub);
    expect(result.current.state.search).toBe('');
  });

  it('should reset state when dialog is closed', () => {
    const { result, rerender } = renderHook(({ open }) => useCommandPaletteState({ open }), { initialProps: { open: true } });

    // Add some state
    act(() => {
      result.current.actions.setSearch('test');
      result.current.actions.selectCommand(mockCommand);
    });

    expect(result.current.state.immediateSearch).toBe('test');
    expect(result.current.state.selectedCommand).toEqual(mockCommand);

    // Close dialog
    rerender({ open: false });

    expect(result.current.state.immediateSearch).toBe('');
    expect(result.current.state.search).toBe('');
    expect(result.current.state.selectedCommand).toBeNull();
    expect(result.current.state.commandStack).toEqual([]);
  });

  it('should handle empty stack when going back', () => {
    const { result } = renderHook(() => useCommandPaletteState({ open: true }));

    // Try to go back with empty stack
    act(() => {
      result.current.actions.goBack();
    });

    expect(result.current.state.commandStack).toEqual([]);
    expect(result.current.state.selectedCommand).toBeNull();
  });
});
