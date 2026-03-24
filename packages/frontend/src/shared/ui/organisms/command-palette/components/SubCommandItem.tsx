import type { SubCommand } from '@/shared/ui/organisms/command-palette';
import { commandItemClasses } from '@/shared/ui/organisms/command-palette/utils';
import { Command } from 'cmdk';
import { useMemo } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { PiCaretRight } from 'react-icons/pi';

interface SubCommandItemProps {
  subCommand: SubCommand;
  onSelect: (subCommand: SubCommand) => void;
  currentValue?: unknown;
  isActive?: boolean;
}

export function SubCommandItem({ subCommand, onSelect, currentValue, isActive = true }: SubCommandItemProps) {
  const SubIcon = subCommand.icon || PiCaretRight;
  const isSelected = subCommand.value === currentValue;

  // Convert shortcut array to hotkey string
  const hotkeyString = useMemo(
    () =>
      subCommand.shortcut
        ?.map((key) => {
          switch (key) {
            case '⌘':
            case 'Ctrl':
              return 'mod';
            case '⇧':
            case 'Shift':
              return 'shift';
            case '⌥':
            case 'Alt':
              return 'alt';
            case '↵':
            case 'Enter':
              return 'enter';
            default:
              return key.toLowerCase();
          }
        })
        .join('+'),
    [subCommand.shortcut],
  );
  const shortcutKeys = useMemo(() => {
    const shortcutCounts = new Map<string, number>();

    return (subCommand.shortcut ?? []).map((key) => {
      const occurrence = (shortcutCounts.get(key) ?? 0) + 1;
      shortcutCounts.set(key, occurrence);

      return {
        label: key,
        reactKey: `${subCommand.id}-${key}-${occurrence}`,
      };
    });
  }, [subCommand.id, subCommand.shortcut]);

  // Register hotkey
  useHotkeys(
    hotkeyString || '',
    (e) => {
      e.preventDefault();
      onSelect(subCommand);
    },
    {
      enabled: isActive && !!hotkeyString,
      enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
      preventDefault: true,
    },
    [subCommand, onSelect, isActive],
  );

  return (
    <Command.Item value={subCommand.name} onSelect={() => onSelect(subCommand)} className={commandItemClasses.base}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-raised">
        <SubIcon className="h-4 w-4 text-text-secondary" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary">{subCommand.name}</span>
          {subCommand.shortcut && (
            <div className="hidden items-center gap-1 sm:flex">
              {shortcutKeys.map((shortcut) => (
                <kbd key={shortcut.reactKey} className={commandItemClasses.kbd}>
                  {shortcut.label}
                </kbd>
              ))}
            </div>
          )}
        </div>
        {subCommand.description && <div className="mt-0.5 text-text-secondary text-xs">{subCommand.description}</div>}
      </div>
      {isSelected && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-action-secondary">
          <div className="h-2 w-2 rounded-full bg-action-primary" />
        </div>
      )}
    </Command.Item>
  );
}
