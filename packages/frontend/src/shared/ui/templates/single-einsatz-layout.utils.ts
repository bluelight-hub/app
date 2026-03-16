import type { WorkspaceModuleDefinition, WorkspaceShortcutMeta } from '@/features/workspace';

interface BlockingWorkspaceOverlayState {
  commandPaletteOpen: boolean;
  showEndConfirmation: boolean;
  showBeitrittDialog: boolean;
  showAudioDialog: boolean;
  showModuleOverview: boolean;
  isQuickCreateOpen: boolean;
  isEditDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  isMarkErledigtDialogOpen: boolean;
  isStopRecurringDialogOpen: boolean;
  isQuickCreateNotizOpen: boolean;
}

export function hasBlockingWorkspaceOverlay({
  commandPaletteOpen,
  showEndConfirmation,
  showBeitrittDialog,
  showAudioDialog,
  showModuleOverview,
  isQuickCreateOpen,
  isEditDialogOpen,
  isDeleteDialogOpen,
  isMarkErledigtDialogOpen,
  isStopRecurringDialogOpen,
  isQuickCreateNotizOpen,
}: BlockingWorkspaceOverlayState): boolean {
  return (
    commandPaletteOpen ||
    showEndConfirmation ||
    showBeitrittDialog ||
    showAudioDialog ||
    showModuleOverview ||
    isQuickCreateOpen ||
    isEditDialogOpen ||
    isDeleteDialogOpen ||
    isMarkErledigtDialogOpen ||
    isStopRecurringDialogOpen ||
    isQuickCreateNotizOpen
  );
}

function normalizeModifiers(modifiers: string[]): string[] {
  return modifiers.map((modifier) => modifier.toLowerCase()).sort();
}

function getPressedModifiers(event: KeyboardEvent): string[] {
  return [event.altKey ? 'alt' : null, event.ctrlKey ? 'ctrl' : null, event.metaKey ? 'meta' : null, event.shiftKey ? 'shift' : null]
    .filter((modifier): modifier is string => modifier !== null)
    .sort();
}

export function matchesWorkspaceShortcut(event: KeyboardEvent, shortcut: Pick<WorkspaceShortcutMeta, 'modifiers' | 'key'>): boolean {
  const normalizedKey = shortcut.key.toLowerCase();
  const normalizedEventKey = event.key.toLowerCase();
  const normalizedEventCode = event.code.toLowerCase();
  const matchesKey =
    normalizedEventKey === normalizedKey || normalizedEventCode === `digit${normalizedKey}` || normalizedEventCode === `numpad${normalizedKey}` || normalizedEventCode === `key${normalizedKey}`;

  const expectedModifiers = normalizeModifiers(shortcut.modifiers);
  const pressedModifiers = getPressedModifiers(event);

  return expectedModifiers.length === pressedModifiers.length && expectedModifiers.every((modifier, index) => modifier === pressedModifiers[index]) && matchesKey;
}

export function shouldBlockWorkspaceHotkey(event: KeyboardEvent, modules: Array<Pick<WorkspaceModuleDefinition, 'shortcut' | 'visibility'>>): boolean {
  return modules.some((module) => module.visibility.default === 'visible' && matchesWorkspaceShortcut(event, module.shortcut));
}
