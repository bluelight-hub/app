import type { SubCommand } from '@organisms/command-palette';
import { commandItemClasses } from '@organisms/command-palette/utils';
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
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800">
        <SubIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-gray-100">{subCommand.name}</span>
          {subCommand.shortcut && (
            <div className="hidden items-center gap-1 sm:flex">
              {subCommand.shortcut.map((key, idx) => (
                <kbd key={`${subCommand.id}-${key}-${idx}`} className={commandItemClasses.kbd}>
                  {key}
                </kbd>
              ))}
            </div>
          )}
        </div>
        {subCommand.description && <div className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">{subCommand.description}</div>}
      </div>
      {isSelected && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <div className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
        </div>
      )}
    </Command.Item>
  );
}
