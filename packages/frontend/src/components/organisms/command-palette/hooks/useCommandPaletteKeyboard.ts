import { useHotkeys } from 'react-hotkeys-hook';

interface UseCommandPaletteKeyboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack?: () => void;
  hasSelectedCommand?: boolean;
}

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
