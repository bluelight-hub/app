import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCommandSearch } from '../hooks/useCommandSearch';
import type { ModuleConfig } from '../types';
import { PiGear, PiFileText } from 'react-icons/pi';

describe('useCommandSearch', () => {
  const mockModules: ModuleConfig[] = [
    {
      id: 'settings',
      name: 'Einstellungen',
      color: 'blue',
      icon: PiGear,
      subPages: [
        { name: 'Profile', href: '/profile' },
        { name: 'Security', href: '/security' },
      ],
    },
    {
      id: 'documents',
      name: 'Dokumente',
      color: 'green',
      icon: PiFileText,
      subPages: [
        { name: 'Reports', href: '/reports' },
        { name: 'Templates', href: '/templates' },
      ],
    },
  ];

  it('should return all commands when search is empty', () => {
    const { result } = renderHook(() => useCommandSearch({ modules: mockModules, search: '' }));

    expect(result.current.allCommands).toHaveLength(4);
    expect(result.current.filteredCommands).toHaveLength(4);
    expect(result.current.commandGroups).toHaveLength(2);
  });

  it('should filter commands by name', () => {
    const { result } = renderHook(() => useCommandSearch({ modules: mockModules, search: 'profile' }));

    expect(result.current.filteredCommands).toHaveLength(1);
    expect(result.current.filteredCommands[0].name).toBe('Profile');
  });

  it('should filter commands by module name', () => {
    const { result } = renderHook(() => useCommandSearch({ modules: mockModules, search: 'dokumente' }));

    expect(result.current.filteredCommands).toHaveLength(2);
    expect(result.current.commandGroups).toHaveLength(1);
    expect(result.current.commandGroups[0].name).toBe('Dokumente');
  });

  it('should be case-insensitive', () => {
    const { result } = renderHook(() => useCommandSearch({ modules: mockModules, search: 'REPORTS' }));

    expect(result.current.filteredCommands).toHaveLength(1);
    expect(result.current.filteredCommands[0].name).toBe('Reports');
  });

  it('should return empty arrays when no matches found', () => {
    const { result } = renderHook(() => useCommandSearch({ modules: mockModules, search: 'nonexistent' }));

    expect(result.current.filteredCommands).toHaveLength(0);
    expect(result.current.commandGroups).toHaveLength(0);
  });

  it('should correctly group filtered commands', () => {
    const { result } = renderHook(() => useCommandSearch({ modules: mockModules, search: 'template' }));

    expect(result.current.commandGroups).toHaveLength(1);
    expect(result.current.commandGroups[0].id).toBe('documents');
    expect(result.current.commandGroups[0].commands).toHaveLength(1);
  });
});
