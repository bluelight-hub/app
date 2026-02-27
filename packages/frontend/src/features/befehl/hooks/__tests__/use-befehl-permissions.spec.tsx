/**
 * Unit Tests für useBefehlPermissions Hook
 *
 * Verifiziert dass der Hook alle Permissions als true zurückgibt (Passthrough).
 * Rollen-Checks werden später mit dem Einsatzrollen-System re-aktiviert.
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useBefehlPermissions } from '../use-befehl-permissions';

describe('useBefehlPermissions Hook', () => {
  it('gibt alle Permissions als true zurück (Passthrough)', () => {
    const { result } = renderHook(() => useBefehlPermissions('einsatz-1'));

    expect(result.current.canCreate).toBe(true);
    expect(result.current.canQuittieren).toBe(true);
    expect(result.current.canKorrigieren).toBe(true);
    expect(result.current.canManageStatus).toBe(true);
    expect(result.current.canExport).toBe(true);
    expect(result.current.canViewAll).toBe(true);
    expect(result.current.isBeobachter).toBe(false);
    expect(result.current.rolle).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
