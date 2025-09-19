import { useHotkeys } from 'react-hotkeys-hook';

interface UseCommandPaletteKeyboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack?: () => void;
  hasSelectedCommand?: boolean;
}

/**
 * Keyboard-Shortcut-Hook für die Command Palette.
 *
 * Registriert und verwaltet Tastaturkürzel für die Navigation
 * und Steuerung der Command Palette.
 *
 * @param props - Die Hook-Parameter
 * @param props.open - Ob die Command Palette geöffnet ist
 * @param props.onOpenChange - Callback zum Öffnen/Schließen
 * @param props.onBack - Callback für Navigation zurück
 * @param props.hasSelectedCommand - Ob ein Command ausgewählt ist
 * @returns Objekt mit verfügbaren Tastaturkürzeln
 *
 * @example
 * ```tsx
 * const { shortcuts } = useCommandPaletteKeyboard({
 *   open: isOpen,
 *   onOpenChange: setOpen,
 *   onBack: handleBack
 * });
 * ```
 */
export function useCommandPaletteKeyboard({ open, onOpenChange, onBack, hasSelectedCommand = false }: UseCommandPaletteKeyboardProps) {
  // Toggle command palette with Cmd+K (open and close)
  useHotkeys(
    'mod+k',
    (e) => {
      e.stopPropagation();
      onOpenChange(!open);
    },
    {
      enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
      preventDefault: true,
    },
    [open],
  );

  // Handle escape key for navigation back (only when command is selected)
  useHotkeys(
    'escape',
    (e) => {
      if (hasSelectedCommand && onBack) {
        e.preventDefault();
        e.stopPropagation();
        onBack();
      }
    },
    {
      enabled: open && hasSelectedCommand,
      enableOnFormTags: true,
      preventDefault: false, // Let default escape behavior work if no command selected
    },
    [hasSelectedCommand, onBack],
  );

  // Additional shortcuts for navigation
  useHotkeys(
    'mod+shift+k',
    () => {
      if (open && onBack) {
        onBack();
      }
    },
    {
      enabled: open,
      enableOnFormTags: true,
      preventDefault: true,
    },
    [open, onBack],
  );

  return {
    shortcuts: {
      toggle: ['⌘', 'K'],
      back: ['ESC'],
      navigate: ['↑↓'],
      select: ['↵'],
      quickBack: ['⌘', '⇧', 'K'],
    },
  };
}
