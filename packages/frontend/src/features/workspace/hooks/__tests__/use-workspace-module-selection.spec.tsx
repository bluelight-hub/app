import { renderHook } from '@testing-library/react';
import { PiClipboard, PiHouse } from 'react-icons/pi';
import { describe, expect, it } from 'vitest';
import { getWorkspacePrimaryPage, useWorkspaceModuleSelection } from '../use-workspace-module-selection';
import type { WorkspaceModuleDefinition } from '../../types';

const modules: WorkspaceModuleDefinition[] = [
  {
    id: 'übersicht',
    label: 'Übersicht',
    routeTarget: '/app/einsatz/$einsatzId/übersicht',
    icon: PiHouse,
    color: 'blue',
    priority: 10,
    visibility: { default: 'visible' },
    shortcut: { modifiers: ['alt'], key: '1' },
    subPages: [
      {
        id: 'overview',
        label: 'Dashboard',
        href: '/app/einsatz/$einsatzId/übersicht',
        icon: PiHouse,
        visibility: { default: 'visible' },
      },
    ],
  },
  {
    id: 'führung',
    label: 'Führung',
    routeTarget: '/app/einsatz/$einsatzId/führung/berichte',
    icon: PiClipboard,
    color: 'purple',
    priority: 20,
    visibility: { default: 'visible' },
    shortcut: { modifiers: ['alt'], key: '2' },
    subPages: [
      {
        id: 'etb',
        label: 'ETB',
        href: '/app/einsatz/$einsatzId/führung/etb',
        icon: PiClipboard,
        visibility: { default: 'visible' },
      },
      {
        id: 'berichte',
        label: 'Berichte',
        href: '/app/einsatz/$einsatzId/führung/berichte',
        icon: PiClipboard,
        visibility: { default: 'visible' },
      },
    ],
  },
];

describe('useWorkspaceModuleSelection', () => {
  it('falls back to the module routeTarget instead of blindly using the first sub page', () => {
    const { result } = renderHook(() =>
      useWorkspaceModuleSelection({
        modules,
        activeModuleId: 'führung',
      }),
    );

    expect(result.current.currentModule.id).toBe('führung');
    expect(result.current.currentPage.id).toBe('berichte');
  });

  it('keeps the explicitly active page when a matching href is provided', () => {
    const { result } = renderHook(() =>
      useWorkspaceModuleSelection({
        modules,
        activeModuleId: 'führung',
        activePageHref: '/app/einsatz/$einsatzId/führung/etb',
      }),
    );

    expect(result.current.currentPage.id).toBe('etb');
  });

  it('falls back to the first module when the requested module is unknown', () => {
    const { result } = renderHook(() =>
      useWorkspaceModuleSelection({
        modules,
        activeModuleId: 'unbekannt',
      }),
    );

    expect(result.current.currentModule.id).toBe('übersicht');
    expect(result.current.currentPage.id).toBe('overview');
  });

  it('throws when the workspace contract does not contain any modules', () => {
    expect(() =>
      renderHook(() =>
        useWorkspaceModuleSelection({
          modules: [],
        }),
      ),
    ).toThrowError('WorkspaceShell benötigt mindestens ein Modul im Contract.');
  });
});

describe('getWorkspacePrimaryPage', () => {
  it('prefers the page that matches routeTarget', () => {
    expect(getWorkspacePrimaryPage(modules[1]!).id).toBe('berichte');
  });
});
