/**
 * Unit-Spec für den Permission-Wrapper `useEigenschutzPermissions`
 * (Story 2.1 Task 8, AC5).
 *
 * Der Wrapper delegiert an `useCanAccess('eigenschutz')`; die Spec
 * prüft lediglich das Mapping auf die fachlichen Felder.
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { canAccessState } = vi.hoisted(() => ({
  canAccessState: { accessible: false, reason: null as string | null, isLoading: false },
}));

vi.mock('@/features/auth', () => ({
  useCanAccess: () => canAccessState,
}));

import { useEigenschutzPermissions } from '../useEigenschutzPermissions';

describe('useEigenschutzPermissions', () => {
  it('mapped accessible → canCreateGefaehrdungsbeurteilung', () => {
    canAccessState.accessible = true;
    canAccessState.isLoading = false;

    const { result } = renderHook(() => useEigenschutzPermissions());
    expect(result.current.canCreateGefaehrdungsbeurteilung).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.requiredPermission).toBe('eigenschutz:gefaehrdungsbeurteilung:write');
  });

  it('propagiert Loading-State', () => {
    canAccessState.accessible = false;
    canAccessState.isLoading = true;

    const { result } = renderHook(() => useEigenschutzPermissions());
    expect(result.current.canCreateGefaehrdungsbeurteilung).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });
});
