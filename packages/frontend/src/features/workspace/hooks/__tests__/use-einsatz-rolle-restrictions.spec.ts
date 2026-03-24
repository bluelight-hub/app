import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { WorkspaceModuleDefinition, WorkspaceSubPageList } from '../../types';
import { useEinsatzRolleWorkspaceRestrictions } from '../use-einsatz-rolle-restrictions';

/** Minimales Modul fuer Tests */
function createTestModule(id: string, subPageIds: string[] = [], visibility: 'visible' | 'disabled' = 'visible'): WorkspaceModuleDefinition {
  const DummyIcon = () => null;
  const subPages = subPageIds.map((pageId) => ({
    id: pageId,
    label: pageId,
    href: `/test/${pageId}`,
    icon: DummyIcon,
    visibility: { default: 'visible' as const },
  }));

  return {
    id,
    label: id,
    routeTarget: `/test/${id}`,
    icon: DummyIcon,
    color: 'blue',
    priority: 10,
    visibility: { default: visibility, reason: visibility === 'disabled' ? 'Test reason' : undefined },
    shortcut: { modifiers: ['alt'], key: '1' },
    subPages: (subPages.length > 0 ? subPages : [{ id: 'default', label: 'default', href: '/test', icon: DummyIcon, visibility: { default: 'visible' as const } }]) as WorkspaceSubPageList,
  };
}

describe('useEinsatzRolleWorkspaceRestrictions', () => {
  const testModules: WorkspaceModuleDefinition[] = [
    createTestModule('übersicht', ['dashboard', 'karte']),
    createTestModule('führung', ['etb', 'befehle', 'pinnwand', 'rollen', 'rhythmus']),
    createTestModule('kräfte', ['dashboard', 'personal', 'fahrzeuge']),
    createTestModule('kommunikation', ['funk'], 'disabled'),
  ];

  it('gibt Module unveraendert zurueck wenn permissions undefined', () => {
    const { result } = renderHook(() => useEinsatzRolleWorkspaceRestrictions(testModules, undefined));
    expect(result.current).toBe(testModules);
  });

  it('gibt Module unveraendert zurueck wenn isSecondaryRole false', () => {
    const { result } = renderHook(() => useEinsatzRolleWorkspaceRestrictions(testModules, { isSecondaryRole: false }));
    expect(result.current).toBe(testModules);
  });

  describe('sekundaere Rolle', () => {
    it('laesst uebersicht unveraendert', () => {
      const { result } = renderHook(() => useEinsatzRolleWorkspaceRestrictions(testModules, { isSecondaryRole: true }));
      const uebersicht = result.current.find((m) => m.id === 'übersicht');
      expect(uebersicht).toBe(testModules[0]);
    });

    it('laesst fuehrung sichtbar aber schraenkt SubPages ein', () => {
      const { result } = renderHook(() => useEinsatzRolleWorkspaceRestrictions(testModules, { isSecondaryRole: true }));
      const fuehrung = result.current.find((m) => m.id === 'führung');
      expect(fuehrung?.visibility.default).toBe('visible');

      // ETB und Befehle bleiben visible
      expect(fuehrung?.subPages.find((p) => p.id === 'etb')?.visibility.default).toBe('visible');
      expect(fuehrung?.subPages.find((p) => p.id === 'befehle')?.visibility.default).toBe('visible');

      // Pinnwand und Rhythmus werden disabled
      expect(fuehrung?.subPages.find((p) => p.id === 'pinnwand')?.visibility.default).toBe('disabled');
      expect(fuehrung?.subPages.find((p) => p.id === 'pinnwand')?.visibility.reason).toContain('nicht freigegeben');
      expect(fuehrung?.subPages.find((p) => p.id === 'rhythmus')?.visibility.default).toBe('disabled');
    });

    it('disabled kraefte-Modul', () => {
      const { result } = renderHook(() => useEinsatzRolleWorkspaceRestrictions(testModules, { isSecondaryRole: true }));
      const kraefte = result.current.find((m) => m.id === 'kräfte');
      expect(kraefte?.visibility.default).toBe('disabled');
      expect(kraefte?.visibility.reason).toContain('nicht freigegeben');
    });

    it('ueberschreibt nicht bereits disabled Module', () => {
      const { result } = renderHook(() => useEinsatzRolleWorkspaceRestrictions(testModules, { isSecondaryRole: true }));
      const kommunikation = result.current.find((m) => m.id === 'kommunikation');
      expect(kommunikation?.visibility.default).toBe('disabled');
      expect(kommunikation?.visibility.reason).toBe('Test reason');
    });
  });
});
