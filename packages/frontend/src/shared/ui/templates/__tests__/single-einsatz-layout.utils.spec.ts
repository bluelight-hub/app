import type { WorkspaceModuleDefinition } from '@/features/workspace';
import { PiClipboard } from 'react-icons/pi';
import { describe, expect, it } from 'vitest';
import { hasBlockingWorkspaceOverlay, matchesWorkspaceShortcut, shouldBlockWorkspaceHotkey } from '../single-einsatz-layout.utils';

describe('hasBlockingWorkspaceOverlay', () => {
  const baseState = {
    commandPaletteOpen: false,
    showEndConfirmation: false,
    showBeitrittDialog: false,
    showAudioDialog: false,
    showModuleOverview: false,
    isQuickCreateOpen: false,
    isEditDialogOpen: false,
    isDeleteDialogOpen: false,
    isMarkErledigtDialogOpen: false,
    isStopRecurringDialogOpen: false,
    isQuickCreateNotizOpen: false,
  };

  it.each([
    'commandPaletteOpen',
    'showEndConfirmation',
    'showBeitrittDialog',
    'showAudioDialog',
    'showModuleOverview',
    'isQuickCreateOpen',
    'isEditDialogOpen',
    'isDeleteDialogOpen',
    'isMarkErledigtDialogOpen',
    'isStopRecurringDialogOpen',
    'isQuickCreateNotizOpen',
  ] as const)('returns true for %s because blocking overlays must freeze global hotkeys', (flag) => {
    expect(
      hasBlockingWorkspaceOverlay({
        ...baseState,
        [flag]: true,
      }),
    ).toBe(true);
  });

  it('returns false when no blocking overlay is active', () => {
    expect(hasBlockingWorkspaceOverlay(baseState)).toBe(false);
  });
});

describe('Workspace hotkey helpers', () => {
  const modules: WorkspaceModuleDefinition[] = [
    {
      id: 'führung',
      label: 'Führung',
      description: 'Einsatzleitung',
      routeTarget: '/app/einsatz/$einsatzId/führung/etb',
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
      ],
    },
    {
      id: 'planung',
      label: 'Planung',
      description: 'Noch deaktiviert',
      routeTarget: '/app/einsatz/$einsatzId/planung',
      icon: PiClipboard,
      color: 'purple',
      priority: 30,
      visibility: { default: 'disabled', reason: 'Kommt später' },
      shortcut: { modifiers: ['alt'], key: '4' },
      subPages: [
        {
          id: 'planung-dashboard',
          label: 'Dashboard',
          href: '/app/einsatz/$einsatzId/planung',
          icon: PiClipboard,
          visibility: { default: 'visible' },
        },
      ],
    },
    {
      id: 'intern',
      label: 'Intern',
      description: 'Versteckt',
      routeTarget: '/app/einsatz/$einsatzId/intern',
      icon: PiClipboard,
      color: 'purple',
      priority: 40,
      visibility: { default: 'hidden' },
      shortcut: { modifiers: ['alt'], key: '9' },
      subPages: [
        {
          id: 'intern-dashboard',
          label: 'Intern',
          href: '/app/einsatz/$einsatzId/intern',
          icon: PiClipboard,
          visibility: { default: 'visible' },
        },
      ],
    },
  ];

  it('matcht Workspace-Shortcuts robust über key und code', () => {
    expect(matchesWorkspaceShortcut(new KeyboardEvent('keydown', { key: '2', altKey: true }), modules[0].shortcut)).toBe(true);
    expect(matchesWorkspaceShortcut(new KeyboardEvent('keydown', { key: '™', code: 'Digit2', altKey: true }), modules[0].shortcut)).toBe(true);
    expect(matchesWorkspaceShortcut(new KeyboardEvent('keydown', { key: '2', altKey: true, ctrlKey: true }), modules[0].shortcut)).toBe(false);
  });

  it('blockiert nur sichtbare, aktivierte Workspace-Module', () => {
    expect(shouldBlockWorkspaceHotkey(new KeyboardEvent('keydown', { key: '2', altKey: true }), modules)).toBe(true);
    expect(shouldBlockWorkspaceHotkey(new KeyboardEvent('keydown', { key: '4', altKey: true }), modules)).toBe(false);
    expect(shouldBlockWorkspaceHotkey(new KeyboardEvent('keydown', { key: '9', altKey: true }), modules)).toBe(false);
  });
});
