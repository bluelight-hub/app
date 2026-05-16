import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserBasicDto } from '@/shared';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mocks.useQuery(...args),
}));

vi.mock('@/shared', () => ({
  api: {
    users: () => ({
      userControllerFindAllBasicVAlpha: vi.fn(),
    }),
  },
}));

import { useUserNames } from '../use-users';

function mockUsers(users: UserBasicDto[]): void {
  mocks.useQuery.mockReturnValue({ data: users });
}

describe('useUserNames – displayName-Priorisierung', () => {
  beforeEach(() => {
    mocks.useQuery.mockReset();
  });

  it('bevorzugt displayName aus Stammperson gegenüber username', () => {
    mockUsers([{ id: 'user-1', username: 'admin', displayName: 'Max Mustermann' }]);

    const { result } = renderHook(() => useUserNames());

    expect(result.current.getUserName('user-1')).toBe('Max Mustermann');
  });

  it('fällt auf username zurück, wenn displayName fehlt', () => {
    mockUsers([{ id: 'user-1', username: 'admin' }]);

    const { result } = renderHook(() => useUserNames());

    expect(result.current.getUserName('user-1')).toBe('admin');
  });

  it('fällt auf username zurück, wenn displayName null oder leerer String ist', () => {
    mockUsers([
      { id: 'user-1', username: 'admin', displayName: null },
      { id: 'user-2', username: 'mmustermann', displayName: '   ' },
    ]);

    const { result } = renderHook(() => useUserNames());

    expect(result.current.getUserName('user-1')).toBe('admin');
    expect(result.current.getUserName('user-2')).toBe('mmustermann');
  });

  it('löst partielle IDs (Präfix) auf den Anzeigenamen auf', () => {
    mockUsers([{ id: 'abcdef-12345', username: 'admin', displayName: 'Max Mustermann' }]);

    const { result } = renderHook(() => useUserNames());

    expect(result.current.getUserName('abcdef')).toBe('Max Mustermann');
  });

  it('liefert Fallback "User #<prefix>" bei unbekannter ID', () => {
    mockUsers([]);

    const { result } = renderHook(() => useUserNames());

    expect(result.current.getUserName('abcdef-99999')).toBe('User #abcdef-9');
  });

  it('getUserNames mappt Arrays mit gemischten displayName/username-Werten', () => {
    mockUsers([
      { id: 'u1', username: 'admin', displayName: 'Max Mustermann' },
      { id: 'u2', username: 'mmuster' },
    ]);

    const { result } = renderHook(() => useUserNames());

    expect(result.current.getUserNames(['u1', 'u2'])).toEqual(['Max Mustermann', 'mmuster']);
  });
});
