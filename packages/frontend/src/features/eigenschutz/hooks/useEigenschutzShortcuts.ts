import { useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import type { EigenschutzShortcutContext } from '../constants/shortcuts.constants';

export interface UseEigenschutzShortcutsOptions {
  readonly context: EigenschutzShortcutContext;
  readonly enabled?: boolean;
  readonly isOverlayBlocking?: boolean;
  readonly isHelpOpen?: boolean;
  readonly onOpenHelp?: () => void;
  readonly onCloseHelp?: () => void;
  readonly onFocusPrimaryFilter?: () => void;
  readonly onOpenGefaehrdungCreate?: () => void;
  readonly onOpenVorfallCreate?: () => void;
}

function isEditableHotkeyTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  const role = target.getAttribute('role');
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable ||
    target.getAttribute('contenteditable') === 'true' ||
    role === 'textbox' ||
    role === 'searchbox' ||
    target.closest('[data-no-hotkeys]') !== null
  );
}

export function shouldIgnoreEigenschutzHotkey(event: KeyboardEvent, isOverlayBlocking = false): boolean {
  return event.defaultPrevented || isOverlayBlocking || isEditableHotkeyTarget(event.target) || isEditableHotkeyTarget(document.activeElement);
}

function shouldBlockEigenschutzAction(event: KeyboardEvent, isOverlayBlocking = false): boolean {
  return isOverlayBlocking || isEditableHotkeyTarget(event.target) || isEditableHotkeyTarget(document.activeElement);
}

export function useEigenschutzShortcuts({
  context,
  enabled = true,
  isOverlayBlocking = false,
  isHelpOpen = false,
  onOpenHelp,
  onCloseHelp,
  onFocusPrimaryFilter,
  onOpenGefaehrdungCreate,
  onOpenVorfallCreate,
}: UseEigenschutzShortcutsOptions): void {
  const ignoreActionHotkey = useCallback((event: KeyboardEvent) => shouldIgnoreEigenschutzHotkey(event, isOverlayBlocking), [isOverlayBlocking]);
  const actionOptions = useCallback(
    (active: boolean) => ({
      enabled: enabled && active,
      preventDefault: true,
      enableOnFormTags: false,
      enableOnContentEditable: false,
      ignoreEventWhen: ignoreActionHotkey,
    }),
    [enabled, ignoreActionHotkey],
  );
  const slashOptions = {
    ...actionOptions(context === 'vorfaelle' && Boolean(onFocusPrimaryFilter)),
    useKey: true,
  };
  const helpOptions = {
    ...actionOptions(!isOverlayBlocking && Boolean(onOpenHelp)),
    useKey: true,
  };
  const nOptions = actionOptions((context === 'gefaehrdungen' || context === 'dashboard') && Boolean(onOpenGefaehrdungCreate));
  const vOptions = actionOptions((context === 'vorfaelle' || context === 'dashboard') && Boolean(onOpenVorfallCreate));

  const escapeOptions = {
    enabled: enabled && isHelpOpen && Boolean(onCloseHelp),
    enableOnFormTags: true,
    enableOnContentEditable: true,
    preventDefault: true,
  };

  useHotkeys(
    '/',
    (event) => {
      if (shouldBlockEigenschutzAction(event, isOverlayBlocking)) {
        return;
      }
      if (context === 'vorfaelle') {
        onFocusPrimaryFilter?.();
      }
    },
    slashOptions,
    [context, onFocusPrimaryFilter, enabled, ignoreActionHotkey],
  );

  useHotkeys(
    'n',
    (event) => {
      if (shouldBlockEigenschutzAction(event, isOverlayBlocking)) {
        return;
      }
      onOpenGefaehrdungCreate?.();
    },
    nOptions,
    [context, onOpenGefaehrdungCreate, enabled, ignoreActionHotkey],
  );

  useHotkeys(
    'v',
    (event) => {
      if (shouldBlockEigenschutzAction(event, isOverlayBlocking)) {
        return;
      }
      onOpenVorfallCreate?.();
    },
    vOptions,
    [context, onOpenVorfallCreate, enabled, ignoreActionHotkey],
  );

  useHotkeys(
    ['?', 'shift+/'],
    (event) => {
      if (shouldBlockEigenschutzAction(event, isOverlayBlocking)) {
        return;
      }
      onOpenHelp?.();
    },
    helpOptions,
    [onOpenHelp, enabled, isOverlayBlocking, ignoreActionHotkey],
  );

  useHotkeys(
    'escape',
    (event) => {
      if (!isHelpOpen) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onCloseHelp?.();
    },
    escapeOptions,
    [enabled, isHelpOpen, onCloseHelp],
  );
}
